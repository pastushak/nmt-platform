'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MAX_SCORES } from '@/lib/scoring'
import { UKRAINIAN_MAX_SCORE } from '@/lib/scoring-ukrainian'
import SingleQuestionComponent from '@/components/questions/SingleQuestion'
import MatchingQuestionComponent from '@/components/questions/MatchingQuestion'
import OpenQuestionComponent from '@/components/questions/OpenQuestion'

type Subject = 'math' | 'ukrainian'

interface Props {
  attempt: any
  mathQuestions: any[]
  ukrainianQuestions: any[]
  mathVariantTitle: string
  ukrainianVariantTitle: string
  durationMin: number | null
}

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-[#7a9a7a]">—</span>
  const color = score >= 180 ? 'text-[#2e7d32]'
    : score >= 150 ? 'text-[#0ead69]'
    : score >= 130 ? 'text-[#f57f17]'
    : 'text-red-500'
  return <span className={`font-black ${color}`}>{score}</span>
}

export default function SetResultsClient({
  attempt,
  mathQuestions,
  ukrainianQuestions,
  mathVariantTitle,
  ukrainianVariantTitle,
  durationMin,
}: Props) {
  const [activeTab, setActiveTab] = useState<Subject>('math')

  const mathAnswers: Record<string, any> = attempt.math_answers ?? {}
  const ukrainianAnswers: Record<string, any> = attempt.ukrainian_answers ?? {}

  const durationStr = durationMin != null
    ? durationMin < 60
      ? `${durationMin} хв`
      : `${Math.floor(durationMin / 60)} год ${durationMin % 60} хв`
    : null

  const mathPct = Math.round((attempt.math_score_total / MAX_SCORES.total) * 100)
  const ukrPct = Math.round((attempt.ukrainian_score_total / UKRAINIAN_MAX_SCORE) * 100)

  const questions = activeTab === 'math' ? mathQuestions : ukrainianQuestions
  const answers = activeTab === 'math' ? mathAnswers : ukrainianAnswers

  function getScore(q: any, a: any): { score: number; maxScore: number } {
    if (q.type === 'single') return { score: a?.score ?? 0, maxScore: 1 }
    if (q.type === 'open') return { score: a?.score ?? 0, maxScore: 2 }
    if (q.type === 'matching') {
      const maxScore = activeTab === 'ukrainian' ? 4 : 3
      return { score: a?.score ?? 0, maxScore }
    }
    return { score: 0, maxScore: 1 }
  }

  // Рахуємо бали вручну з відповідей
  function calcAnswerScore(q: any, answerData: any): number {
    if (!answerData) return 0
    if (q.type === 'single') {
      return answerData.answer_single === q.correct_single ? 1 : 0
    }
    if (q.type === 'open') {
      if (!answerData.answer_open) return 0
      const norm = (s: string) => s.trim().toLowerCase().replace(',', '.')
      return (q.accepted_answers ?? []).map(norm).includes(norm(answerData.answer_open)) ? 2 : 0
    }
    if (q.type === 'matching') {
      const ans = answerData.answer_matching ?? {}
      return Object.keys(q.correct_matching ?? {}).filter(k => ans[k] === q.correct_matching[k]).length
    }
    return 0
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <header className="bg-white border-b border-[#e8ede8] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/set" className="text-sm text-[#7a9a7a] hover:text-[#1a2e1a] transition-colors">
            ← До сету
          </Link>
          <h1 className="font-bold text-[#1a2e1a]">Результати сету НМТ</h1>
          <Link href="/stats" className="text-sm text-[#0ead69] font-semibold hover:text-[#0c9a5a]">
            Статистика →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Загальний результат */}
        <div className="bg-gradient-to-br from-[#f0faf2] to-[#e8f5ff] rounded-2xl border border-[#e8ede8] p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Математика */}
            <div className="text-center">
              <p className="text-xs text-[#7a9a7a] font-medium mb-1">📐 Математика</p>
              <p className="text-xs text-[#aec5ae] mb-2">{mathVariantTitle}</p>
              <div className="text-5xl font-black my-2">
                <ScoreBadge score={attempt.math_nmt_score} />
              </div>
              <p className="text-xs text-[#7a9a7a]">
                {attempt.math_nmt_score ? 'балів НМТ' : 'Нижче порогу'}
              </p>
              <div className="mt-3 max-w-[160px] mx-auto">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#7a9a7a]">Тестовий</span>
                  <span className="font-bold">{attempt.math_score_total}/{MAX_SCORES.total}</span>
                </div>
                <div className="h-2 bg-white rounded-full border border-[#e8ede8] overflow-hidden">
                  <div className="h-full bg-[#0ead69] rounded-full" style={{ width: `${mathPct}%` }} />
                </div>
              </div>
            </div>

            {/* Укр. мова */}
            <div className="text-center">
              <p className="text-xs text-[#7a9a7a] font-medium mb-1">🇺🇦 Укр. мова</p>
              <p className="text-xs text-[#aec5ae] mb-2">{ukrainianVariantTitle}</p>
              <div className="text-5xl font-black my-2">
                <ScoreBadge score={attempt.ukrainian_nmt_score} />
              </div>
              <p className="text-xs text-[#7a9a7a]">
                {attempt.ukrainian_nmt_score ? 'балів НМТ' : 'Нижче порогу'}
              </p>
              <div className="mt-3 max-w-[160px] mx-auto">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#7a9a7a]">Тестовий</span>
                  <span className="font-bold">{attempt.ukrainian_score_total}/{UKRAINIAN_MAX_SCORE}</span>
                </div>
                <div className="h-2 bg-white rounded-full border border-[#e8ede8] overflow-hidden">
                  <div className="h-full bg-[#1565c0] rounded-full" style={{ width: `${ukrPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Детальні бали */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e8ede8]">
            <div className="text-xs text-[#7a9a7a] space-y-1">
              <div className="flex justify-between">
                <span>Вибір відповіді:</span>
                <span className="font-semibold text-[#1a2e1a]">{attempt.math_score_single}/15</span>
              </div>
              <div className="flex justify-between">
                <span>Відповідності:</span>
                <span className="font-semibold text-[#1a2e1a]">{attempt.math_score_matching}/9</span>
              </div>
              <div className="flex justify-between">
                <span>Вписати:</span>
                <span className="font-semibold text-[#1a2e1a]">{attempt.math_score_open}/8</span>
              </div>
            </div>
            <div className="text-xs text-[#7a9a7a] space-y-1">
              <div className="flex justify-between">
                <span>Вибір відповіді:</span>
                <span className="font-semibold text-[#1a2e1a]">{attempt.ukrainian_score_single}/25</span>
              </div>
              <div className="flex justify-between">
                <span>Логічні пари:</span>
                <span className="font-semibold text-[#1a2e1a]">{attempt.ukrainian_score_matching}/20</span>
              </div>
            </div>
          </div>

          {durationStr && (
            <p className="text-sm text-[#7a9a7a] text-center mt-3">
              ⏱ Час виконання: <span className="font-semibold text-[#1a2e1a]">{durationStr}</span>
            </p>
          )}
        </div>

        {/* Перемикач предмету для розбору */}
        <div className="flex rounded-2xl border border-[#e8ede8] bg-white overflow-hidden">
          <button
            onClick={() => setActiveTab('math')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              activeTab === 'math' ? 'bg-[#0ead69] text-white' : 'text-[#556655] hover:bg-[#f0faf2]'
            }`}
          >
            📐 Математика
          </button>
          <button
            onClick={() => setActiveTab('ukrainian')}
            className={`flex-1 py-3 text-sm font-semibold border-l border-[#e8ede8] transition-all ${
              activeTab === 'ukrainian' ? 'bg-[#1565c0] text-white' : 'text-[#556655] hover:bg-[#e3f2fd]'
            }`}
          >
            🇺🇦 Укр. мова
          </button>
        </div>

        {/* Розбір відповідей */}
        <div>
          <h3 className="font-bold text-[#1a2e1a] text-lg mb-4">📋 Розбір відповідей</h3>
          <div className="space-y-4">
            {questions.map((question: any) => {
              const answerData = answers[question.id]
              const score = calcAnswerScore(question, answerData)
              const maxScore = question.type === 'matching'
                ? (activeTab === 'ukrainian' ? 4 : 3)
                : question.type === 'open' ? 2 : 1
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
                        {question.type === 'matching' && (activeTab === 'ukrainian' ? 'Логічні пари' : 'Відповідності')}
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
                      answer={answerData?.answer_single ?? null}
                      onChange={() => {}}
                      showResult
                    />
                  )}
                  {question.type === 'matching' && (
                    <MatchingQuestionComponent
                      question={question}
                      answer={answerData?.answer_matching ?? {}}
                      onChange={() => {}}
                      showResult
                    />
                  )}
                  {question.type === 'open' && (
                    <OpenQuestionComponent
                      question={question}
                      answer={answerData?.answer_open ?? ''}
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

        <div className="flex gap-4 justify-center pb-8">
          <Link href="/set" className="btn-secondary">
            🔄 Новий сет
          </Link>
          <Link href="/tests" className="btn-primary">
            До тестів →
          </Link>
        </div>
      </main>
    </div>
  )
}