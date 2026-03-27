import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ResultsClient from '@/components/ResultsClient'

export default async function ResultsPage({
  params,
}: {
  params: { attemptId: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempt } = await supabase
    .from('attempts')
    .select('*, variants(title)')
    .eq('id', params.attemptId)
    .eq('student_id', user.id)
    .single()

  if (!attempt || attempt.status !== 'done') notFound()

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('variant_id', attempt.variant_id)
    .order('number')

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('attempt_id', params.attemptId)

  return (
    <ResultsClient
      attempt={attempt}
      questions={questions ?? []}
      answers={answers ?? []}
    />
  )
}