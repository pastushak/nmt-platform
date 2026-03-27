import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import LogoutButton from '@/components/ui/ui/LogoutButton'

export default async function HomePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'teacher') redirect('/admin')

  const firstName = profile?.name?.split(' ')[0] ?? 'Учню'

  return (
    <div className="min-h-screen bg-[#f5f7f5]">

      {/* Навігація */}
      <header className="bg-white border-b border-[#e8ede8]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0ead69] rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L2 4.5v5c0 3.8 2.5 6.5 6 7.5 3.5-1 6-3.7 6-7.5v-5L8 1z" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-[#1a2e1a] text-sm leading-tight">НМТ Математика</div>
              <div className="text-[#7a9a7a] text-xs">Підготовка 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#e8f5e9] border-2 border-[#0ead69] flex items-center justify-center text-[#0ead69] text-xs font-bold">
              {profile?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm text-[#445544] font-medium hidden sm:block">
              {profile?.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#f0faf2] to-[#e8f5ff] border-b border-[#e8ede8]">
        <div className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white border border-[#c8e6c9] rounded-full px-3 py-1 text-xs font-semibold text-[#2e7d32] mb-4">
              <span className="w-2 h-2 bg-[#0ead69] rounded-full"></span>
              НМТ 2026 · Математика
            </div>
            <h1 className="text-3xl font-bold text-[#1a2e1a] tracking-tight mb-2">
              Вітаємо, {firstName}! 👋
            </h1>
            <p className="text-[#6b8f6b] text-sm">
              Обери розділ для роботи
            </p>
          </div>
        </div>
      </div>

      {/* Головне меню */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">

          <Link href="/tests" className="group">
            <div className="card hover:border-[#0ead69] hover:shadow-md transition-all duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#e8f5e9] rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ead69" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M7 8h10M7 12h10M7 16h6"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1a2e1a] mb-1">Тести</h2>
              <p className="text-sm text-[#7a9a7a] leading-relaxed">
                Проходити варіанти НМТ та переглядати результати
              </p>
              <div className="flex items-center gap-1 text-[#0ead69] text-sm font-semibold mt-4 group-hover:gap-2 transition-all">
                Перейти <span>→</span>
              </div>
            </div>
          </Link>

          <Link href="/stats" className="group">
            <div className="card hover:border-[#0ead69] hover:shadow-md transition-all duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#e3f2fd] rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 18V10l5-5 4 4 5-7v16"/>
                  <path d="M3 18h18"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1a2e1a] mb-1">Статистика</h2>
              <p className="text-sm text-[#7a9a7a] leading-relaxed">
                Графіки прогресу та порівняння з класом
              </p>
              <div className="flex items-center gap-1 text-[#0ead69] text-sm font-semibold mt-4 group-hover:gap-2 transition-all">
                Перейти <span>→</span>
              </div>
            </div>
          </Link>

        </div>
      </main>
    </div>
  )
}