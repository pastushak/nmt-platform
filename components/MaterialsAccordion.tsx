'use client'

import { useState } from 'react'
import { MaterialCategory } from '@/lib/materials-data'
import MathText from '@/components/ui/MathText'

interface Props {
  materials: MaterialCategory[]
}

function renderContent(content: string) {
  const lines = content.trim().split('\n')
  const tableLines = lines.filter(l => l.trim().startsWith('|'))

  if (tableLines.length) {
    const rows = tableLines.filter(l => !l.match(/^\|[-| ]+\|$/))
    const headers = rows[0].split('|').filter(Boolean).map(h => h.trim())
    const body = rows.slice(1)

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#e8ede8]">
              {headers.map((h, i) => (
                <th key={i} className="text-left py-2 px-3 text-sm font-semibold text-[#556655]">
                  <MathText text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => {
              const cells = row.split('|').filter(Boolean).map(c => c.trim())
              return (
                <tr key={i} className="border-b border-[#f5f7f5] last:border-0">
                  {cells.map((cell, j) => (
                    <td key={j} className="py-2 px-3 text-sm text-[#1a2e1a]">
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

  return (
    <div className="text-sm text-[#1a2e1a] leading-relaxed">
      <MathText text={content} />
    </div>
  )
}

function CardGrid({ items, accent }: { items: { title: string; content: string }[]; accent: 'green' | 'purple' }) {
  const borderColor = accent === 'green' ? 'border-[#e8ede8]' : 'border-[#e0d5ea]'
  const titleBorder = accent === 'green' ? 'border-[#f0f7f0]' : 'border-[#ede5f4]'
  const titleColor = accent === 'green' ? 'text-[#1a2e1a]' : 'text-[#3d1f5c]'

  return (
    <div style={{ columns: '3', columnGap: '16px' }}>
      {items.map(item => (
        <div
          key={item.title}
          style={{ breakInside: 'avoid', marginBottom: '16px' }}
          className={`bg-white rounded-2xl border ${borderColor} p-4`}
        >
          <h3 className={`text-sm font-bold ${titleColor} mb-3 pb-2 border-b ${titleBorder}`}>
            {item.title}
          </h3>
          {renderContent(item.content)}
        </div>
      ))}
    </div>
  )
}

export default function MaterialsAccordion({ materials }: Props) {
  const [mode, setMode] = useState<'official' | 'extra'>('official')

  return (
    <div>
      {/* Перемикач */}
      <div className="flex items-center gap-1 mb-8 bg-white border border-[#e8ede8] rounded-2xl p-1 w-fit">
        <button
          onClick={() => setMode('official')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === 'official'
              ? 'bg-[#0ead69] text-white shadow-sm'
              : 'text-[#7a9a7a] hover:text-[#1a2e1a]'
          }`}
        >
          📋 Офіційні матеріали НМТ
        </button>
        <button
          onClick={() => setMode('extra')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === 'extra'
              ? 'bg-[#7b4fa6] text-white shadow-sm'
              : 'text-[#7a9a7a] hover:text-[#1a2e1a]'
          }`}
        >
          📚 Додаткові матеріали
        </button>
      </div>

      {/* Вміст */}
      <div className="space-y-12">
        {materials.map(category => {
          const items = mode === 'official' ? category.official : category.extra
          const hasItems = items.length > 0

          return (
            <div key={category.name} id={category.name}>

              {/* Заголовок розділу */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  mode === 'official' ? 'bg-[#e8f5e9] text-[#0ead69]' : 'bg-[#f0e8f8] text-[#7b4fa6]'
                }`}>
                  {category.icon}
                </div>
                <h2 className="text-lg font-bold text-[#1a2e1a]">{category.name}</h2>
                <div className="flex-1 h-px bg-[#e8ede8]" />
              </div>

              {hasItems ? (
                <CardGrid items={items} accent={mode === 'official' ? 'green' : 'purple'} />
              ) : (
                <div className="flex items-center gap-3 py-6 px-4 bg-white rounded-2xl border border-[#e8ede8]">
                  <span className="text-2xl">🚧</span>
                  <p className="text-sm text-[#7a9a7a]">
                    {mode === 'extra'
                      ? "Додаткові матеріали для цього розділу незабаром з'являться"
                      : 'Незабаром...'}
                  </p>
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}