'use client'

import Link from 'next/link'
import { MAX_SCORES } from '@/lib/scoring'
import SingleQuestionComponent from '@/components/questions/SingleQuestion'
import MatchingQuestionComponent from '@/components/questions/MatchingQuestion'
import OpenQuestionComponent from '@/components/questions/OpenQuestion'

export default function ResultsClient({ attempt, questions, answers }: any) {
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

      {/* Хедер */}
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

          {/* Прогрес бар */}
          <div className="max-w-sm mx-auto mb-6">
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

          {/* Блоки балів */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            {[
              { label: 'Вибір відповіді', score: attempt.score_single, max: MAX_SCORES.single },
              { label: 'Відповідності', score: attempt.score_matching, max: MAX_SCORES.matching },
              { label: 'Вписати відповідь', score: attempt.score_open, max: MAX_SCORES.open },
            ].map(({ label, score, max }) => (
              <div key={label} className="bg-white rounded-xl border border-[#e8ede8] p-4">
                <div className="text-2xl font-bold text-[#1a2e1a]">
                  {score}<span className="text-base font-normal text-[#aec5ae]">/{max}</span>
                </div>
                <div className="text-xs text-[#7a9a7a] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Розбір питань */}
        <div>
          <h3 className="font-bold text-[#1a2e1a] mb-4 text-lg">📋 Розбір відповідей</h3>
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
                </div>
              )
            })}
          </div>
        </div>

        {/* Дії */}
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