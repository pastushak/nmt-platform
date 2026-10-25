import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireStudentAccess } from '@/lib/access'
import TestClient from '@/components/TestClient'
import type { Question } from '@/lib/types'

export default async function TestPage({
  params,
}: {
  params: { variantId: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await requireStudentAccess(supabase, user.id)
  if (profile?.role === 'student' && !profile.is_verified) redirect('/tests')

  const { data: variant } = await supabase
    .from('variants')
    .select('*')
    .eq('id', params.variantId)
    .eq('is_published', true)
    .single()

  if (!variant) notFound()

  // Питання БЕЗ правильних відповідей (функція в БД)
  const { data: qRows } = await supabase.rpc('get_test_questions', { p_variant_id: params.variantId })
  const questions = (qRows ?? []) as unknown as Question[]
  if (!questions.length) notFound()

  // Незавершена спроба цього варіанта — продовжуємо її, а не починаємо з нуля
  let resume: { id: string; startedAt: number; answers: Record<string, any> } | null = null
  const { data: open } = await supabase
    .from('attempts')
    .select('id, started_at')
    .eq('student_id', user.id)
    .eq('variant_id', params.variantId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (open) {
    const startedAt = new Date(open.started_at).getTime()
    const deadline = startedAt + (variant.time_limit ?? 60) * 60_000
    if (Date.now() >= deadline) {
      // Час вийшов, поки учня не було — здаємо збережені відповіді й починаємо нову спробу
      await supabase.rpc('submit_attempt', { p_attempt_id: open.id, p_answers: {} })
    } else {
      const { data: saved } = await supabase
        .from('answers')
        .select('question_id, question_type, answer_single, answer_matching, answer_open')
        .eq('attempt_id', open.id)
      const answers: Record<string, any> = {}
      for (const a of saved ?? []) {
        answers[a.question_id] = {
          type: a.question_type,
          answer_single: a.answer_single ?? undefined,
          answer_matching: a.answer_matching ?? undefined,
          answer_open: a.answer_open ?? undefined,
        }
      }
      resume = { id: open.id, startedAt, answers }
    }
  }

  return (
    <TestClient
      variant={variant}
      questions={questions}
      userId={user.id}
      resume={resume}
    />
  )
}