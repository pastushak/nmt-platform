'use client'

import { useState } from 'react'
import MathText from '@/components/ui/MathText'

interface Material {
  id: string
  title: string
  content: string
  category: string
  is_official: boolean
  order_num: number
}

interface Props {
  categories: [string, { official: Material[] | null; extra: Material[] | null }][]
}

const CATEGORY_ICONS: Record<string, string> = {
  'Алгебра': '∑',
  'Тригонометрія': '∠',
  'Похідна і інтеграл': '∫',
  'Теорія ймовірностей': 'P',
  'Геометрія': '△',
}

export default function MaterialsAccordion({ categories }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(categories[0]?.[0] ?? null)
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  function toggleCategory(cat: string) {
    setOpenCategory(prev => prev === cat ? null : cat)
  }

  function toggleItem(id: string) {
    setOpenItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {categories.map(([category, { official, extra }]) => {
        const allItems = [...(official ?? []), ...(extra ?? [])]
        const isOpen = openCategory === category

        return (
          <div key={category} className="bg-white rounded-2xl border border-[#e8ede8] overflow-hidden">

            {/* Заголовок категорії */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#f8faf8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#0ead69] font-bold text-sm">
                  {CATEGORY_ICONS[category] ?? '📐'}
                </div>
                <div className="text-left">
                  <div className="font-bold text-[#1a2e1a]">{category}</div>
                  <div className="text-xs text-[#7a9a7a]">
                    {(official?.length ?? 0)} офіційних
                    {(extra?.length ?? 0) > 0 && ` · ${extra?.length} додаткових`}
                  </div>
                </div>
              </div>
              <svg
                width="20" height="20" viewBox="0 0 20 20" fill="none"
                className={`text-[#7a9a7a] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              >
                <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Вміст категорії */}
            {isOpen && (
              <div className="border-t border-[#e8ede8]">

                {/* Офіційні матеріали */}
                {(official?.length ?? 0) > 0 && (
                  <div className="px-6 py-3 bg-[#f0faf2]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#0ead69]"></span>
                      <span className="text-xs font-semibold text-[#2e7d32] uppercase tracking-wide">
                        Офіційні матеріали НМТ
                      </span>
                    </div>
                    <div className="space-y-2">
                      {official?.map(item => (
                        <MaterialItem
                          key={item.id}
                          item={item}
                          isOpen={openItems.has(item.id)}
                          onToggle={() => toggleItem(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Додаткові матеріали */}
                {(extra?.length ?? 0) > 0 && (
                  <div className="px-6 py-3 bg-[#f0f4ff]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#1565c0]"></span>
                      <span className="text-xs font-semibold text-[#1565c0] uppercase tracking-wide">
                        Додаткові матеріали
                      </span>
                    </div>
                    <div className="space-y-2">
                      {extra?.map(item => (
                        <MaterialItem
                          key={item.id}
                          item={item}
                          isOpen={openItems.has(item.id)}
                          onToggle={() => toggleItem(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MaterialItem({ item, isOpen, onToggle }: {
  item: Material
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e8ede8] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f8faf8] transition-colors text-left"
      >
        <span className="font-medium text-[#1a2e1a] text-sm">{item.title}</span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`text-[#7a9a7a] flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-[#f0f0f0]">
          <div className="pt-3">
            <MathText text={item.content} className="text-sm text-[#1a2e1a] leading-relaxed" />
          </div>
        </div>
      )}
    </div>
  )
}