import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StatsCharts from '@/components/stats/StatsCharts'
import StudentHeader from '@/components/StudentHeader'
import Footer from '@/components/ui/Footer'

export default async function StatsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'teacher') redirect('/admin')

  const { data: myAttempts } = await supabase
    .from('attempts')
    .select('*, variants(title)')
    .eq('student_id', user.id)
    .eq('status', 'done')
    .order('finished_at', { ascending: true })

  const { data: classAttempts } = await supabase
    .from('attempts')
    .select('variant_id, nmt_score')
    .eq('status', 'done')
    .not('nmt_score', 'is', null)

  // Середній бал класу по варіантах
  const classAvg: Record<string, number> = {}
  const grouped: Record<string, number[]> = {}
  for (const a of classAttempts ?? []) {
    if (!grouped[a.variant_id]) grouped[a.variant_id] = []
    if (a.nmt_score) grouped[a.variant_id].push(a.nmt_score)
  }
  for (const [vid, scores] of Object.entries(grouped)) {
    classAvg[vid] = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
  }

  const attempts = myAttempts ?? []
  const attemptIds = attempts.map(a => a.id)

  const nmtScores = attempts.filter(a => a.nmt_score).map(a => a.nmt_score!)
  const best = nmtScores.length ? Math.max(...nmtScores) : null
  const last = nmtScores.length ? nmtScores[nmtScores.length - 1] : null
  const avg = nmtScores.length
    ? Math.round(nmtScores.reduce((s, x) => s + x, 0) / nmtScores.length)
    : null

  const chartData = attempts.map(a => ({
    date: new Date(a.finished_at!).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
    nmt: a.nmt_score ?? 0,
    raw: a.score_total,
    variant: a.variants?.title ?? '',
    classAvg: classAvg[a.variant_id] ?? null,
  }))

  // --- Помилки по темах ---
  let topicStats: {
    topic: string
    mistakes: number
    total: number
    pct: number
    correct: number
  }[] = []

  if (attemptIds.length > 0) {
    const { data: allAnswers } = await supabase
      .from('answers')
      .select('question_id, score')
      .in('attempt_id', attemptIds)

    if (allAnswers && allAnswers.length > 0) {
      const questionIds = Array.from(new Set(allAnswers.map(a => a.question_id)))

      const { data: questions } = await supabase
        .from('questions')
        .select('id, topic, type')
        .in('id', questionIds)

      const questionMap: Record<string, { topic: string; type: string }> = {}
      for (const q of questions ?? []) {
        questionMap[q.id] = { topic: q.topic ?? 'Без теми', type: q.type }
      }

      // Групуємо по темах
      const topicMap: Record<string, { mistakes: number; total: number }> = {}
      for (const a of allAnswers) {
        const q = questionMap[a.question_id]
        if (!q) continue
        const topic = q.topic
        if (!topicMap[topic]) topicMap[topic] = { mistakes: 0, total: 0 }
        topicMap[topic].total++
        // Для matching максимум 3 бали, open — 2, single — 1
        const isWrong = a.score === 0
        if (isWrong) topicMap[topic].mistakes++
      }

      topicStats = Object.entries(topicMap)
        .map(([topic, { mistakes, total }]) => ({
          topic,
          mistakes,
          total,
          correct: total - mistakes,
          pct: total > 0 ? Math.round((mistakes / total) * 100) : 0,
        }))
        .filter(t => t.total >= 2) // мінімум 2 відповіді щоб показувати
        .sort((a, b) => b.pct - a.pct)
    }
  }

  const strongTopics = topicStats.filter(t => t.pct <= 30)
  const weakTopics = topicStats.filter(t => t.pct > 30)

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <StudentHeader currentPage="stats" userName={profile?.name} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="page-title mb-1">Моя статистика</h1>
          <p className="text-sm text-[#7a9a7a]">{profile?.name}</p>
        </div>

        {!attempts.length ? (
          <div className="card text-center py-16">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-[#445544] font-medium text-lg">Ще немає результатів</p>
            <p className="text-sm text-[#7a9a7a] mt-2">Пройди перший тест щоб побачити статистику</p>
            <Link href="/tests" className="btn-primary inline-flex mt-6">До тестів →</Link>
          </div>
        ) : (
          <>
            {/* Зведені показники */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Найкращий бал НМТ', value: best, color: 'text-[#2e7d32]' },
                { label: 'Останній результат', value: last, color: 'text-[#0ead69]' },
                { label: 'Всього спроб', value: attempts.length, color: 'text-[#1565c0]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="card text-center">
                  <div className={`text-3xl font-black ${color}`}>{value ?? '—'}</div>
                  <div className="text-sm text-[#7a9a7a] mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Графіки */}
            <StatsCharts chartData={chartData} />

            {/* Прогрес по темах */}
            {topicStats.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-bold text-[#1a2e1a] text-lg">📚 Мій прогрес по темах</h2>

                {/* Проблемні теми */}
                {weakTopics.length > 0 && (
                  <div className="card border-l-4 border-l-red-300">
                    <h3 className="font-bold text-[#1a2e1a] mb-4 flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      Потребують уваги
                      <span className="text-xs font-normal text-[#7a9a7a] ml-1">— більше 30% помилок</span>
                    </h3>
                    <div className="space-y-3">
                      {weakTopics.map(t => (
                        <div key={t.topic}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-[#1a2e1a] truncate max-w-[260px]">{t.topic}</span>
                            <span className="text-xs text-[#7a9a7a] ml-2 flex-shrink-0">
                              {t.mistakes} з {t.total} невірно
                            </span>
                          </div>
                          <div className="h-2.5 bg-[#f5f7f5] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${t.pct}%`,
                                background: t.pct > 66 ? '#ef5350' : '#f57f17',
                              }}
                            />
                          </div>
                          <p className="text-xs text-[#aec5ae] mt-0.5">{t.pct}% помилок</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Сильні теми */}
                {strongTopics.length > 0 && (
                  <div className="card border-l-4 border-l-[#0ead69]">
                    <h3 className="font-bold text-[#1a2e1a] mb-4 flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      Добре засвоєно
                      <span className="text-xs font-normal text-[#7a9a7a] ml-1">— менше 30% помилок</span>
                    </h3>
                    <div className="space-y-3">
                      {strongTopics.map(t => (
                        <div key={t.topic}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-[#1a2e1a] truncate max-w-[260px]">{t.topic}</span>
                            <span className="text-xs text-[#7a9a7a] ml-2 flex-shrink-0">
                              {t.correct} з {t.total} вірно
                            </span>
                          </div>
                          <div className="h-2.5 bg-[#f5f7f5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#0ead69] rounded-full transition-all"
                              style={{ width: `${100 - t.pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-[#aec5ae] mt-0.5">{100 - t.pct}% правильних</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Таблиця */}
            <div className="card">
              <h3 className="font-bold text-[#1a2e1a] mb-4">Всі результати</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e8ede8]">
                      {['Варіант', 'Дата', 'Тестовий', 'НМТ бал', 'Серед. класу'].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-[#7a9a7a] font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...attempts].reverse().map(a => {
                      const ca = classAvg[a.variant_id]
                      const diff = a.nmt_score && ca ? a.nmt_score - ca : null
                      return (
                        <tr key={a.id} className="border-b border-[#f5f7f5] hover:bg-[#f8faf8]">
                          <td className="py-3 px-2 font-medium text-[#1a2e1a]">{a.variants?.title}</td>
                          <td className="py-3 px-2 text-[#7a9a7a]">
                            {new Date(a.finished_at!).toLocaleDateString('uk-UA')}
                          </td>
                          <td className="py-3 px-2 font-mono text-center">{a.score_total}/32</td>
                          <td className="py-3 px-2 text-center font-bold text-[#0ead69]">
                            {a.nmt_score ?? '—'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {ca ? (
                              <span className={diff !== null && diff >= 0 ? 'text-[#2e7d32] font-semibold' : 'text-red-500 font-semibold'}>
                                {ca}
                                {diff !== null && (
                                  <span className="text-xs ml-1 opacity-70">
                                    ({diff >= 0 ? '+' : ''}{diff})
                                  </span>
                                )}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}