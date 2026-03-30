import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StatsCharts from '@/components/stats/StatsCharts'
import LogoutButton from '@/components/ui/LogoutButton'

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

  return (
    <div className="min-h-screen bg-[#f5f7f5]">

      {/* Навігація */}
      <header className="bg-white border-b border-[#e8ede8]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/home" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0ead69] rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L2 4.5v5c0 3.8 2.5 6.5 6 7.5 3.5-1 6-3.7 6-7.5v-5L8 1z" fill="white"/>
                </svg>
              </div>
              <span className="font-bold text-[#1a2e1a] text-sm">НМТ Математика</span>
            </Link>
            <span className="text-[#c8e6c9]">|</span>
            <nav className="flex gap-1">
              <Link href="/tests" className="nav-link">Тести</Link>
              <Link href="/stats" className="nav-link-active">Статистика</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#445544] font-medium hidden sm:block">{profile?.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

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
    </div>
  )
}
