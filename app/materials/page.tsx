import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import MaterialsAccordion from '@/components/MaterialsAccordion'

export const revalidate = 0

export default async function MaterialsPage() {
  const supabase = createServerSupabaseClient()

  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .order('order_num', { ascending: true })

  // Групуємо по категоріях
  const categories: Record<string, {
    official: typeof materials
    extra: typeof materials
  }> = {}

  for (const m of materials ?? []) {
    if (!categories[m.category]) {
      categories[m.category] = { official: [], extra: [] }
    }
    if (m.is_official) {
      categories[m.category].official!.push(m)
    } else {
      categories[m.category].extra!.push(m)
    }
  }

  const categoryOrder = [
    'Алгебра',
    'Тригонометрія',
    'Похідна і інтеграл',
    'Теорія ймовірностей',
    'Геометрія',
  ]

  const sortedCategories = Object.entries(categories).sort(([a], [b]) => {
    const ai = categoryOrder.indexOf(a)
    const bi = categoryOrder.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return (
    <div className="min-h-screen bg-[#f5f7f5]">

      {/* Навігація */}
      <header className="bg-white border-b border-[#e8ede8]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0ead69] rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L2 4.5v5c0 3.8 2.5 6.5 6 7.5 3.5-1 6-3.7 6-7.5v-5L8 1z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-[#1a2e1a] text-sm">НМТ Математика</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/tests" className="btn-ghost text-sm">← До тестів</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-[#1a2e1a] tracking-tight">
              📚 Довідкові матеріали
            </h1>
          </div>
          <p className="text-sm text-[#7a9a7a]">
            Формули та теорія для підготовки до НМТ з математики
          </p>

          {/* Легенда */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#0ead69]"></span>
              <span className="text-xs text-[#556655]">Офіційні матеріали НМТ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1565c0]"></span>
              <span className="text-xs text-[#556655]">Додаткові матеріали</span>
            </div>
          </div>
        </div>

        {/* Акордеон по категоріях */}
        <MaterialsAccordion categories={sortedCategories} />

      </main>
    </div>
  )
}