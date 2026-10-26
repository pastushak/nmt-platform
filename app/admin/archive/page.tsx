import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminHeader from '@/components/admin/AdminHeader'
import { CURRENT_SEASON, seasonLabel } from '@/lib/season'
import { fetchAll, fetchAllIn } from '@/lib/fetch-all'

export default async function ArchivePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.rpc('get_my_profile')
  if (profile?.role !== 'teacher') redirect('/home')

  // Учні минулих сезонів
  // Архів росте щороку — догружаємо сторінками (Supabase обрізає на 1000 рядках)
  const students = await fetchAll<{ id: string; name: string; season: string }>((from, to) =>
    supabase.from('users')
      .select('id, name, season')
      .eq('role', 'student')
      .not('season', 'is', null)
      .neq('season', CURRENT_SEASON)
      .order('id').range(from, to))

  const attemptRows = await fetchAllIn<any>(students.map(s => s.id), (part, from, to) =>
    supabase.from('attempts')
      .select('student_id, nmt_score, variants(kind)')
      .eq('status', 'done')
      .in('student_id', part)
      .order('id').range(from, to))

  const fullAttempts = (attemptRows ?? []).filter(a => (a.variants as any)?.kind !== 'topic')

  // Найкращий бал кожного учня
  const bestByStudent: Record<string, number> = {}
  const countByStudent: Record<string, number> = {}
  for (const a of fullAttempts) {
    countByStudent[a.student_id] = (countByStudent[a.student_id] ?? 0) + 1
    if (a.nmt_score) bestByStudent[a.student_id] = Math.max(bestByStudent[a.student_id] ?? 0, a.nmt_score)
  }

  // Зведення по сезонах
  const seasons: Record<string, {
    students: number
    attempts: number
    bests: number[]
    top: { name: string; best: number }[]
  }> = {}

  for (const s of students) {
    const key = s.season as string
    if (!seasons[key]) seasons[key] = { students: 0, attempts: 0, bests: [], top: [] }
    seasons[key].students++
    seasons[key].attempts += countByStudent[s.id] ?? 0
    const best = bestByStudent[s.id]
    if (best) {
      seasons[key].bests.push(best)
      seasons[key].top.push({ name: s.name, best })
    }
  }

  const seasonList = Object.entries(seasons).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="min-h-screen bg-[#f5f7f5] overflow-x-hidden">
      <AdminHeader currentPage="archive" userName={profile?.name} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="page-title mb-1">Архів сезонів</h1>
          <p className="text-sm text-[#7a9a7a]">
            Результати минулих років. Поточний сезон — {seasonLabel(CURRENT_SEASON)}.
            Учні з архіву не можуть увійти на платформу.
          </p>
        </div>

        {!seasonList.length ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">🗄</p>
            <p className="text-[#445544] font-medium">Архів порожній</p>
            <p className="text-sm text-[#7a9a7a] mt-1">Тут з'являться учні минулих сезонів</p>
          </div>
        ) : (
          seasonList.map(([season, d]) => {
            const avgBest = d.bests.length
              ? Math.round(d.bests.reduce((s, x) => s + x, 0) / d.bests.length)
              : null
            const top = [...d.top].sort((a, b) => b.best - a.best).slice(0, 5)
            const over180 = d.bests.filter(b => b >= 180).length

            return (
              <div key={season} className="card space-y-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#1a2e1a]">{seasonLabel(season)}</h2>
                  <Link href={`/admin/students?season=${season}`} className="btn-primary text-sm">
                    Усі учні та результати →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Учнів', value: d.students, color: 'text-[#1565c0]' },
                    { label: 'Спроб (повні варіанти)', value: d.attempts, color: 'text-[#7b1fa2]' },
                    { label: 'Сер. найкращий бал', value: avgBest ?? '—', color: 'text-[#0ead69]' },
                    { label: 'Учнів зі 180+', value: over180, color: 'text-[#2e7d32]' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[#f8faf8] rounded-xl p-3 text-center">
                      <div className={`text-3xl font-black ${color}`}>{value}</div>
                      <div className="text-xs text-[#7a9a7a] mt-1">{label}</div>
                    </div>
                  ))}
                </div>

                {top.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#445544] mb-2">Найкращі результати</h3>
                    <div className="space-y-1.5">
                      {top.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-[#f5f7f5]">
                          <span className="text-[#1a2e1a]">{i + 1}. {t.name}</span>
                          <span className="font-bold text-[#2e7d32]">{t.best}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
