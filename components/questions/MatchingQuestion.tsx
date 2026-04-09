'use client'

import { useState } from 'react'
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
  const [selected, setSelected] = useState<{ side: 'left' | 'right'; id: string } | null>(null)

  function handleLeft(leftId: string) {
    if (showResult) return
    if (answer[leftId] !== undefined) {
      // вже спарений — знімаємо пару і вибираємо
      const next = { ...answer }
      delete next[leftId]
      onChange(next)
      setSelected({ side: 'left', id: leftId })
      return
    }
    if (selected?.side === 'left' && selected.id === leftId) {
      setSelected(null)
      return
    }
    setSelected({ side: 'left', id: leftId })
  }

  function handleRight(rightId: string) {
    if (showResult) return
    if (!selected) {
      setSelected({ side: 'right', id: rightId })
      return
    }
    if (selected.side === 'left') {
      const next = { ...answer }
      // якщо правий вже зайнятий іншим — знімаємо
      const prevLeft = Object.entries(next).find(([, v]) => v === rightId)
      if (prevLeft) delete next[prevLeft[0]]
      next[selected.id] = rightId
      onChange(next)
      setSelected(null)
    } else {
      // обидва праві — перемикаємо вибір
      setSelected(selected.id === rightId ? null : { side: 'right', id: rightId })
    }
  }

  function removePair(leftId: string) {
    if (showResult) return
    const next = { ...answer }
    delete next[leftId]
    onChange(next)
    setSelected(null)
  }

  function isPairedLeft(id: string) { return answer[id] !== undefined }
  function isPairedRight(id: string) { return Object.values(answer).includes(id) }

  function leftStyle(id: string) {
    const isSelected = selected?.side === 'left' && selected.id === id
    const isPaired = isPairedLeft(id)
    if (isSelected) return 'border-[#0ead69] bg-[#0ead69] text-white'
    if (isPaired) return 'border-[#c8e6c9] bg-[#f0faf2] text-[#2e7d32] opacity-80'
    return 'border-[#e8ede8] bg-white text-[#1a2e1a] hover:border-[#0ead69]/50'
  }

  function rightStyle(id: string) {
    const isSelected = selected?.side === 'right' && selected.id === id
    const isPaired = isPairedRight(id)
    if (showResult) {
      const leftId = Object.entries(answer).find(([, v]) => v === id)?.[0]
      const isCorrect = leftId && question.correct_matching[leftId] === id
      const isWrong = leftId && question.correct_matching[leftId] !== id
      if (isCorrect) return 'border-[#0ead69] bg-[#f0faf2] text-[#2e7d32]'
      if (isWrong) return 'border-red-400 bg-red-50 text-red-600'
      const isCorrectAnswer = Object.entries(question.correct_matching).some(([, v]) => v === id)
      if (isCorrectAnswer) return 'border-[#0ead69] bg-[#f0faf2] text-[#2e7d32]'
      return 'border-[#e8ede8] bg-white text-[#aec5ae] opacity-50'
    }
    if (isSelected) return 'border-[#0ead69] bg-[#0ead69] text-white'
    if (isPaired) return 'border-[#c8e6c9] bg-[#f0faf2] text-[#2e7d32] opacity-80'
    return 'border-[#e8ede8] bg-white text-[#1a2e1a] hover:border-[#0ead69]/50'
  }

  return (
    <div className="space-y-4">
      <MathText text={question.text} className="text-[#1a2e1a] text-base" />

      {question.image_url && <ImageViewer url={question.image_url} />}

      {!showResult && (
        <p className="text-xs text-[#7a9a7a] italic">
          {!selected
            ? 'Оберіть твердження зліва, потім відповідь справа'
            : selected.side === 'left'
            ? '✓ Тепер оберіть відповідь справа'
            : '✓ Тепер оберіть твердження зліва'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Ліва колонка */}
        <div className="flex flex-col gap-2">
          {question.left_items.map(item => (
            <button
              key={item.id}
              onClick={() => handleLeft(item.id)}
              disabled={showResult}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all text-sm font-medium ${leftStyle(item.id)}`}
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                selected?.side === 'left' && selected.id === item.id
                  ? 'bg-white/30 text-white'
                  : isPairedLeft(item.id)
                  ? 'bg-[#0ead69]/20 text-[#0ead69]'
                  : 'bg-[#0ead69]/10 text-[#0ead69]'
              }`}>
                {item.id}
              </span>
              <MathText text={item.text} className="leading-tight" />
            </button>
          ))}
        </div>

        {/* Права колонка */}
        <div className="flex flex-col gap-2">
          {question.right_items.map(item => (
            <button
              key={item.id}
              onClick={() => handleRight(item.id)}
              disabled={showResult}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all text-sm font-medium ${rightStyle(item.id)}`}
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                selected?.side === 'right' && selected.id === item.id
                  ? 'bg-white/30 text-white'
                  : 'bg-[#f5f7f5] text-[#556655]'
              }`}>
                {item.id}
              </span>
              <MathText text={item.text} className="leading-tight" />
            </button>
          ))}
        </div>
      </div>

      {/* Обрані пари */}
      {!showResult && Object.keys(answer).length > 0 && (
        <div className="p-3 bg-[#f8faf8] rounded-xl border border-[#e8ede8]">
          <p className="text-xs text-[#7a9a7a] mb-2 font-medium">Обрані пари — клікни щоб скасувати:</p>
          <div className="flex flex-wrap gap-2">
            {question.left_items
              .filter(l => answer[l.id])
              .map(l => (
                <button
                  key={l.id}
                  onClick={() => removePair(l.id)}
                  className="group inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#e8ede8] rounded-full text-sm font-medium text-[#1a2e1a] hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                >
                  <span>{l.id} → {answer[l.id]}</span>
                  <span className="text-[#aec5ae] group-hover:text-red-400 text-base leading-none">×</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Результат */}
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