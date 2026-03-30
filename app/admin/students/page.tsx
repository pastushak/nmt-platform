import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StudentActions from '@/components/admin/StudentActions'
import AddStudentButton from '@/components/admin/AddStudentButton'

export default async function StudentsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') redirect('/home')

  const { data: students } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
    .order('name')

  const { data: attempts } = await supabase
    .from('attempts')
    .select('student_id, nmt_score, finished_at')
    .eq('status', 'done')

  const statsMap: Record<string, { count: number; best: number | null; last: number | null }> = {}
  for (const a of attempts ?? []) {
    if (!statsMap[a.student_id]) statsMap[a.student_id] = { count: 0, best: null, last: null }
    const s = statsMap[a.student_id]
    s.count++
    if (a.nmt_score) s.best = s.best === null ? a.nmt_score : Math.max(s.best, a.nmt_score)
  }
  for (const sid of Object.keys(statsMap)) {
    const last = (attempts ?? [])
      .filter(a => a.student_id === sid && a.nmt_score)
      .sort((a, b) => new Date(b.finished_at!).getTime() - new Date(a.finished_at!).getTime())[0]
    if (last) statsMap[sid].last = last.nmt_score
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <header className="bg-white border-b border-[#e8ede8]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-[#7a9a7a] hover:text-[#1a2e1a]">← Дашборд</Link>
            <span className="text-[#c8e6c9]">|</span>
            <nav className="flex gap-1">
              <Link href="/admin" className="nav-link">Дашборд</Link>
              <Link href="/admin/variants" className="nav-link">Варіанти</Link>
              <Link href="/admin/students" className="nav-link-active">Учні</Link>
            </nav>
          </div>
          <AddStudentButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="page-title mb-1">Учні</h1>
            <p className="text-sm text-[#7a9a7a]">
              {students?.length ?? 0} учнів ·{' '}
              {students?.filter(s => s.is_verified).length ?? 0} підтверджених
            </p>
          </div>
        </div>

        {!students?.length ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">👤</p>
            <p className="text-[#445544] font-medium">Ще немає учнів</p>
            <p className="text-sm text-[#7a9a7a] mt-2">Додайте першого учня вручну</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-[#f8faf8] border-b border-[#e8ede8]">
                <tr>
                  {["Ім'я", 'Email', 'Статус', 'Спроб', 'Найкращий', 'Останній', 'Дії'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#7a9a7a] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f7f5]">
                {students.map(student => {
                  const s = statsMap[student.id]
                  return (
                    <tr key={student.id} className={`hover:bg-[#f8faf8] transition-colors ${!student.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1a2e1a] text-sm">{student.name}</span>
                          {student.is_verified && (
                            <span className="text-[#0ead69] text-sm" title="Підтверджено">✔</span>
                          )}
                          {!student.is_active && (
                            <span className="badge-locked text-xs">заблоковано</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#7a9a7a]">{student.email}</td>
                      <td className="px-4 py-3">
                        {student.is_verified
                          ? <span className="badge-done">підтверджено</span>
                          : <span className="badge-warning">очікує</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[#556655]">{s?.count ?? 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#2e7d32] text-sm">{s?.best ?? '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#0ead69] text-sm">{s?.last ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StudentActions student={student} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
