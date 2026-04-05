import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StudentHeader from '@/components/StudentHeader'
import Footer from '@/components/ui/Footer'

export default async function TestsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.rpc('get_my_profile')

  if (profile?.role === 'teacher') redirect('/admin')

  const { data: allVariants } = await supabase
    .from('variants')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: attempts } = await supabase
    .from('attempts')
    .select('variant_id, nmt_score, score_total, finished_at, status')
    .eq('student_id', user.id)
    .eq('status', 'done')
    .order('finished_at', { ascending: false })

  const attemptsByVariant: Record<string, typeof attempts> = {}
  for (const a of attempts ?? []) {
    if (!attemptsByVariant[a.variant_id]) attemptsByVariant[a.variant_id] = []
    attemptsByVariant[a.variant_id]!.push(a)
  }

  const lastSeen = profile?.last_seen_at ? new Date(profile.last_seen_at) : null
  const newThreshold = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)

  const variants = allVariants ?? []

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex flex-col">
      <StudentHeader currentPage="tests" userName={profile?.name} />

      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">

        <div className="mb-6">
          <h1 className="page-title mb-1">Варіанти тестів</h1>
          <p className="text-sm text-[#7a9a7a]">
            {variants.filter(v => v.is_published).length} доступних варіантів
          </p>
        </div>

        {!variants.length ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-[#445544] font-medium">Поки немає варіантів</p>
            <p className="text-sm text-[#7a9a7a] mt-1">Викладач ще не додав жодного тесту</p>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((variant, index) => {
              const variantAttempts = attemptsByVariant[variant.id] ?? []
              const attemptCount = variantAttempts.length
              const bestScore = attemptCount > 0
                ? Math.max(...variantAttempts.map(a => a.nmt_score ?? 0))
                : null
              const lastAttempt = variantAttempts[0]

              const isNew = variant.is_published && lastSeen &&
                new Date(variant.created_at) > lastSeen &&
                new Date(variant.created_at) > newThreshold

              const isRecentlyAdded = variant.is_published && !lastSeen &&
                new Date(variant.created_at) > newThreshold

              return (
                <div
                  key={variant.id}
                  className={`bg-white rounded-2xl border transition-all duration-150 ${
                    variant.is_published
                      ? 'border-[#e8ede8] hover:border-[#b2dfdb] hover:shadow-sm cursor-pointer'
                      : 'border-[#e8ede8] opacity-60'
                  }`}
                >
                  <div className="p-5 flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      !variant.is_published
                        ? 'bg-[#f5f5f5] text-[#9e9e9e]'
                        : attemptCount > 0
                        ? 'bg-[#e8f5e9] text-[#2e7d32]'
                        : 'bg-[#f0faf2] text-[#0ead69]'
                    }`}>
                      {!variant.is_published ? '🔒' : index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-[#1a2e1a] text-sm">{variant.title}</span>
                        {!variant.is_published && <span className="badge-locked">скоро</span>}
                        {(isNew || isRecentlyAdded) && <span className="badge-new">НОВЕ</span>}
                        {attemptCount === 1 && <span className="badge-done">✓ пройдено</span>}
                        {attemptCount > 1 && <span className="badge-done">✓ ×{attemptCount}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#7a9a7a]">
                        <span>⏱ {variant.time_limit} хв</span>
                        <span>· 22 питання</span>
                        {attemptCount > 0 && lastAttempt?.finished_at && (
                          <span>· остання: {new Date(lastAttempt.finished_at).toLocaleDateString('uk-UA')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      {bestScore !== null && (
                        <div className="text-right">
                          <div className="text-xl font-bold text-[#1a2e1a] leading-tight">{bestScore}</div>
                          <div className="text-xs text-[#7a9a7a]">найкращий</div>
                        </div>
                      )}
                      {variant.is_published ? (
                        profile?.is_verified ? (
                          <Link href={`/test/${variant.id}`} className="btn-primary text-xs py-2 px-4">
                            {attemptCount === 0 ? '▶ Пройти' : '▶ Ще раз'}
                          </Link>
                        ) : (
                          <span className="text-xs text-orange-500 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl font-medium">
                            ⏳ Не підтверджено
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-[#9e9e9e] bg-[#f5f5f5] px-4 py-2 rounded-xl">
                          Недоступно
                        </span>
                      )}
                    </div>
                  </div>

                  {attemptCount > 0 && (
                    <div className="px-5 pb-4 pt-0">
                      <div className="border-t border-[#f0f7f0] pt-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-[#aec5ae] font-medium">Спроби:</span>
                          {variantAttempts.map((a, i) => (
                            <span key={i} className="text-xs bg-[#f0faf2] text-[#2e7d32] border border-[#c8e6c9] px-2.5 py-0.5 rounded-full font-semibold">
                              {a.nmt_score ?? '—'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}