import Link from 'next/link'
import { MATERIALS } from '@/lib/materials-data'
import MaterialsAccordion from '@/components/MaterialsAccordion'
import ScrollToTop from '@/components/ui/ScrollToTop'

export default function MaterialsPage() {
  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <header className="bg-white border-b border-[#e8ede8]">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0ead69] rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L2 4.5v5c0 3.8 2.5 6.5 6 7.5 3.5-1 6-3.7 6-7.5v-5L8 1z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-[#1a2e1a] text-sm">НМТ Математика</span>
          </div>
          <Link href="/tests" className="btn-ghost text-sm">← До тестів</Link>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="flex gap-8">

          {/* Бічна навігація */}
          <aside className="w-48 flex-shrink-0 hidden md:block">
            <div className="sticky top-6">
              <p className="text-xs font-bold text-[#7a9a7a] uppercase tracking-wide mb-3">
                Розділи
              </p>
              <nav className="space-y-1">
                {MATERIALS.map(category => (
                  <a
                    key={category.name}
                    href={`#${category.name}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#445544] hover:bg-[#f0faf2] hover:text-[#0ead69] transition-colors"
                  >
                    <span className="text-base">{category.icon}</span>
                    <span>{category.name}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Основний вміст */}
          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#1a2e1a] tracking-tight mb-1">
                📚 Довідкові матеріали НМТ
              </h1>
              <p className="text-sm text-[#7a9a7a]">
                Офіційні формули та теорія для підготовки до НМТ з математики
              </p>
            </div>

            <MaterialsAccordion materials={MATERIALS} />
          </main>

        </div>
      </div>
      <ScrollToTop />
    </div>
  )
}