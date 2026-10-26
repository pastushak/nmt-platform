import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PublishToggle from '@/components/admin/PublishToggle'
import DeleteVariantButton from '@/components/admin/DeleteVariantButton'
import AdminHeader from '@/components/admin/AdminHeader'
import { getLayout, isTopicVariant, totalQuestions } from '@/lib/variant-layout'
import { fetchAll } from '@/lib/fetch-all'

export default async function VariantsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .rpc('get_my_profile')
  if (profile?.role !== 'teacher') redirect('/home')

  const { data: variants } = await supabase
    .from('variants')
    .select('*')
    .order('created_at', { ascending: false })

  // Усі питання й спроби — сторінками (Supabase обрізає відповідь на 1000 рядках)
  const [questionCounts, attemptCounts] = await Promise.all([
    fetchAll<{ variant_id: string }>((from, to) => supabase
      .from('questions').select('variant_id').order('id').range(from, to)),
    fetchAll<{ variant_id: string }>((from, to) => supabase
      .from('attempts').select('variant_id').eq('status', 'done').order('id').range(from, to)),
  ])

  const qMap: Record<string, number> = {}
  for (const q of questionCounts ?? []) {
    qMap[q.variant_id] = (qMap[q.variant_id] ?? 0) + 1
  }

  const aMap: Record<string, number> = {}
  for (const a of attemptCounts ?? []) {
    aMap[a.variant_id] = (aMap[a.variant_id] ?? 0) + 1
  }

  function getRequiredCount(v: any) {
    if (isTopicVariant(v)) return totalQuestions(getLayout(v))
    return v.subject === 'ukrainian' ? 30 : 22
  }

  const fullCount = (variants ?? []).filter(v => !isTopicVariant(v)).length
  const topicCount = (variants ?? []).length - fullCount

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <AdminHeader currentPage="variants" userName={profile?.name} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="page-title mb-1">Варіанти</h1>
            <p className="text-sm text-[#7a9a7a]">{fullCount} варіантів НМТ · {topicCount} тематичних тестів</p>
          </div>
          <Link href="/admin/variants/new" className="btn-primary">+ Новий варіант / тест</Link>
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
              const required = getRequiredCount(variant)
              const isComplete = qCount === required
              const subjectLabel = variant.subject === 'ukrainian' ? '🇺🇦 Укр. мова' : '📐 Математика'

              return (
                <div key={variant.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-bold text-[#1a2e1a]">{variant.title}</h2>
                        <span className="text-xs bg-[#f0f7f0] text-[#556655] px-2 py-0.5 rounded-full font-medium">
                          {subjectLabel}
                        </span>
                        {isTopicVariant(variant) && (
                          <span className="text-xs bg-[#fff8e1] text-[#f57f17] px-2 py-0.5 rounded-full font-semibold">
                            🎯 {variant.topic || 'Тематичний'}
                          </span>
                        )}
                        {variant.is_published ? (
                          <span className="badge-done">Опубліковано</span>
                        ) : (
                          <span className="badge-locked">Чернетка</span>
                        )}
                        {!isComplete && (
                          <span className="badge-warning">{qCount}/{required} питань</span>
                        )}
                      </div>
                      {variant.description && (
                        <p className="text-sm text-[#7a9a7a] mb-2">{variant.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[#7a9a7a]">
                        <span>⏱ {variant.time_limit} хв</span>
                        <span>📝 {qCount}/{required} питань</span>
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
                          requiredCount={required}
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