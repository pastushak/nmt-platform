import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StudentHeader from '@/components/StudentHeader'
import SetLauncher from '@/components/SetLauncher'
import Footer from '@/components/ui/Footer'

export default async function SetPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.rpc('get_my_profile')
  if (profile?.role === 'teacher') redirect('/admin')

  // Перевіряємо чи є опубліковані варіанти обох предметів
  const { data: mathVariants } = await supabase
    .from('variants')
    .select('id, title')
    .eq('subject', 'math')
    .eq('is_published', true)

  const { data: ukrainianVariants } = await supabase
    .from('variants')
    .select('id, title')
    .eq('subject', 'ukrainian')
    .eq('is_published', true)

  // Попередні сет-спроби учня
  const { data: pastAttempts } = await supabase
    .from('set_attempts')
    .select('id, math_nmt_score, ukrainian_nmt_score, finished_at, status')
    .eq('student_id', user.id)
    .eq('status', 'done')
    .order('finished_at', { ascending: false })
    .limit(5)

  // Незавершена спроба
  const { data: inProgress } = await supabase
    .from('set_attempts')
    .select('id, started_at')
    .eq('student_id', user.id)
    .eq('status', 'in_progress')
    .single()

  const canStart = (mathVariants?.length ?? 0) > 0 && (ukrainianVariants?.length ?? 0) > 0

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex flex-col">
      <StudentHeader currentPage="set" userName={profile?.name} />

      <main className="max-w-2xl mx-auto w-full px-6 py-8 flex-1">
        <SetLauncher
          canStart={canStart}
          isVerified={profile?.is_verified ?? false}
          mathCount={mathVariants?.length ?? 0}
          ukrainianCount={ukrainianVariants?.length ?? 0}
          pastAttempts={pastAttempts ?? []}
          inProgressId={inProgress?.id ?? null}
          userId={user.id}
        />
      </main>

      <Footer />
    </div>
  )
}