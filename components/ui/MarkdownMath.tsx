'use client'

import katex from 'katex'
import 'katex/dist/katex.min.css'

export default function MarkdownMath({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-2" />

        const parts = line.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)

        const rendered = parts.map((part, j) => {
          const isDisplay = part.startsWith('$$') && part.endsWith('$$')
          const isInline = !isDisplay && part.startsWith('$') && part.endsWith('$')

          if (isDisplay || isInline) {
            const latex = part.slice(isDisplay ? 2 : 1, isDisplay ? -2 : -1)
            try {
              const html = katex.renderToString(latex, {
                displayMode: isDisplay,
                throwOnError: false
              })
              return <span key={j} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5" />
            } catch {
              return <span key={j} className="text-red-500 text-xs">[формула]</span>
            }
          }

          const formatted = part
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^##\s+(.+)/, '<span class="font-bold text-base">$1</span>')
            .replace(/^###\s+(.+)/, '<span class="font-semibold">$1</span>')

          return <span key={j} dangerouslySetInnerHTML={{ __html: formatted }} />
        })

        return <p key={i} className="text-sm text-[#3a2a4a]">{rendered}</p>
      })}
    </div>
  )
}