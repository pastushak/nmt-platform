import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireStudentAccess } from '@/lib/access'
import SetClient from '@/components/SetClient'
import type { Question } from '@/lib/types'

export default async function SetAttemptPage({
  params,
}: {
  params: { setAttemptId: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await requireStudentAccess(supabase, user.id)

  const { data: attempt } = await supabase
    .from('set_attempts')
    .select('*')
    .eq('id', params.setAttemptId)
    .eq('student_id', user.id)
    .single()

  if (!attempt) notFound()
  if (attempt.status === 'done') redirect(`/set-results/${attempt.id}`)

  // Час сету (120 хв) вийшов, поки учня не було — здаємо збережені відповіді
  if (Date.now() >= new Date(attempt.started_at).getTime() + 120 * 60_000) {
    await supabase.rpc('submit_set', { p_set_id: attempt.id })
    redirect(`/set-results/${attempt.id}`)
  }

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

  // Питання БЕЗ правильних відповідей (функція в БД)
  const [{ data: mRows }, { data: uRows }] = await Promise.all([
    supabase.rpc('get_test_questions', { p_variant_id: attempt.math_variant_id }),
    supabase.rpc('get_test_questions', { p_variant_id: attempt.ukrainian_variant_id }),
  ])
  const mathQuestions = (mRows ?? []) as unknown as Question[]
  const ukrainianQuestions = (uRows ?? []) as unknown as Question[]

  if (!mathQuestions.length || !ukrainianQuestions.length) notFound()

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