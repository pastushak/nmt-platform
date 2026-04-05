import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import StudentHeader from '@/components/StudentHeader'
import Footer from '@/components/ui/Footer'

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

  // Спроби учня
  const { data: attempts } = await supabase
    .from('attempts')
    .select('nmt_score, score_total, finished_at, variant_id, started_at')
    .eq('student_id', user.id)
    .eq('status', 'done')
    .order('finished_at', { ascending: false })

  // Кількість доступних варіантів
  const { count: totalVariants } = await supabase
    .from('variants')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)

  const nmtScores = (attempts ?? []).filter(a => a.nmt_score).map(a => a.nmt_score!)
  const best = nmtScores.length ? Math.max(...nmtScores) : null
  const last = nmtScores.length ? nmtScores[0] : null
  const lastAttempt = attempts?.[0] ?? null

  // Унікальні пройдені варіанти
  const passedVariants = new Set((attempts ?? []).map(a => a.variant_id)).size
  const remainingVariants = (totalVariants ?? 0) - passedVariants

  // Динаміка: порівняння останніх двох результатів
  const trend = nmtScores.length >= 2
    ? nmtScores[0] - nmtScores[1]
    : null

  // Середній час виконання
  const durations = (attempts ?? [])
    .filter(a => a.started_at && a.finished_at)
    .map(a => Math.round((new Date(a.finished_at!).getTime() - new Date(a.started_at!).getTime()) / 60000))
  const avgDuration = durations.length
    ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length)
    : null

  const hasAttempts = (attempts ?? []).length > 0

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <StudentHeader currentPage="home" userName={profile?.name} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#f0faf2] to-[#e8f5ff] border-b border-[#e8ede8]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="inline-flex items-center gap-2 bg-white border border-[#c8e6c9] rounded-full px-3 py-1 text-xs font-semibold text-[#2e7d32] mb-3">
            <span className="w-2 h-2 bg-[#0ead69] rounded-full"></span>
            НМТ 2026 · Математика
          </div>
          <h1 className="text-3xl font-bold text-[#1a2e1a] tracking-tight mb-1">
            Вітаємо, {firstName}! 👋
          </h1>
          <p className="text-[#6b8f6b] text-sm">
            {hasAttempts ? 'Продовжуй підготовку — ти на правильному шляху' : 'Почни підготовку — пройди перший варіант'}
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Міні-статистика — тільки якщо є спроби */}
        {hasAttempts && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className={`text-3xl font-black ${
                best && best >= 180 ? 'text-[#2e7d32]' :
                best && best >= 150 ? 'text-[#0ead69]' :
                best && best >= 130 ? 'text-[#f57f17]' : 'text-red-500'
              }`}>{best ?? '—'}</div>
              <div className="text-xs text-[#7a9a7a] mt-1">Найкращий бал</div>
            </div>

            <div className="card text-center">
              <div className="flex items-center justify-center gap-1">
                <span className={`text-3xl font-black ${
                  last && last >= 180 ? 'text-[#2e7d32]' :
                  last && last >= 150 ? 'text-[#0ead69]' :
                  last && last >= 130 ? 'text-[#f57f17]' : 'text-red-500'
                }`}>{last ?? '—'}</span>
                {trend !== null && (
                  <span className={`text-sm font-bold ${trend > 0 ? 'text-[#0ead69]' : trend < 0 ? 'text-red-400' : 'text-[#7a9a7a]'}`}>
                    {trend > 0 ? `↑${trend}` : trend < 0 ? `↓${Math.abs(trend)}` : '→'}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#7a9a7a] mt-1">Останній бал</div>
            </div>

            <div className="card text-center">
              <div className="text-3xl font-black text-[#1565c0]">{(attempts ?? []).length}</div>
              <div className="text-xs text-[#7a9a7a] mt-1">Спроб всього</div>
            </div>

            <div className="card text-center">
              <div className="text-3xl font-black text-[#7b1fa2]">
                {remainingVariants > 0 ? remainingVariants : '✓'}
              </div>
              <div className="text-xs text-[#7a9a7a] mt-1">
                {remainingVariants > 0 ? 'Варіантів лишилось' : 'Всі пройдено'}
              </div>
            </div>
          </div>
        )}

        {/* Остання спроба */}
        {lastAttempt && (
          <div className="bg-white rounded-2xl border border-[#e8ede8] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#7a9a7a] font-medium mb-0.5">Остання спроба</p>
              <p className="text-sm font-semibold text-[#1a2e1a]">
                {new Date(lastAttempt.finished_at!).toLocaleDateString('uk-UA', {
                  day: 'numeric', month: 'long'
                })}
              </p>
              {avgDuration && (
                <p className="text-xs text-[#aec5ae] mt-0.5">⏱ Сер. час: {avgDuration} хв</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/stats" className="btn-secondary text-xs py-2 px-4">
                Моя статистика →
              </Link>
              <Link href="/tests" className="btn-primary text-xs py-2 px-4">
                ▶ Продовжити
              </Link>
            </div>
          </div>
        )}

        {/* Головне меню */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <Link href="/tests" className="group">
            <div className="card hover:border-[#0ead69] hover:shadow-md transition-all duration-200 cursor-pointer">
              <div className="w-12 h-12 bg-[#e8f5e9] rounded-xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ead69" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M7 8h10M7 12h10M7 16h6"/>
                </svg>
              </div>
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-lg font-bold text-[#1a2e1a]">Тести</h2>
                {remainingVariants > 0 && (
                  <span className="text-xs bg-[#e3f2fd] text-[#1565c0] font-bold px-2 py-0.5 rounded-full">
                    {remainingVariants} нових
                  </span>
                )}
              </div>
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
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-lg font-bold text-[#1a2e1a]">Статистика</h2>
                {trend !== null && trend > 0 && (
                  <span className="text-xs bg-[#e8f5e9] text-[#2e7d32] font-bold px-2 py-0.5 rounded-full">
                    ↑ +{trend} до попереднього
                  </span>
                )}
              </div>
              <p className="text-sm text-[#7a9a7a] leading-relaxed">
                Графіки прогресу та порівняння з класом
              </p>
              <div className="flex items-center gap-1 text-[#0ead69] text-sm font-semibold mt-4 group-hover:gap-2 transition-all">
                Перейти <span>→</span>
              </div>
            </div>
          </Link>

        </div>

        {/* Підказка для нового учня */}
        {!hasAttempts && (
          <div className="bg-gradient-to-r from-[#e8f5e9] to-[#e3f2fd] rounded-2xl border border-[#c8e6c9] p-5 flex items-center gap-4">
            <div className="text-3xl">🚀</div>
            <div className="flex-1">
              <p className="font-semibold text-[#1a2e1a] text-sm">Готовий почати?</p>
              <p className="text-xs text-[#556655] mt-0.5">Перший варіант займе близько 60 хвилин. Відповіді зберігаються автоматично.</p>
            </div>
            <Link href="/tests" className="btn-primary text-xs py-2 px-4 flex-shrink-0">
              Почати →
            </Link>
          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}