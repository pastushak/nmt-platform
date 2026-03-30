'use client'

import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathTextProps {
  text: string
  className?: string
}

export default function MathText({ text, className = '' }: MathTextProps) {
  const parts = text.split(/(\$\$[^$]+\$\$)/g)

  const rendered = parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const latex = part.slice(2, -2)
      try {
        const html = katex.renderToString(latex, {
          displayMode: false,
          throwOnError: false,
        })
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: html }}
            className="inline-block mx-0.5"
          />
        )
      } catch {
        return <span key={i} className="text-red-500 text-xs">[формула]</span>
      }
    }
    return <span key={i}>{part}</span>
  })

  return <div className={`leading-relaxed ${className}`}>{rendered}</div>
}
