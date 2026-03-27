import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import VariantEditor from '@/components/admin/VariantEditor'

export default async function VariantEditPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') redirect('/home')

  const { data: variant } = await supabase
    .from('variants').select('*').eq('id', params.id).single()
  if (!variant) notFound()

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('variant_id', params.id)
    .order('number')

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <header className="bg-white border-b border-[#e8ede8]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/variants" className="text-sm text-[#7a9a7a] hover:text-[#1a2e1a]">
              ← Варіанти
            </Link>
            <span className="text-[#c8e6c9]">|</span>
            <div>
              <span className="font-bold text-[#1a2e1a]">{variant.title}</span>
              <span className="text-xs text-[#7a9a7a] ml-2">
                {questions?.length ?? 0}/22 питань
              </span>
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
            variant.is_published
              ? 'bg-[#e8f5e9] text-[#2e7d32]'
              : 'bg-[#f5f5f5] text-[#9e9e9e]'
          }`}>
            {variant.is_published ? 'Опубліковано' : 'Чернетка'}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <VariantEditor
          variant={variant}
          initialQuestions={questions ?? []}
        />
      </main>
    </div>
  )
}