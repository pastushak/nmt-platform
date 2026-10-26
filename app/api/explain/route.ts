import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MAX_EXPLAINS, MAX_EXPLAINS_PER_DAY, EXPLAIN_MODEL } from '@/lib/explain'
import { isCurrentSeason } from '@/lib/season'
import { POINTS } from '@/lib/variant-layout'

// Пояснення помилки. Усі дані (умова, правильна відповідь, відповідь учня)
// беремо з бази, а не з запиту — так API не можна використати для довільних промптів.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Потрібно увійти' }, { status: 401 })

  // Заблоковані та архівні учні не користуються поясненнями
  const { data: me } = await supabase.from('users').select('role, is_active, season').eq('id', user.id).single()
  if (!me || (me.role === 'student' && (me.is_active === false || !isCurrentSeason(me.season)))) {
    return NextResponse.json({ error: 'Доступ закрито' }, { status: 403 })
  }

  let body: { attemptId?: string; questionId?: string }
  try { body = await req.json() } catch { body = {} }
  const { attemptId, questionId } = body
  if (!attemptId || !questionId) return NextResponse.json({ error: 'Невірний запит' }, { status: 400 })

  const { data: attempt } = await supabase
    .from('attempts').select('id, student_id, variant_id, status').eq('id', attemptId).single()
  if (!attempt || attempt.student_id !== user.id || attempt.status !== 'done') {
    return NextResponse.json({ error: 'Спробу не знайдено' }, { status: 403 })
  }

  // Скільки пояснень уже є в цій спробі (для лічильника на сторінці)
  const countUsed = async () => {
    const { count } = await supabase
      .from('explanations').select('id', { count: 'exact', head: true }).eq('attempt_id', attemptId)
    return count ?? 0
  }

  // Уже пояснено — віддаємо збережене, ліміт не витрачається
  const { data: existing } = await supabase
    .from('explanations').select('explanation')
    .eq('attempt_id', attemptId).eq('question_id', questionId)
    .not('explanation', 'is', null).maybeSingle()
  if (existing) return NextResponse.json({ explanation: existing.explanation, used: await countUsed(), cached: true })

  const { data: q } = await supabase
    .from('questions')
    .select('variant_id, type, text, options, left_items, right_items, correct_single, correct_matching, correct_open')
    .eq('id', questionId).single()
  if (!q || q.variant_id !== attempt.variant_id) {
    return NextResponse.json({ error: 'Питання не знайдено' }, { status: 404 })
  }

  const { data: ans } = await supabase
    .from('answers').select('answer_single, answer_matching, answer_open, score')
    .eq('attempt_id', attemptId).eq('question_id', questionId).maybeSingle()

  // Пояснюємо лише помилки
  const maxPts = POINTS[q.type as keyof typeof POINTS] ?? 1
  if (ans && (ans.score ?? 0) >= maxPts) {
    return NextResponse.json({ error: 'Відповідь правильна — пояснення не потрібне', used: await countUsed() }, { status: 400 })
  }

  // Атомарно бронюємо місце під пояснення: база перевіряє ліміти
  // (на спробу і на добу) й не пускає одночасні запити повз них
  const { data: reservation, error: resErr } = await supabase
    .rpc('reserve_explanation', { p_attempt: attemptId, p_question: questionId })
  if (resErr) {
    console.error('reserve_explanation failed', resErr.message)
    return NextResponse.json({ error: 'Не вдалося отримати пояснення. Спробуй ще раз.' }, { status: 500 })
  }
  if (reservation !== 'ok') {
    const used = await countUsed()
    switch (reservation) {
      case 'cached': {
        const { data: ready } = await supabase.from('explanations').select('explanation')
          .eq('attempt_id', attemptId).eq('question_id', questionId).maybeSingle()
        return NextResponse.json({ explanation: ready?.explanation, used, cached: true })
      }
      case 'busy':
        return NextResponse.json({ error: 'Пояснення вже готується — зачекай кілька секунд і онови сторінку.', used }, { status: 409 })
      case 'limit_attempt':
        return NextResponse.json({ error: `Ліміт пояснень вичерпано (${MAX_EXPLAINS}/${MAX_EXPLAINS})`, used }, { status: 429 })
      case 'limit_day':
        return NextResponse.json({ error: `Денний ліміт пояснень вичерпано (${MAX_EXPLAINS_PER_DAY} за добу). Спробуй завтра.`, used }, { status: 429 })
      default:
        return NextResponse.json({ error: 'Спробу не знайдено', used }, { status: 403 })
    }
  }

  const fmtPairs = (m: Record<string, string> | null) =>
    m && Object.keys(m).length ? Object.entries(m).map(([k, v]) => `${k}–${v}`).join(', ') : 'не відповів'

  let details = ''
  let userAnswer = 'не відповів'
  let correctAnswer = ''
  if (q.type === 'single') {
    const opts = q.options ? Object.entries(q.options).map(([k, v]) => `${k}) ${v}`).join('\n') : ''
    details = opts ? `Варіанти відповіді:\n${opts}` : ''
    userAnswer = ans?.answer_single ?? 'не відповів'
    correctAnswer = q.correct_single ?? ''
  } else if (q.type === 'matching') {
    const left = (q.left_items ?? []).map((i: any) => `${i.id}. ${i.text}`).join('\n')
    const right = (q.right_items ?? []).map((i: any) => `${i.id}) ${i.text}`).join('\n')
    details = `Ліва колонка:\n${left}\nПрава колонка:\n${right}`
    userAnswer = fmtPairs(ans?.answer_matching ?? null)
    correctAnswer = fmtPairs(q.correct_matching ?? null)
  } else {
    userAnswer = ans?.answer_open || 'не відповів'
    correctAnswer = q.correct_open ?? ''
  }

  const typeLabel = q.type === 'single' ? 'вибір однієї відповіді'
    : q.type === 'matching' ? 'встановити відповідність' : 'вписати відповідь'

  const prompt = `Ти вчитель математики. Учень відповідав на питання НМТ з математики і помилився.

Питання: ${q.text}
${details}
Тип питання: ${typeLabel}
Відповідь учня: ${userAnswer}
Правильна відповідь: ${correctAnswer}

Поясни коротко (3-5 речень):
1. Чому відповідь учня неправильна
2. Як правильно розв'язати це завдання
3. Яке правило або формулу треба застосувати

Відповідай українською мовою. Будь конкретним і зрозумілим для учня 11 класу.`

  let text: string | null = null
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: EXPLAIN_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(45000),
    })
    const data = await response.json()
    if (!response.ok) console.error('Anthropic error', response.status, data?.error?.type)
    text = data?.content?.[0]?.text ?? null
  } catch (e) {
    console.error('Anthropic request failed', (e as Error).message)
  }

  if (!text) {
    // Знімаємо бронь — ліміт не витрачається
    await supabase.rpc('release_explanation', { p_attempt: attemptId, p_question: questionId })
    return NextResponse.json({ error: 'Не вдалося отримати пояснення. Спробуй ще раз.', used: await countUsed() }, { status: 502 })
  }

  const { error: finErr } = await supabase
    .rpc('finish_explanation', { p_attempt: attemptId, p_question: questionId, p_text: text })
  if (finErr) console.error('Explanation save failed', finErr.message)

  return NextResponse.json({ explanation: text, used: await countUsed(), cached: false })
}
