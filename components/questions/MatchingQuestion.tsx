'use client'

import { MatchingQuestion } from '@/lib/types'
import MathText from '@/components/ui/MathText'
import ImageViewer from '@/components/ui/ImageViewer'

interface Props {
  question: MatchingQuestion
  answer: Record<string, string>
  onChange: (answer: Record<string, string>) => void
  showResult?: boolean
}

export default function MatchingQuestionComponent({ question, answer, onChange, showResult = false }: Props) {
  function handleSelect(leftId: string, rightId: string) {
    if (showResult) return
    const next = { ...answer }
    if (next[leftId] === rightId) delete next[leftId]
    else next[leftId] = rightId
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <MathText text={question.text} className="text-[#1a2e1a] text-base" />

      {question.image_url && (
        <ImageViewer url={question.image_url} />
      )}

      <p className="text-xs text-[#7a9a7a] italic">
        Для кожного пункту лівого стовпця оберіть відповідний варіант з правого
      </p>

      <div className="space-y-3">
        {question.left_items.map(left => (
          <div key={left.id} className="border border-[#e8ede8] rounded-xl overflow-hidden">
            <div className="bg-[#f8faf8] px-4 py-3 flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-[#0ead69] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {left.id}
              </span>
              <MathText text={left.text} className="text-sm text-[#1a2e1a]" />
            </div>
            <div className="p-3 grid grid-cols-5 gap-2">
              {question.right_items.map(right => {
                const isSelected = answer[left.id] === right.id
                const isCorrect = question.correct_matching[left.id] === right.id

                let cls = 'flex flex-col items-center gap-1 p-2 rounded-xl border-2 cursor-pointer transition-all text-center '
                if (showResult) {
                  if (isCorrect) cls += 'border-[#0ead69] bg-[#f0faf2]'
                  else if (isSelected) cls += 'border-red-400 bg-red-50'
                  else cls += 'border-[#e8ede8] opacity-40'
                } else {
                  if (isSelected) cls += 'border-[#0ead69] bg-[#f0faf2]'
                  else cls += 'border-[#e8ede8] hover:border-[#0ead69]/50'
                }

                return (
                  <div key={right.id} className={cls} onClick={() => handleSelect(left.id, right.id)}>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      showResult && isCorrect ? 'bg-[#0ead69] text-white' :
                      showResult && isSelected ? 'bg-red-400 text-white' :
                      isSelected ? 'bg-[#0ead69] text-white' :
                      'bg-[#f5f5f5] text-[#556655]'
                    }`}>{right.id}</span>
                    <MathText text={right.text} className="text-xs leading-tight" />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {showResult && (
        <div className="text-sm bg-[#f0faf2] border border-[#c8e6c9] rounded-xl p-3">
          <span className="font-semibold text-[#2e7d32]">Правильні відповіді: </span>
          <span className="text-[#2e7d32]">
            {question.left_items.map(i => `${i.id}→${question.correct_matching[i.id]}`).join(', ')}
          </span>
        </div>
      )}
    </div>
  )
}
