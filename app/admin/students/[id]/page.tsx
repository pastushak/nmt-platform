import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StudentDetailCharts from '@/components/admin/StudentDetailCharts'
import DeleteAttemptButton from '@/components/admin/DeleteAttemptButton'
import AdminHeader from '@/components/admin/AdminHeader'
import { getCurrentSeason, isCurrentSeason, seasonLabel } from '@/lib/season'
import MoveToCurrentSeason from '@/components/admin/MoveToCurrentSeason'
import { getLayout, maxScore } from '@/lib/variant-layout'
import { fetchAllIn } from '@/lib/fetch-all'

export const revalidate = 0

function formatDuration(started: string, finished: string): string {
  const mins = Math.round((new Date(finished).getTime() - new Date(started).getTime()) / 60000)
  if (mins < 60) return `${mins} хв`
  return `${Math.floor(mins / 60)} год ${mins % 60} хв`
}

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.rpc('get_my_profile')
  if (profile?.role !== 'teacher') redirect('/home')

  const { data: student } = await supabase
    .from('users').select('*').eq('id', params.id).single()
  if (!student) notFound()
  const currentSeason = await getCurrentSeason(supabase)

  const { data: allAttempts } = await supabase
    .from('attempts')
    .select('*, variants(title, kind, layout)')
    .eq('student_id', params.id)
    .eq('status', 'done')
    .order('finished_at', { ascending: true })

  // Повні варіанти НМТ — для графіка й історії; тематичні — окремим списком
  const attempts = (allAttempts ?? []).filter(a => (a.variants as any)?.kind !== 'topic')
  const topicAttempts = (allAttempts ?? []).filter(a => (a.variants as any)?.kind === 'topic').reverse()

  // Статистика класу для порівняння
  // Середнє рахує БД (раніше тягнули всі спроби класу — обрізалось на 1000 рядках)
  const { data: classRows } = await supabase.rpc('class_variant_averages')
  const classAvg: Record<string, number> = {}
  for (const r of (classRows ?? []) as { variant_id: string; avg_score: number }[]) {
    classAvg[r.variant_id] = r.avg_score
  }

  // Топ помилок
  const attemptIds = (allAttempts ?? []).map(a => a.id)
  const topMistakes: { qid: string; count: number; question: any }[] = []

  if (attemptIds.length > 0) {
    const wrongAnswers = await fetchAllIn<{ question_id: string }>(attemptIds, (part, from, to) =>
      supabase.from('answers').select('question_id')
        .eq('score', 0).in('attempt_id', part).order('id').range(from, to))

    const mistakeCount: Record<string, number> = {}
    for (const a of wrongAnswers ?? []) {
      mistakeCount[a.question_id] = (mistakeCount[a.question_id] ?? 0) + 1
    }

    const topIds = Object.entries(mistakeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([qid]) => qid)

    if (topIds.length > 0) {
      const { data: topQuestions } = await supabase
        .from('questions')
        .select('id, text, topic, number')
        .in('id', topIds)

      for (const qid of topIds) {
        const question = topQuestions?.find(q => q.id === qid)
        if (question) {
          topMistakes.push({ qid, count: mistakeCount[qid], question })
        }
      }
    }
  }

  const nmtScores = (attempts ?? []).filter(a => a.nmt_score).map(a => a.nmt_score!)
  const best = nmtScores.length ? Math.max(...nmtScores) : null
  const last = nmtScores.length ? nmtScores[nmtScores.length - 1] : null
  const avg = nmtScores.length
    ? Math.round(nmtScores.reduce((s, x) => s + x, 0) / nmtScores.length)
    : null

  // Середній час виконання
  const durations = (attempts ?? [])
    .filter(a => a.started_at && a.finished_at)
    .map(a => Math.round((new Date(a.finished_at!).getTime() - new Date(a.started_at!).getTime()) / 60000))
  const avgDurationMin = durations.length
    ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length)
    : null
  const avgDurationStr = avgDurationMin != null
    ? avgDurationMin < 60
      ? `${avgDurationMin} хв`
      : `${Math.floor(avgDurationMin / 60)} год ${avgDurationMin % 60} хв`
    : null

  const chartData = (attempts ?? []).map(a => ({
    date: new Date(a.finished_at!).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
    nmt: a.nmt_score ?? 0,
    raw: a.score_total,
    variant: (a.variants as any)?.title ?? '',
    classAvg: classAvg[a.variant_id] ?? null,
  }))

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <AdminHeader currentPage="students" userName={profile?.name} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Загальна інформація */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#e8f5e9] flex items-center justify-center text-xl font-bold text-[#0ead69]">
                {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#1a2e1a]">{student.name}</h1>
                  {student.is_verified && <span className="text-[#0ead69]">✔</span>}
                  {!student.is_active && <span className="badge-locked">заблоковано</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isCurrentSeason(student.season, currentSeason)
                      ? 'bg-[#e8f5e9] text-[#2e7d32]'
                      : 'bg-[#e3f2fd] text-[#1565c0]'
                  }`}>
                    {seasonLabel(student.season)}{isCurrentSeason(student.season, currentSeason) ? '' : ' · архів'}
                  </span>
                </div>
                <p className="text-sm text-[#7a9a7a]">{student.email}</p>
                <p className="text-xs text-[#aec5ae] mt-0.5">
                  Зареєстрований: {new Date(student.created_at).toLocaleDateString('uk-UA')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {student.is_verified
                ? <span className="badge-done">підтверджено</span>
                : <span className="badge-warning">не підтверджено</span>
              }
            </div>
          </div>
          {!isCurrentSeason(student.season, currentSeason) && (
            <MoveToCurrentSeason studentId={student.id} studentSeason={student.season} currentSeason={currentSeason} />
          )}
        </div>

        {/* Тематичні тести */}
        {topicAttempts.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-[#1a2e1a] mb-3">🎯 Тематичні тести · {topicAttempts.length} спроб</h2>
            <div className="space-y-1.5">
              {topicAttempts.map(a => {
                const max = maxScore(getLayout(a.variants as any))
                const pct = max ? Math.round((a.score_total / max) * 100) : 0
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-[#f5f7f5]">
                    <span className="text-[#1a2e1a] truncate">{(a.variants as any)?.title}</span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-[#7a9a7a]">{new Date(a.finished_at!).toLocaleDateString('uk-UA')}</span>
                      <span className="font-mono text-[#556655]">{a.score_total}/{max}</span>
                      <span className={`font-bold w-12 text-right ${pct >= 80 ? 'text-[#2e7d32]' : pct >= 50 ? 'text-[#f57f17]' : 'text-red-500'}`}>{pct}%</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Зведені показники */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Найкращий НМТ', value: best, color: 'text-[#2e7d32]' },
            { label: 'Останній НМТ', value: last, color: 'text-[#0ead69]' },
            { label: 'Середній НМТ', value: avg, color: 'text-[#1565c0]' },
            { label: 'Всього спроб', value: attempts?.length ?? 0, color: 'text-[#7b1fa2]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <div className={`text-3xl font-black ${color}`}>{value ?? '—'}</div>
              <div className="text-sm text-[#7a9a7a] mt-1">{label}</div>
            </div>
          ))}
          <div className="card text-center">
            <div className="text-2xl font-black text-[#f57f17]">{avgDurationStr ?? '—'}</div>
            <div className="text-sm text-[#7a9a7a] mt-1">Сер. час</div>
          </div>
        </div>

        {/* Графік прогресу */}
        {chartData.length > 0 && (
          <StudentDetailCharts chartData={chartData} />
        )}

        {/* Топ помилок */}
        {topMistakes.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-[#1a2e1a] mb-4">❌ Топ помилок</h3>
            <div className="space-y-2">
              {topMistakes.map(({ qid, count, question }) => (
                <div key={qid} className="flex items-center gap-3 p-3 bg-[#fff8f8] border border-red-100 rounded-xl">
                  <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {question!.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a2e1a] truncate">
                      {question!.text.replace(/\$\$[^$]+\$\$/g, '[формула]').slice(0, 80)}...
                    </p>
                    <p className="text-xs text-[#7a9a7a]">{question!.topic}</p>
                  </div>
                  <span className="text-sm font-bold text-red-500 flex-shrink-0">
                    {count}× помилок
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Таблиця спроб */}
        <div className="card overflow-x-auto">
          <h3 className="font-bold text-[#1a2e1a] mb-4">📋 Всі спроби</h3>
          {!attempts?.length ? (
            <p className="text-sm text-[#7a9a7a]">Учень ще не проходив жодного тесту</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8ede8]">
                  {['Варіант', 'Дата', 'Час', 'Тестовий', 'НМТ', 'Вибір', 'Відпов.', 'Вписати', 'Серед. класу', ''].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs text-[#7a9a7a] font-semibold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...(attempts ?? [])].reverse().map(a => {
                  const ca = classAvg[a.variant_id]
                  const diff = a.nmt_score && ca ? a.nmt_score - ca : null
                  const duration = a.started_at && a.finished_at
                    ? formatDuration(a.started_at, a.finished_at)
                    : '—'
                  return (
                    <tr key={a.id} className="border-b border-[#f5f7f5] hover:bg-[#f8faf8]">
                      <td className="py-2.5 px-2 font-medium text-[#1a2e1a] max-w-[160px] truncate">
                        {(a.variants as any)?.title}
                      </td>
                      <td className="py-2.5 px-2 text-[#7a9a7a]">
                        {new Date(a.finished_at!).toLocaleDateString('uk-UA')}
                      </td>
                      <td className="py-2.5 px-2 text-[#f57f17] font-medium whitespace-nowrap">
                        ⏱ {duration}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-center">{a.score_total}/32</td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#0ead69]">
                        {a.nmt_score ?? '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center text-[#556655]">{a.score_single}/15</td>
                      <td className="py-2.5 px-2 text-center text-[#556655]">{a.score_matching}/9</td>
                      <td className="py-2.5 px-2 text-center text-[#556655]">{a.score_open}/8</td>
                      <td className="py-2.5 px-2 text-center">
                        {ca ? (
                          <span className={diff !== null && diff >= 0 ? 'text-[#2e7d32] font-semibold' : 'text-red-500 font-semibold'}>
                            {ca} {diff !== null && <span className="text-xs">({diff >= 0 ? '+' : ''}{diff})</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-2">
                        <DeleteAttemptButton attemptId={a.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}