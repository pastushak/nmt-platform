'use client'

import { SingleQuestion } from '@/lib/types'
import MathText from '@/components/ui/MathText'
import ImageViewer from '@/components/ui/ImageViewer'

const OPTIONS = ['А', 'Б', 'В', 'Г', 'Д'] as const

interface Props {
  question: SingleQuestion
  answer: string | null
  onChange: (answer: string) => void
  showResult?: boolean
}

export default function SingleQuestionComponent({ question, answer, onChange, showResult = false }: Props) {
  return (
    <div className="space-y-4">
      <MathText text={question.text} className="text-[#1a2e1a] text-base leading-relaxed" />

      {question.image_url && (
        <ImageViewer url={question.image_url} />
      )}

      <div className="space-y-2 mt-2">
        {OPTIONS.map(opt => {
          const isSelected = answer === opt
          const isCorrect = question.correct_single === opt

          let cls = 'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all '
          if (showResult) {
            if (isCorrect) cls += 'border-[#0ead69] bg-[#f0faf2]'
            else if (isSelected && !isCorrect) cls += 'border-red-400 bg-red-50'
            else cls += 'border-[#e8ede8] opacity-50'
          } else {
            if (isSelected) cls += 'border-[#0ead69] bg-[#f0faf2]'
            else cls += 'border-[#e8ede8] hover:border-[#0ead69]/50 hover:bg-[#f8fef9]'
          }

          return (
            <div key={opt} className={cls} onClick={() => !showResult && onChange(opt)}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                showResult && isCorrect ? 'bg-[#0ead69] text-white' :
                showResult && isSelected && !isCorrect ? 'bg-red-400 text-white' :
                isSelected ? 'bg-[#0ead69] text-white' :
                'bg-[#f5f7f5] text-[#556655]'
              }`}>{opt}</span>
              <div className="flex-1">
                <MathText text={question.options[opt]} className="text-sm text-[#2a3a2a]" />
              </div>
              {showResult && isCorrect && <span className="text-[#0ead69] font-bold">✓</span>}
              {showResult && isSelected && !isCorrect && <span className="text-red-500 font-bold">✗</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
