'use client'

import { useRef, useState } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  className?: string
  /** Показати кнопки наголосу/апострофа (тільки для укр.мови) */
  showUkrainianTools?: boolean
  /** Показати кнопку вставки зображення */
  showImageButton?: boolean
  /** Показати кнопку вставки таблиці */
  showTableButton?: boolean
  /** Викликається при кліку на кнопку "зображення" */
  onImageClick?: () => void
  /** Компактний режим — менший тулбар, одна лінія */
  compact?: boolean
}

export default function RichTextInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
  showUkrainianTools = true,
  showImageButton = false,
  showTableButton = false,
  onImageClick,
  compact = false,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [showTableMenu, setShowTableMenu] = useState(false)

  /** Вставляє текст довкола виділення або в позицію курсору */
  function wrap(before: string, after: string = before) {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.substring(start, end)
    const replacement = before + selected + after
    const newValue = value.substring(0, start) + replacement + value.substring(end)
    onChange(newValue)
    // Відновлюємо фокус і виділення
    requestAnimationFrame(() => {
      ta.focus()
      const cursorStart = selected ? start : start + before.length
      const cursorEnd = selected ? start + replacement.length : start + before.length
      ta.setSelectionRange(cursorStart, cursorEnd)
    })
  }

  /** Вставляє символ у позицію курсору (без обгортання) */
  function insert(text: string) {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newValue = value.substring(0, start) + text + value.substring(end)
    onChange(newValue)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    })
  }

  /** Вставляє наголос: якщо є виділений символ — ставить після нього;
   *  якщо нема — ставить у позицію курсору (користувач має поставити курсор після голосної) */
  function addStress() {
    const ta = taRef.current
    if (!ta) return
    insert('\u0301') // комбінувальний гострий наголос U+0301
  }

  function insertTable(rows: number, cols: number) {
    const header = '| ' + Array(cols).fill('   ').join(' | ') + ' |'
    const divider = '| ' + Array(cols).fill('---').join(' | ') + ' |'
    const body = Array(rows - 1)
      .fill(0)
      .map(() => '| ' + Array(cols).fill('   ').join(' | ') + ' |')
      .join('\n')
    const table = '\n' + header + '\n' + divider + '\n' + body + '\n'
    insert(table)
    setShowTableMenu(false)
  }

  const btnClass =
    'px-2 py-1 text-xs font-semibold rounded hover:bg-[#e8ede8] text-[#445544] border border-transparent hover:border-[#d0dcd0] transition-colors'

  return (
    <div className={`border border-[#d8e0d8] rounded-lg bg-white overflow-hidden ${className}`}>
      {/* Тулбар */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-[#f5f7f5] border-b border-[#e8ede8]">
        <button type="button" onClick={() => wrap('**')} title="Жирний (Ctrl+B)" className={btnClass}>
          <strong>Б</strong>
        </button>
        <button type="button" onClick={() => wrap('<em>', '</em>')} title="Курсив (Ctrl+I)" className={btnClass}>
          <em>К</em>
        </button>
        <button type="button" onClick={() => wrap('<u>', '</u>')} title="Підкреслення" className={btnClass}>
          <u>П</u>
        </button>
        <button type="button" onClick={() => insert('  \n')} title="Новий рядок (Shift+Enter)" className={btnClass}>
          ↵
        </button>

        {showUkrainianTools && (
          <>
            <span className="mx-1 w-px h-4 bg-[#d0dcd0]" />
            <button type="button" onClick={addStress} title="Наголос (поставте курсор після голосної)" className={btnClass}>
              а́
            </button>
            <button type="button" onClick={() => insert('\u02BC')} title="Апостроф ʼ" className={btnClass}>
              ʼ
            </button>
            <button type="button" onClick={() => insert('\u2014')} title="Тире —" className={btnClass}>
              —
            </button>
          </>
        )}

        {!compact && (
          <>
            <span className="mx-1 w-px h-4 bg-[#d0dcd0]" />
            <button type="button" onClick={() => wrap('\n- ', '')} title="Маркований список" className={btnClass}>
              • —
            </button>
            <button type="button" onClick={() => wrap('\n1. ', '')} title="Нумерований список" className={btnClass}>
              1.
            </button>
          </>
        )}

        {showTableButton && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTableMenu(s => !s)}
              title="Вставити таблицю"
              className={btnClass}
            >
              ▦
            </button>
            {showTableMenu && (
              <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-[#d0dcd0] rounded-lg shadow-lg p-2 text-xs">
                <div className="font-semibold text-[#445544] mb-1.5">Розмір таблиці:</div>
                <div className="flex flex-col gap-1">
                  {[
                    { r: 3, c: 2, label: '3 × 2' },
                    { r: 4, c: 2, label: '4 × 2' },
                    { r: 5, c: 2, label: '5 × 2' },
                    { r: 3, c: 3, label: '3 × 3' },
                    { r: 5, c: 3, label: '5 × 3' },
                  ].map(({ r, c, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => insertTable(r, c)}
                      className="px-2 py-1 text-left hover:bg-[#f0faf2] rounded text-[#445544]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowTableMenu(false)}
                  className="mt-1.5 text-[10px] text-[#7a9a7a] hover:text-[#445544]"
                >
                  Закрити
                </button>
              </div>
            )}
          </div>
        )}

        {showImageButton && onImageClick && (
          <>
            <span className="mx-1 w-px h-4 bg-[#d0dcd0]" />
            <button type="button" onClick={onImageClick} title="Додати зображення" className={btnClass}>
              🖼
            </button>
          </>
        )}
      </div>

      {/* Текстове поле */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        onKeyDown={e => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault()
            wrap('**')
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault()
            wrap('<em>', '</em>')
          } else if (e.shiftKey && e.key === 'Enter') {
            e.preventDefault()
            insert('  \n')
          }
        }}
        className="w-full px-3 py-2 text-sm font-mono resize-none focus:outline-none bg-white"
      />
    </div>
  )
}