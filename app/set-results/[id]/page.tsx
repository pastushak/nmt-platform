import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import SetResultsClient from '@/components/SetResultsClient'

export default async function SetResultsPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempt } = await supabase
    .from('set_attempts')
    .select('*')
    .eq('id', params.id)
    .eq('student_id', user.id)
    .single()

  if (!attempt || attempt.status !== 'done') notFound()

  const { data: mathQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('variant_id', attempt.math_variant_id)
    .order('number')

  const { data: ukrainianQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('variant_id', attempt.ukrainian_variant_id)
    .order('number')

  const { data: mathVariant } = await supabase
    .from('variants')
    .select('title')
    .eq('id', attempt.math_variant_id)
    .single()

  const { data: ukrainianVariant } = await supabase
    .from('variants')
    .select('title')
    .eq('id', attempt.ukrainian_variant_id)
    .single()

  const durationMin = attempt.started_at && attempt.finished_at
    ? Math.round(
        (new Date(attempt.finished_at).getTime() - new Date(attempt.started_at).getTime()) / 60000
      )
    : null

  return (
    <SetResultsClient
      attempt={attempt}
      mathQuestions={mathQuestions ?? []}
      ukrainianQuestions={ukrainianQuestions ?? []}
      mathVariantTitle={mathVariant?.title ?? ''}
      ukrainianVariantTitle={ukrainianVariant?.title ?? ''}
      durationMin={durationMin}
    />
  )
}