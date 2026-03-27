import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import TestClient from '@/components/TestClient'

export default async function TestPage({
  params,
}: {
  params: { variantId: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: variant } = await supabase
    .from('variants')
    .select('*')
    .eq('id', params.variantId)
    .eq('is_published', true)
    .single()

  if (!variant) notFound()

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('variant_id', params.variantId)
    .order('number', { ascending: true })

  if (!questions?.length) notFound()

  return (
    <TestClient
      variant={variant}
      questions={questions}
      userId={user.id}
    />
  )
}