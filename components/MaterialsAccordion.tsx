'use client'

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
                <th key={i} className="text-left py-1.5 px-2 text-xs font-semibold text-[#556655]">
                  <MathText text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => {
              const cells = row.split('|').filter(Boolean).map(c => c.trim())
              return (
                <tr key={i} className="border-b border-[#f5f7f5]">
                  {cells.map((cell, j) => (
                    <td key={j} className="py-1.5 px-2 text-xs text-[#1a2e1a]">
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
    <div className="text-xs text-[#1a2e1a] leading-relaxed">
      <MathText text={content} />
    </div>
  )
}

const CATEGORY_ICONS: Record<string, string> = {
  'Алгебра': '∑',
  'Тригонометрія': '∠',
  'Похідна і інтеграл': '∫',
  'Теорія ймовірностей': 'P',
  'Геометрія': '△',
  'Стереометрія': '▲',
}

export default function MaterialsAccordion({ materials }: Props) {
  return (
    <div className="space-y-10">
      {materials.map(category => (
        <div key={category.name} id={category.name}>

          {/* Заголовок розділу */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#0ead69] font-bold text-sm flex-shrink-0">
              {CATEGORY_ICONS[category.name] ?? '📐'}
            </div>
            <h2 className="text-lg font-bold text-[#1a2e1a]">{category.name}</h2>
            <div className="flex-1 h-px bg-[#e8ede8]"></div>
          </div>

          {/* Masonry grid */}
          {category.official.length > 0 && (
            <div style={{
              columns: '2',
              columnGap: '16px',
            }}>
              {category.official.map(item => (
                <div
                  key={item.title}
                  style={{ breakInside: 'avoid', marginBottom: '16px' }}
                  className="bg-white rounded-2xl border border-[#e8ede8] p-4"
                >
                  <h3 className="text-sm font-bold text-[#1a2e1a] mb-3 pb-2 border-b border-[#f0f7f0]">
                    {item.title}
                  </h3>
                  {renderContent(item.content)}
                </div>
              ))}
            </div>
          )}

          {category.official.length === 0 && (
            <p className="text-sm text-[#7a9a7a] italic">Незабаром...</p>
          )}
        </div>
      ))}
    </div>
  )
}