'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MAX_SCORES } from '@/lib/scoring'
import SingleQuestionComponent from '@/components/questions/SingleQuestion'
import MatchingQuestionComponent from '@/components/questions/MatchingQuestion'
import OpenQuestionComponent from '@/components/questions/OpenQuestion'
import MarkdownMath from '@/components/ui/MarkdownMath'

const MAX_EXPLAINS = 3

function ExplainButton({ question, answer, explainCount, onExplain }: {
  question: any
  answer: any
  explainCount: number
  onExplain: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)

  async function handleExplain() {
    setLoading(true)
    onExplain()
    try {
      const userAnswer = question.type === 'single'
        ? (answer?.answer_single ?? 'не відповів')
        : question.type === 'open'
        ? (answer?.answer_open ?? 'не відповів')
        : JSON.stringify(answer?.answer_matching ?? {})

      const correctAnswer = question.type === 'single'
        ? question.correct_single
        : question.type === 'open'
        ? question.correct_open
        : JSON.stringify(question.correct_matching)

      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: question.text,
          questionType: question.type,
          userAnswer,
          correctAnswer,
        }),
      })
      const data = await res.json()
      setExplanation(data.explanation)
    } catch {
      setExplanation('Помилка. Спробуй ще раз.')
    }
    setLoading(false)
  }

  return (
    <div className="mt-4">
      {!explanation ? (
        explainCount >= MAX_EXPLAINS ? (
          <div className="text-xs text-[#9a8aaa] italic">
            ✋ Ліміт пояснень вичерпано ({MAX_EXPLAINS}/{MAX_EXPLAINS})
          </div>
        ) : (
          <button
            onClick={handleExplain}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#f0f0ff] text-[#4E3064] border border-[#d0c0e0] rounded-xl text-sm font-medium hover:bg-[#e8e0f5] transition-colors disabled:opacity-50"
          >
            {loading ? '⏳ Аналізую...' : `🤖 Пояснити помилку (залишилось ${MAX_EXPLAINS - explainCount})`}
          </button>
        )
      ) : (
        <div className="bg-[#f8f5ff] border border-[#d0c0e0] rounded-xl p-4 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-[#4E3064]">🤖 AI пояснення</span>
            <button
              onClick={() => setExplanation(null)}
              className="ml-auto text-xs text-[#9a8aaa] hover:text-[#4E3064]"
            >
              ✕
            </button>
          </div>
          <MarkdownMath text={explanation} />
        </div>
      )}
    </div>
  )
}

export default function ResultsClient({ attempt, questions, answers }: any) {
  const [explainCount, setExplainCount] = useState(0)

  const answerMap = Object.fromEntries(answers.map((a: any) => [a.question_id, a]))
  const nmtScore = attempt.nmt_score
  const total = attempt.score_total
  const percent = Math.round((total / MAX_SCORES.total) * 100)

  const nmtColor = !nmtScore ? 'text-[#7a9a7a]'
    : nmtScore >= 180 ? 'text-[#2e7d32]'
    : nmtScore >= 150 ? 'text-[#0ead69]'
    : nmtScore >= 130 ? 'text-[#f57f17]'
    : 'text-red-500'

  return (
    <div className="min-h-screen bg-[#f5f7f5]">

      <header className="bg-white border-b border-[#e8ede8] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/tests" className="text-sm text-[#7a9a7a] hover:text-[#1a2e1a] transition-colors">
            ← До тестів
          </Link>
          <h1 className="font-bold text-[#1a2e1a]">Результати тесту</h1>
          <Link href="/stats" className="text-sm text-[#0ead69] font-semibold hover:text-[#0c9a5a]">
            Статистика →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Загальний результат */}
        <div className="bg-gradient-to-br from-[#f0faf2] to-[#e8f5ff] rounded-2xl border border-[#e8ede8] p-8 text-center">
          <p className="text-sm text-[#7a9a7a] font-medium mb-2">{attempt.variants?.title}</p>
          <div className={`text-7xl font-black my-4 tracking-tight ${nmtColor}`}>
            {nmtScore ?? '—'}
          </div>
          <p className="text-[#7a9a7a] text-sm mb-6">
            {nmtScore ? 'балів НМТ · шкала 100–200' : 'Нижче порогового балу (менше 5 тестових балів)'}
          </p>
          <div className="max-w-sm mx-auto mb-2">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-[#7a9a7a]">Тестовий бал</span>
              <span className="font-bold text-[#1a2e1a]">{total} / {MAX_SCORES.total}</span>
            </div>
            <div className="h-3 bg-white rounded-full border border-[#e8ede8] overflow-hidden">
              <div
                className="h-full bg-[#0ead69] rounded-full transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Розбір питань */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1a2e1a] text-lg">📋 Розбір відповідей</h3>
            <span className="text-xs text-[#9a8aaa]">
              AI пояснень: {explainCount}/{MAX_EXPLAINS}
            </span>
          </div>
          <div className="space-y-4">
            {questions.map((question: any) => {
              const answer = answerMap[question.id]
              const score = answer?.score ?? 0
              const maxScore = question.type === 'matching' ? 3 : question.type === 'open' ? 2 : 1
              const isCorrect = score === maxScore

              return (
                <div key={question.id} className={`card border-l-4 ${
                  isCorrect ? 'border-l-[#0ead69]' :
                  score > 0 ? 'border-l-[#f57f17]' : 'border-l-red-400'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#f5f7f5] flex items-center justify-center text-sm font-bold text-[#556655]">
                        {question.number}
                      </span>
                      <span className="text-xs text-[#7a9a7a] font-medium">
                        {question.type === 'single' && 'Вибір відповіді'}
                        {question.type === 'matching' && 'Відповідності'}
                        {question.type === 'open' && 'Вписати відповідь'}
                      </span>
                    </div>
                    <span className={`font-bold text-lg ${
                      isCorrect ? 'text-[#0ead69]' :
                      score > 0 ? 'text-[#f57f17]' : 'text-red-500'
                    }`}>
                      {score}/{maxScore}
                    </span>
                  </div>

                  {question.type === 'single' && (
                    <SingleQuestionComponent
                      question={question}
                      answer={answer?.answer_single ?? null}
                      onChange={() => {}}
                      showResult
                    />
                  )}
                  {question.type === 'matching' && (
                    <MatchingQuestionComponent
                      question={question}
                      answer={answer?.answer_matching ?? {}}
                      onChange={() => {}}
                      showResult
                    />
                  )}
                  {question.type === 'open' && (
                    <OpenQuestionComponent
                      question={question}
                      answer={answer?.answer_open ?? ''}
                      onChange={() => {}}
                      showResult
                      isCorrect={isCorrect}
                    />
                  )}

                  {!isCorrect && (
                    <ExplainButton
                      question={question}
                      answer={answer}
                      explainCount={explainCount}
                      onExplain={() => setExplainCount(c => c + 1)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-4 justify-center pb-8">
          <Link href={`/test/${attempt.variant_id}`} className="btn-secondary">
            🔄 Пройти знову
          </Link>
          <Link href="/tests" className="btn-primary">
            Інші тести →
          </Link>
        </div>
      </main>
    </div>
  )
}