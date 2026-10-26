import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireStudentAccess } from '@/lib/access'
import StudentHeader from '@/components/StudentHeader'
import Footer from '@/components/ui/Footer'
import { getLayout, maxScore, topicOrder, totalQuestions } from '@/lib/variant-layout'

export default async function TopicsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { currentSeason } = await requireStudentAccess(supabase, user.id)

  const { data: profile } = await supabase.rpc('get_my_profile')
  if (profile?.role === 'teacher') redirect('/admin')

  const { data: tests } = await supabase
    .from('variants')
    .select('*')
    .eq('subject', 'math')
    .eq('kind', 'topic')
    .eq('is_published', true)
    .order('created_at', { ascending: true })

  const testIds = (tests ?? []).map(t => t.id)

  const { data: attempts } = testIds.length
    ? await supabase
        .from('attempts')
        .select('variant_id, score_total, finished_at')
        .eq('student_id', user.id)
        .eq('status', 'done')
        .in('variant_id', testIds)
        .order('finished_at', { ascending: false })
    : { data: [] as { variant_id: string; score_total: number; finished_at: string | null }[] }

  const byVariant: Record<string, { score_total: number; finished_at: string | null }[]> = {}
  for (const a of attempts ?? []) {
    if (!byVariant[a.variant_id]) byVariant[a.variant_id] = []
    byVariant[a.variant_id].push(a)
  }

  // Групуємо тести за темою
  const groups: { topic: string; tests: any[] }[] = []
  for (const t of tests ?? []) {
    const topic = t.topic?.trim() || 'Інше'
    let g = groups.find(x => x.topic === topic)
    if (!g) { g = { topic, tests: [] }; groups.push(g) }
    g.tests.push(t)
  }
  // Порядок тем — як у посібнику (§ 1–26)
  groups.sort((a, b) => topicOrder(a.topic) - topicOrder(b.topic) || a.topic.localeCompare(b.topic, 'uk'))

  const passedCount = Object.keys(byVariant).length

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex flex-col overflow-x-hidden">
      <StudentHeader currentPage="topics" userName={profile?.name} season={currentSeason} />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <div className="mb-6">
          <h1 className="page-title mb-1">Тести за темами</h1>
          <p className="text-sm text-[#7a9a7a]">
            {(tests ?? []).length} тестів · {groups.length} тем
            {passedCount > 0 && ` · пройдено ${passedCount}`}
          </p>
          <p className="text-sm text-[#556655] mt-2">
            Короткі тести з однієї теми. Результат — у відсотках, без шкали НМТ.
          </p>
        </div>

        {!groups.length ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-[#445544] font-medium">Тематичних тестів поки немає</p>
            <p className="text-sm text-[#7a9a7a] mt-1">Викладач додасть їх найближчим часом</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(g => (
              <section key={g.topic}>
                <h2 className="text-sm font-bold text-[#445544] uppercase tracking-wide mb-2">{g.topic}</h2>
                <div className="space-y-3">
                  {g.tests.map(t => {
                    const layout = getLayout(t)
                    const max = maxScore(layout)
                    const tries = byVariant[t.id] ?? []
                    const bestPct = tries.length && max
                      ? Math.round((Math.max(...tries.map(a => a.score_total)) / max) * 100)
                      : null

                    return (
                      <div key={t.id} className="bg-white rounded-2xl border border-[#e8ede8] hover:border-[#b2dfdb] hover:shadow-sm transition-all">
                        <div className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                            tries.length ? 'bg-[#e8f5e9]' : 'bg-[#fff8e1]'
                          }`}>
                            {tries.length ? '✓' : '🎯'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-[#1a2e1a] text-sm">{t.title}</span>
                              {tries.length > 1 && <span className="badge-done">×{tries.length}</span>}
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#7a9a7a] flex-wrap">
                              <span>⏱ {t.time_limit} хв</span>
                              <span>· {totalQuestions(layout)} питань</span>
                              <span>· {max} балів</span>
                            </div>
                            {t.description && (
                              <p className="text-xs text-[#556655] mt-1 line-clamp-2">{t.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                            {bestPct !== null && (
                              <div className="text-right">
                                <div className={`text-xl font-bold leading-tight ${
                                  bestPct >= 80 ? 'text-[#2e7d32]' : bestPct >= 50 ? 'text-[#f57f17]' : 'text-red-500'
                                }`}>{bestPct}%</div>
                                <div className="text-xs text-[#7a9a7a]">найкращий</div>
                              </div>
                            )}
                            {profile?.is_verified ? (
                              <Link href={`/test/${t.id}`} className="btn-primary text-xs py-2 px-3 sm:px-4">
                                {tries.length ? '▶ Ще раз' : '▶ Пройти'}
                              </Link>
                            ) : (
                              <span className="text-xs text-orange-500 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl font-medium">
                                ⏳ Не підтверджено
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
