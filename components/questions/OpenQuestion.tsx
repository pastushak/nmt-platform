'use client'

import { OpenQuestion } from '@/lib/types'
import MathText from '@/components/ui/ui/MathText'

interface Props {
  question: OpenQuestion
  answer: string
  onChange: (answer: string) => void
  showResult?: boolean
  isCorrect?: boolean
}

export default function OpenQuestionComponent({ question, answer, onChange, showResult = false, isCorrect = false }: Props) {
  return (
    <div className="space-y-4">
      <MathText text={question.text} className="text-[#1a2e1a] text-base" />

      {question.image_url && (
        <img src={question.image_url} alt="" className="max-w-full rounded-xl border border-[#e8ede8]" />
      )}

      <div>
        <label className="block text-sm font-medium text-[#445544] mb-2">Ваша відповідь:</label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={answer}
            onChange={e => !showResult && onChange(e.target.value)}
            disabled={showResult}
            placeholder="Введіть відповідь (наприклад: 3.5)"
            className={`input max-w-xs font-mono ${
              showResult && isCorrect ? 'border-[#0ead69] bg-[#f0faf2]' :
              showResult && !isCorrect && answer ? 'border-red-400 bg-red-50' : ''
            }`}
          />
          {showResult && isCorrect && <span className="text-[#0ead69] text-xl font-bold">✓</span>}
          {showResult && !isCorrect && answer && <span className="text-red-500 text-xl font-bold">✗</span>}
        </div>

        {!showResult && (
          <p className="text-xs text-[#aec5ae] mt-1.5">
            Дріб можна записати через / або у десятковому вигляді
          </p>
        )}

        {showResult && (
          <div className={`mt-3 p-3 rounded-xl text-sm ${
            isCorrect ? 'bg-[#f0faf2] border border-[#c8e6c9]' : 'bg-red-50 border border-red-200'
          }`}>
            {!isCorrect && answer && (
              <p className="text-red-700 mb-1">
                <span className="font-medium">Ваша відповідь:</span> {answer}
              </p>
            )}
            {!isCorrect && !answer && (
              <p className="text-[#7a9a7a]">Відповідь не надана</p>
            )}
            <p className={isCorrect ? 'text-[#2e7d32]' : 'text-red-700'}>
              <span className="font-medium">Правильна відповідь:</span> {question.correct_open}
              {question.accepted_answers.length > 1 && (
                <span className="text-[#7a9a7a] ml-1">
                  (або: {question.accepted_answers.filter(a => a !== question.correct_open).join(', ')})
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}