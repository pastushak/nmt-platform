import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import SetClient from '@/components/SetClient'

export default async function SetAttemptPage({
  params,
}: {
  params: { setAttemptId: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempt } = await supabase
    .from('set_attempts')
    .select('*')
    .eq('id', params.setAttemptId)
    .eq('student_id', user.id)
    .single()

  if (!attempt) notFound()
  if (attempt.status === 'done') redirect(`/set-results/${attempt.id}`)

  // Завантажуємо варіанти і питання
  const { data: mathVariant } = await supabase
    .from('variants')
    .select('*')
    .eq('id', attempt.math_variant_id)
    .single()

  const { data: ukrainianVariant } = await supabase
    .from('variants')
    .select('*')
    .eq('id', attempt.ukrainian_variant_id)
    .single()

  if (!mathVariant || !ukrainianVariant) notFound()

  const { data: mathQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('variant_id', attempt.math_variant_id)
    .order('number', { ascending: true })

  const { data: ukrainianQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('variant_id', attempt.ukrainian_variant_id)
    .order('number', { ascending: true })

  if (!mathQuestions?.length || !ukrainianQuestions?.length) notFound()

  return (
    <SetClient
      attemptId={attempt.id}
      startedAt={new Date(attempt.started_at).getTime()}
      mathVariant={mathVariant}
      ukrainianVariant={ukrainianVariant}
      mathQuestions={mathQuestions}
      ukrainianQuestions={ukrainianQuestions}
      userId={user.id}
      savedMathAnswers={attempt.math_answers ?? {}}
      savedUkrainianAnswers={attempt.ukrainian_answers ?? {}}
    />
  )
}