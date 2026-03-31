import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import VariantEditor from '@/components/admin/VariantEditor'
import AdminHeader from '@/components/admin/AdminHeader'

export default async function VariantEditPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.rpc('get_my_profile')
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
      <AdminHeader currentPage="dashboard" userName={profile?.name} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <VariantEditor
          variant={variant}
          initialQuestions={questions ?? []}
        />
      </main>
    </div>
  )
}