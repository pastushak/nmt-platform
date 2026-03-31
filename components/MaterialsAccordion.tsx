'use client'

import { useState } from 'react'
import { MaterialCategory } from '@/lib/materials-data'
import MathText from '@/components/ui/MathText'

interface Props {
  materials: MaterialCategory[]
}

function renderTable(content: string) {
  const lines = content.trim().split('\n')
  const tableLines = lines.filter(l => l.trim().startsWith('|'))
  if (!tableLines.length) {
    return <p className="text-sm text-[#1a2e1a] leading-relaxed whitespace-pre-line">{content}</p>
  }

  const rows = tableLines.filter(l => !l.match(/^\|[-| ]+\|$/))
  const headers = rows[0].split('|').filter(Boolean).map(h => h.trim())
  const body = rows.slice(1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#f0f7f0]">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 text-xs font-bold text-[#1a2e1a] border border-[#e8ede8]">
                <MathText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => {
            const cells = row.split('|').filter(Boolean).map(c => c.trim())
            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8faf8]'}>
                {cells.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-[#1a2e1a] border border-[#e8ede8] text-xs">
                    <MathText text={cell} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MaterialItem({ title, content, isExtra }: {
  title: string
  content: string
  isExtra: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-[#e8ede8] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f8faf8] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isExtra && (
            <span className="w-2 h-2 rounded-full bg-[#4E3064] flex-shrink-0"></span>
          )}
          <span className="font-medium text-[#1a2e1a] text-sm">{title}</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`text-[#7a9a7a] flex-shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#f0f0f0] pt-3">
          {renderTable(content)}
        </div>
      )}
    </div>
  )
}

export default function MaterialsAccordion({ materials }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(materials[0]?.name ?? null)

  return (
    <div className="space-y-3">
      {materials.map(category => {
        const isOpen = openCategory === category.name
        const hasExtra = category.extra.length > 0

        return (
          <div key={category.name} className="bg-white rounded-2xl border border-[#e8ede8] overflow-hidden">

            {/* Заголовок категорії */}
            <button
              onClick={() => setOpenCategory(isOpen ? null : category.name)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#f8faf8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#0ead69] font-bold text-sm">
                  {category.icon}
                </div>
                <div className="text-left">
                  <div className="font-bold text-[#1a2e1a]">{category.name}</div>
                  <div className="text-xs text-[#7a9a7a]">
                    {category.official.length} офіційних
                    {hasExtra && ` · ${category.extra.length} додаткових`}
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

            {/* Вміст */}
            {isOpen && (
              <div className="border-t border-[#e8ede8]">

                <div className={`grid gap-0 ${hasExtra ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Офіційні */}
                  <div className="px-6 py-4 bg-[#f0faf2]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#0ead69]"></span>
                      <span className="text-xs font-bold text-[#2e7d32] uppercase tracking-wide">
                        Офіційні матеріали НМТ
                      </span>
                    </div>
                    <div className="space-y-2">
                      {category.official.map(item => (
                        <MaterialItem
                          key={item.title}
                          title={item.title}
                          content={item.content}
                          isExtra={false}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Додаткові */}
                  {hasExtra && (
                    <div className="px-6 py-4 border-l border-[#e8ede8]" style={{ background: '#f5f0f8' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-[#4E3064]"></span>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#4E3064' }}>
                          Додаткові матеріали
                        </span>
                      </div>
                      <div className="space-y-2">
                        {category.extra.map(item => (
                          <MaterialItem
                            key={item.title}
                            title={item.title}
                            content={item.content}
                            isExtra={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}