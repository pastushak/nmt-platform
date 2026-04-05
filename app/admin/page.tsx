import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminDashboardCharts from '@/components/admin/AdminDashboardCharts'

export default async function AdminPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('name, role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') redirect('/home')

  // --- Базова статистика ---
  const { count: variantsCount } = await supabase
    .from('variants').select('*', { count: 'exact', head: true })

  const { count: studentsCount } = await supabase
    .from('users').select('*', { count: 'exact', head: true }).eq('role', 'student')

  const { count: attemptsCount } = await supabase
    .from('attempts').select('*', { count: 'exact', head: true }).eq('status', 'done')

  // --- Останні результати + середній бал по варіантах ---
  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select('*, users(name), variants(title)')
    .eq('status', 'done')
    .order('finished_at', { ascending: false })
    .limit(8)

  const { data: allAttempts } = await supabase
    .from('attempts')
    .select('variant_id, nmt_score, variants(title), finished_at, student_id')
    .eq('status', 'done')
    .not('nmt_score', 'is', null)

  // Середній бал по варіантах
  const variantStats: Record<string, { title: string; scores: number[] }> = {}
  for (const a of allAttempts ?? []) {
    if (!variantStats[a.variant_id]) {
      variantStats[a.variant_id] = { title: (a.variants as any)?.title ?? '', scores: [] }
    }
    if (a.nmt_score) variantStats[a.variant_id].scores.push(a.nmt_score)
  }

  // --- Графік активності (останні 7 днів по днях) ---
  const now = new Date()
  const days: { date: string; count: number }[] = []
  for (let d = 6; d >= 0; d--) {
    const start = new Date(now)
    start.setDate(now.getDate() - d)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)

    const label = `${start.getDate().toString().padStart(2, '0')}.${(start.getMonth() + 1).toString().padStart(2, '0')}`
    const count = (allAttempts ?? []).filter(a => {
      const dt = new Date(a.finished_at!)
      return dt >= start && dt <= end
    }).length
    days.push({ date: label, count })
  }

  // --- Розподіл балів НМТ ---
  const ranges = [
    { range: '100-119', min: 100, max: 119 },
    { range: '120-139', min: 120, max: 139 },
    { range: '140-159', min: 140, max: 159 },
    { range: '160-179', min: 160, max: 179 },
    { range: '180-200', min: 180, max: 200 },
  ]
  const distributionData = ranges.map(r => ({
    range: r.range,
    count: (allAttempts ?? []).filter(a => a.nmt_score! >= r.min && a.nmt_score! <= r.max).length,
  }))

  // --- Рейтинг учнів (топ 8 по найкращому балу) ---
  const studentScores: Record<string, { name: string; best: number; attempts: number }> = {}
  for (const a of allAttempts ?? []) {
    if (!a.nmt_score) continue
    const sid = a.student_id
    if (!studentScores[sid]) {
      studentScores[sid] = { name: '', best: 0, attempts: 0 }
    }
    studentScores[sid].best = Math.max(studentScores[sid].best, a.nmt_score)
    studentScores[sid].attempts++
  }

  // Підтягуємо імена учнів
  const studentIds = Object.keys(studentScores)
  if (studentIds.length > 0) {
    const { data: studentNames } = await supabase
      .from('users')
      .select('id, name')
      .in('id', studentIds)
    for (const s of studentNames ?? []) {
      if (studentScores[s.id]) studentScores[s.id].name = s.name
    }
  }

  const topStudents = Object.values(studentScores)
    .filter(s => s.name)
    .sort((a, b) => b.best - a.best)

  // --- Статистика по темах (топ 8 тем з найбільшою кількістю помилок) ---
  const { data: wrongAnswers } = await supabase
    .from('answers')
    .select('question_id')
    .eq('score', 0)

  const mistakeCount: Record<string, number> = {}
  for (const a of wrongAnswers ?? []) {
    mistakeCount[a.question_id] = (mistakeCount[a.question_id] ?? 0) + 1
  }

  const topQIds = Object.entries(mistakeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([id]) => id)

  let topicMistakes: { topic: string; mistakes: number; total: number; pct: number }[] = []

  if (topQIds.length > 0) {
    const { data: topQuestions } = await supabase
      .from('questions')
      .select('id, topic')
      .in('id', topQIds)

    // Групуємо по темах
    const topicMap: Record<string, { mistakes: number; total: number }> = {}
    for (const q of topQuestions ?? []) {
      const topic = q.topic ?? 'Без теми'
      if (!topicMap[topic]) topicMap[topic] = { mistakes: 0, total: 0 }
      topicMap[topic].mistakes += mistakeCount[q.id] ?? 0
    }

    // Підрахуємо загальну кількість відповідей по темах
    const { data: allAnswers } = await supabase
      .from('answers')
      .select('question_id')

    const answerCount: Record<string, number> = {}
    for (const a of allAnswers ?? []) {
      answerCount[a.question_id] = (answerCount[a.question_id] ?? 0) + 1
    }

    const { data: allQuestions } = await supabase
      .from('questions')
      .select('id, topic')

    for (const q of allQuestions ?? []) {
      const topic = q.topic ?? 'Без теми'
      if (topicMap[topic]) {
        topicMap[topic].total += answerCount[q.id] ?? 0
      }
    }

    topicMistakes = Object.entries(topicMap)
      .map(([topic, { mistakes, total }]) => ({
        topic,
        mistakes,
        total,
        pct: total > 0 ? Math.round((mistakes / total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8)
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5] w-full overflow-x-hidden">
      <AdminHeader currentPage="dashboard" userName={profile?.name} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="page-title mb-1">Дашборд</h1>
          <p className="text-sm text-[#7a9a7a]">Загальний огляд платформи</p>
        </div>

        {/* Зведені показники */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Варіантів', value: variantsCount ?? 0, color: 'text-[#0ead69]' },
            { label: 'Учнів', value: studentsCount ?? 0, color: 'text-[#1565c0]' },
            { label: 'Спроб пройдено', value: attemptsCount ?? 0, color: 'text-[#7b1fa2]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <div className={`text-4xl font-black ${color}`}>{value}</div>
              <div className="text-sm text-[#7a9a7a] mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* 4 графіки */}
        <AdminDashboardCharts
          activityData={days}
          distributionData={distributionData}
          topStudents={topStudents}
          topicMistakes={topicMistakes}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Середній бал по варіантах */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1a2e1a]">Середній бал по варіантах</h2>
              <Link href="/admin/variants" className="text-sm text-[#0ead69] font-semibold">Всі →</Link>
            </div>
            {Object.keys(variantStats).length === 0 ? (
              <p className="text-sm text-[#7a9a7a]">Ще немає результатів</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(variantStats).map(([vid, { title, scores }]) => {
                  const avg = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
                  const pct = Math.round(((avg - 100) / 100) * 100)
                  return (
                    <div key={vid}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#1a2e1a] font-medium truncate max-w-[200px]">{title}</span>
                        <span className="font-bold text-[#0ead69]">{avg}</span>
                      </div>
                      <div className="h-2 bg-[#f0f7f0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0ead69] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-[#7a9a7a] mt-0.5">{scores.length} спроб</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Останні результати */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1a2e1a]">Останні результати</h2>
              <Link href="/admin/students" className="text-sm text-[#0ead69] font-semibold">Всі учні →</Link>
            </div>
            {!recentAttempts?.length ? (
              <p className="text-sm text-[#7a9a7a]">Ще немає результатів</p>
            ) : (
              <div className="space-y-2">
                {recentAttempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-[#f5f7f5]">
                    <div>
                      <p className="text-sm font-medium text-[#1a2e1a]">{(a.users as any)?.name}</p>
                      <p className="text-xs text-[#7a9a7a]">{(a.variants as any)?.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0ead69]">{a.nmt_score ?? '—'}</p>
                      <p className="text-xs text-[#7a9a7a]">
                        {new Date(a.finished_at!).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Швидкі дії */}
        <div className="card">
          <h2 className="font-bold text-[#1a2e1a] mb-4">Швидкі дії</h2>
          <div className="flex gap-3 flex-wrap">
            <Link href="/admin/variants/new" className="btn-primary">+ Новий варіант</Link>
            <Link href="/admin/students" className="btn-secondary">👥 Учні</Link>
            <Link href="/materials" className="btn-secondary">📚 Матеріали</Link>
          </div>
        </div>

      </main>
    </div>
  )
}