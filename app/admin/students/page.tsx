import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StudentActions from '@/components/admin/StudentActions'
import AddStudentButton from '@/components/admin/AddStudentButton'
import AdminHeader from '@/components/admin/AdminHeader'
import { CURRENT_SEASON, CURRENT_SEASON_FILTER, seasonLabel } from '@/lib/season'
import { fetchAll, fetchAllIn } from '@/lib/fetch-all'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { season?: string }
}) {
  const season = searchParams.season && searchParams.season !== CURRENT_SEASON
    ? searchParams.season
    : null // null = поточний сезон
  const isArchive = season !== null

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .rpc('get_my_profile')
  if (profile?.role !== 'teacher') redirect('/home')

  const students = await fetchAll<any>((from, to) => {
    const q = supabase.from('users').select('*').eq('role', 'student')
    return (isArchive ? q.eq('season', season) : q.or(CURRENT_SEASON_FILTER))
      .order('name').order('id').range(from, to)
  })

  // Усі сезони, що є в базі — для перемикача
  const seasonRows = await fetchAll<{ season: string }>((from, to) => supabase
    .from('users').select('season').eq('role', 'student').not('season', 'is', null)
    .order('id').range(from, to))
  const seasons = Array.from(new Set([CURRENT_SEASON, ...(seasonRows ?? []).map(r => r.season as string)]))
    .sort((a, b) => b.localeCompare(a))

  // Тільки повні варіанти НМТ — тематичні тести не мають балу 100–200
  const attemptRows = await fetchAllIn<any>((students ?? []).map(s => s.id), (part, from, to) =>
    supabase.from('attempts')
      .select('student_id, nmt_score, finished_at, variants(kind)')
      .eq('status', 'done')
      .in('student_id', part)
      .order('id').range(from, to))
  const attempts = (attemptRows ?? []).filter(a => (a.variants as any)?.kind !== 'topic')

  const statsMap: Record<string, { count: number; best: number | null; last: number | null }> = {}
  for (const a of attempts ?? []) {
    if (!statsMap[a.student_id]) statsMap[a.student_id] = { count: 0, best: null, last: null }
    const s = statsMap[a.student_id]
    s.count++
    if (a.nmt_score) s.best = s.best === null ? a.nmt_score : Math.max(s.best, a.nmt_score)
  }
  for (const sid of Object.keys(statsMap)) {
    const last = (attempts ?? [])
      .filter(a => a.student_id === sid && a.nmt_score)
      .sort((a, b) => new Date(b.finished_at!).getTime() - new Date(a.finished_at!).getTime())[0]
    if (last) statsMap[sid].last = last.nmt_score
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <AdminHeader currentPage="students" userName={profile?.name} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Перемикач сезонів */}
        {seasons.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {seasons.map(s => {
              const active = (season ?? CURRENT_SEASON) === s
              return (
                <Link
                  key={s}
                  href={s === CURRENT_SEASON ? '/admin/students' : `/admin/students?season=${s}`}
                  className={`text-sm px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
                    active
                      ? 'bg-[#0ead69] border-[#0ead69] text-white'
                      : 'bg-white border-[#e8ede8] text-[#445544] hover:border-[#0ead69]'
                  }`}
                >
                  {seasonLabel(s)}{s === CURRENT_SEASON ? ' · поточний' : ' · архів'}
                </Link>
              )
            })}
          </div>
        )}

        {isArchive && (
          <div className="bg-[#e3f2fd] border border-[#bbdefb] text-[#1565c0] px-4 py-3 rounded-xl text-sm mb-4">
            🗄 Архів {seasonLabel(season)}: результати збережено для перегляду, вхід цим учням закрито.
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="page-title mb-1">{isArchive ? `Учні ${seasonLabel(season)}` : 'Учні'}</h1>
            <p className="text-sm text-[#7a9a7a]">
              {students?.length ?? 0} учнів ·{' '}
              {students?.filter(s => s.is_verified).length ?? 0} підтверджених
            </p>
          </div>
        </div>

        {!students?.length ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">👤</p>
            <p className="text-[#445544] font-medium">{isArchive ? 'У цьому сезоні немає учнів' : 'Ще немає учнів у поточному сезоні'}</p>
            <p className="text-sm text-[#7a9a7a] mt-2">Додайте першого учня вручну</p>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead className="bg-[#f8faf8] border-b border-[#e8ede8]">
                <tr>
                  {["Ім'я", 'Email', 'Статус', 'Спроб', 'Найкращий', 'Останній', 'Дії'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#7a9a7a] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f7f5]">
                {students.map(student => {
                  const s = statsMap[student.id]
                  return (
                    <tr key={student.id} className={`hover:bg-[#f8faf8] transition-colors ${!student.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1a2e1a] text-sm">{student.name}</span>
                          {student.is_verified && (
                            <span className="text-[#0ead69] text-sm" title="Підтверджено">✔</span>
                          )}
                          {!student.is_active && (
                            <span className="badge-locked text-xs">заблоковано</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#7a9a7a]">{student.email}</td>
                      <td className="px-4 py-3">
                        {student.is_verified
                          ? <span className="badge-done">підтверджено</span>
                          : <span className="badge-warning">очікує</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[#556655]">{s?.count ?? 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#2e7d32] text-sm">{s?.best ?? '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#0ead69] text-sm">{s?.last ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/students/${student.id}`}
                            className="text-xs text-[#0ead69] font-semibold hover:text-[#0c9a5a]">
                            Детальніше →
                          </Link>
                          <StudentActions student={student} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

