import Link from 'next/link'
import { MATERIALS } from '@/lib/materials-data'
import MaterialsAccordion from '@/components/MaterialsAccordion'

export default function MaterialsPage() {
  return (
    <div className="min-h-screen bg-[#f5f7f5]">
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
          <Link href="/tests" className="btn-ghost text-sm">← До тестів</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1a2e1a] tracking-tight mb-2">
            📚 Довідкові матеріали
          </h1>
          <p className="text-sm text-[#7a9a7a] mb-4">
            Формули та теорія для підготовки до НМТ з математики
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#0ead69]"></span>
              <span className="text-xs text-[#556655]">Офіційні матеріали НМТ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4E3064]"></span>
              <span className="text-xs text-[#556655]">Додаткові матеріали</span>
            </div>
          </div>
        </div>

        <MaterialsAccordion materials={MATERIALS} />
      </main>
    </div>
  )
}