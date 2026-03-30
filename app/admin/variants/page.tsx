import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PublishToggle from '@/components/admin/PublishToggle'
import DeleteVariantButton from '@/components/admin/DeleteVariantButton'

export default async function VariantsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') redirect('/home')

  const { data: variants } = await supabase
    .from('variants')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: questionCounts } = await supabase
    .from('questions').select('variant_id')

  const { data: attemptCounts } = await supabase
    .from('attempts').select('variant_id').eq('status', 'done')

  const qMap: Record<string, number> = {}
  for (const q of questionCounts ?? []) {
    qMap[q.variant_id] = (qMap[q.variant_id] ?? 0) + 1
  }

  const aMap: Record<string, number> = {}
  for (const a of attemptCounts ?? []) {
    aMap[a.variant_id] = (aMap[a.variant_id] ?? 0) + 1
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <header className="bg-white border-b border-[#e8ede8]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-[#7a9a7a] hover:text-[#1a2e1a]">← Дашборд</Link>
            <span className="text-[#c8e6c9]">|</span>
            <nav className="flex gap-1">
              <Link href="/admin" className="nav-link">Дашборд</Link>
              <Link href="/admin/variants" className="nav-link-active">Варіанти</Link>
              <Link href="/admin/students" className="nav-link">Учні</Link>
            </nav>
          </div>
          <Link href="/admin/variants/new" className="btn-primary text-sm">+ Новий варіант</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="page-title mb-1">Варіанти</h1>
          <p className="text-sm text-[#7a9a7a]">{variants?.length ?? 0} варіантів</p>
        </div>

        {!variants?.length ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-[#445544] font-medium">Ще немає варіантів</p>
            <Link href="/admin/variants/new" className="btn-primary inline-flex mt-6">
              Створити перший варіант
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map(variant => {
              const qCount = qMap[variant.id] ?? 0
              const aCount = aMap[variant.id] ?? 0
              const isComplete = qCount === 22

              return (
                <div key={variant.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-bold text-[#1a2e1a]">{variant.title}</h2>
                        {variant.is_published ? (
                          <span className="badge-done">Опубліковано</span>
                        ) : (
                          <span className="badge-locked">Чернетка</span>
                        )}
                        {!isComplete && (
                          <span className="badge-warning">{qCount}/22 питань</span>
                        )}
                      </div>
                      {variant.description && (
                        <p className="text-sm text-[#7a9a7a] mb-2">{variant.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[#7a9a7a]">
                        <span>⏱ {variant.time_limit} хв</span>
                        <span>📝 {qCount}/22 питань</span>
                        <span>📊 {aCount} спроб</span>
                        <span>{new Date(variant.created_at).toLocaleDateString('uk-UA')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#7a9a7a]">
                          {variant.is_published ? 'Публічний' : 'Прихований'}
                        </span>
                        <PublishToggle
                          variantId={variant.id}
                          isPublished={variant.is_published}
                          disabled={!isComplete}
                        />
                      </div>
                      <Link
                        href={`/admin/variants/${variant.id}`}
                        className="btn-secondary text-sm py-2 px-4"
                      >
                        ✏️ Редагувати
                      </Link>
                      <DeleteVariantButton variantId={variant.id} title={variant.title} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
