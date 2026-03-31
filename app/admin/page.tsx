import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import LogoutButton from '@/components/ui/LogoutButton'
import AdminHeader from '@/components/admin/AdminHeader'

export default async function AdminPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('name, role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') redirect('/home')

  const { count: variantsCount } = await supabase
    .from('variants').select('*', { count: 'exact', head: true })

  const { count: studentsCount } = await supabase
    .from('users').select('*', { count: 'exact', head: true }).eq('role', 'student')

  const { count: attemptsCount } = await supabase
    .from('attempts').select('*', { count: 'exact', head: true }).eq('status', 'done')

  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select('*, users(name), variants(title)')
    .eq('status', 'done')
    .order('finished_at', { ascending: false })
    .limit(8)

  const { data: allAttempts } = await supabase
    .from('attempts')
    .select('variant_id, nmt_score, variants(title)')
    .eq('status', 'done')
    .not('nmt_score', 'is', null)

  const variantStats: Record<string, { title: string; scores: number[] }> = {}
  for (const a of allAttempts ?? []) {
    if (!variantStats[a.variant_id]) {
      variantStats[a.variant_id] = { title: (a.variants as any)?.title ?? '', scores: [] }
    }
    if (a.nmt_score) variantStats[a.variant_id].scores.push(a.nmt_score)
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5] w-full overflow-x-hidden">

      {/* Навігація */}
      <AdminHeader currentPage="dashboard" userName={profile?.name} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="page-title mb-1">Дашборд</h1>
          <p className="text-sm text-[#7a9a7a]">Загальний огляд платформи</p>
        </div>

        {/* Зведені показники */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Варіантів', value: variantsCount ?? 0, color: 'text-[#0ead69]' },
            { label: 'Учнів', value: studentsCount ?? 0, color: 'text-[#1565c0]' },
            { label: 'Спроб пройдено', value: attemptsCount ?? 0, color: 'text-[#7b1fa2]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <div className={`text-4xl font-black ${color}`}>{value}</div>
              <div className="text-sm text-[#7a9a7a] mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Статистика по варіантах */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1a2e1a]">Середній бал по варіантах</h2>
              <Link href="/admin/variants" className="text-sm text-[#0ead69] font-semibold">Всі →</Link>
            </div>
            {Object.keys(variantStats).length === 0 ? (
              <p className="text-sm text-[#7a9a7a]">Ще немає результатів</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(variantStats).map(([vid, { title, scores }]) => {
                  const avg = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
                  const pct = Math.round(((avg - 100) / 100) * 100)
                  return (
                    <div key={vid}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#1a2e1a] font-medium truncate max-w-[200px]">{title}</span>
                        <span className="font-bold text-[#0ead69]">{avg}</span>
                      </div>
                      <div className="h-2 bg-[#f0f7f0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0ead69] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-[#7a9a7a] mt-0.5">{scores.length} спроб</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Останні результати */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1a2e1a]">Останні результати</h2>
              <Link href="/admin/students" className="text-sm text-[#0ead69] font-semibold">Всі учні →</Link>
            </div>
            {!recentAttempts?.length ? (
              <p className="text-sm text-[#7a9a7a]">Ще немає результатів</p>
            ) : (
              <div className="space-y-2">
                {recentAttempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-[#f5f7f5]">
                    <div>
                      <p className="text-sm font-medium text-[#1a2e1a]">{(a.users as any)?.name}</p>
                      <p className="text-xs text-[#7a9a7a]">{(a.variants as any)?.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0ead69]">{a.nmt_score ?? '—'}</p>
                      <p className="text-xs text-[#7a9a7a]">
                        {new Date(a.finished_at!).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Швидкі дії */}
        <div className="card">
          <h2 className="font-bold text-[#1a2e1a] mb-4">Швидкі дії</h2>
          <div className="flex gap-3 flex-wrap">
            <Link href="/admin/variants/new" className="btn-primary">+ Новий варіант</Link>
            <Link href="/admin/students" className="btn-secondary">👥 Учні</Link>
            <Link href="/materials" className="btn-secondary">📚 Матеріали</Link>
          </div>
        </div>

      </main>
    </div>
  )
}
