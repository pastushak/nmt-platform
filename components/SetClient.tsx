'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Question, Variant } from '@/lib/types'
import { calculateSetScore, SetAnswerState } from '@/lib/scoring-set'
import Timer from '@/components/ui/Timer'
import SingleQuestionComponent from '@/components/questions/SingleQuestion'
import MatchingQuestionComponent from '@/components/questions/MatchingQuestion'
import OpenQuestionComponent from '@/components/questions/OpenQuestion'
import toast, { Toaster } from 'react-hot-toast'

type Subject = 'math' | 'ukrainian'

interface Props {
  attemptId: string
  startedAt: number
  mathVariant: Variant
  ukrainianVariant: Variant
  mathQuestions: Question[]
  ukrainianQuestions: Question[]
  userId: string
  savedMathAnswers: Record<string, any>
  savedUkrainianAnswers: Record<string, any>
}

function restoreAnswers(saved: Record<string, any>): Record<string, SetAnswerState> {
  return saved ?? {}
}

export default function SetClient({
  attemptId,
  startedAt,
  mathVariant,
  ukrainianVariant,
  mathQuestions,
  ukrainianQuestions,
  userId,
  savedMathAnswers,
  savedUkrainianAnswers,
}: Props) {
  const [activeSubject, setActiveSubject] = useState<Subject>('math')
  const [mathAnswers, setMathAnswers] = useState<Record<string, SetAnswerState>>(
    restoreAnswers(savedMathAnswers)
  )
  const [ukrainianAnswers, setUkrainianAnswers] = useState<Record<string, SetAnswerState>>(
    restoreAnswers(savedUkrainianAnswers)
  )
  const [currentMath, setCurrentMath] = useState(0)
  const [currentUkr, setCurrentUkr] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const supabase = createClient()
  const saveTimer = useRef<NodeJS.Timeout>()

  const questions = activeSubject === 'math' ? mathQuestions : ukrainianQuestions
  const current = activeSubject === 'math' ? currentMath : currentUkr
  const setCurrent = activeSubject === 'math' ? setCurrentMath : setCurrentUkr
  const answers = activeSubject === 'math' ? mathAnswers : ukrainianAnswers

  // Збереження відповідей в БД (debounced для open)
  async function persistAnswers(
    newMath: Record<string, SetAnswerState>,
    newUkr: Record<string, SetAnswerState>
  ) {
    await supabase
      .from('set_attempts')
      .update({
        math_answers: newMath,
        ukrainian_answers: newUkr,
      })
      .eq('id', attemptId)
  }

  function handleSingle(qId: string, value: string) {
    const a: SetAnswerState = { type: 'single', answer_single: value }
    if (activeSubject === 'math') {
      const next = { ...mathAnswers, [qId]: a }
      setMathAnswers(next)
      persistAnswers(next, ukrainianAnswers)
    } else {
      const next = { ...ukrainianAnswers, [qId]: a }
      setUkrainianAnswers(next)
      persistAnswers(mathAnswers, next)
    }
  }

  function handleMatching(qId: string, value: Record<string, string>) {
    const a: SetAnswerState = { type: 'matching', answer_matching: value }
    if (activeSubject === 'math') {
      const next = { ...mathAnswers, [qId]: a }
      setMathAnswers(next)
      persistAnswers(next, ukrainianAnswers)
    } else {
      const next = { ...ukrainianAnswers, [qId]: a }
      setUkrainianAnswers(next)
      persistAnswers(mathAnswers, next)
    }
  }

  function handleOpen(qId: string, value: string) {
    const a: SetAnswerState = { type: 'open', answer_open: value }
    if (activeSubject === 'math') {
      const next = { ...mathAnswers, [qId]: a }
      setMathAnswers(next)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => persistAnswers(next, ukrainianAnswers), 1000)
    }
  }

  function handleWarning(minutesLeft: number) {
    if (minutesLeft === 20) {
      toast('⏰ Залишилось 20 хвилин', {
        duration: 5000,
        style: { background: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', fontWeight: '600' }
      })
    } else if (minutesLeft === 10) {
      toast('⚠️ Залишилось 10 хвилин!', {
        duration: 6000,
        style: { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc02', fontWeight: '700' }
      })
    } else if (minutesLeft === 5) {
      toast('🚨 Залишилось лише 5 хвилин!', {
        duration: 8000,
        style: { background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', fontWeight: '700', fontSize: '15px' }
      })
    }
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setShowConfirm(false)

    const result = calculateSetScore(
      mathQuestions, mathAnswers,
      ukrainianQuestions, ukrainianAnswers
    )

    await supabase
      .from('set_attempts')
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        math_answers: mathAnswers,
        ukrainian_answers: ukrainianAnswers,
        math_score_single: result.math_score_single,
        math_score_matching: result.math_score_matching,
        math_score_open: result.math_score_open,
        math_score_total: result.math_score_total,
        math_nmt_score: result.math_nmt_score,
        ukrainian_score_single: result.ukrainian_score_single,
        ukrainian_score_matching: result.ukrainian_score_matching,
        ukrainian_score_total: result.ukrainian_score_total,
        ukrainian_nmt_score: result.ukrainian_nmt_score,
      })
      .eq('id', attemptId)

    window.location.href = `/set-results/${attemptId}`
  }

  function countAnswered(qs: Question[], ans: Record<string, SetAnswerState>) {
    return qs.filter(q => {
      const a = ans[q.id]
      if (!a) return false
      if (q.type === 'single') return !!a.answer_single
      if (q.type === 'matching') return Object.keys(a.answer_matching ?? {}).length > 0
      if (q.type === 'open') return !!a.answer_open?.trim()
      return false
    }).length
  }

  const mathAnswered = countAnswered(mathQuestions, mathAnswers)
  const ukrAnswered = countAnswered(ukrainianQuestions, ukrainianAnswers)
  const totalAnswered = mathAnswered + ukrAnswered
  const totalQuestions = mathQuestions.length + ukrainianQuestions.length

  const q = questions[current]

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex flex-col">
      <Toaster position="top-center" />

      {/* Шапка */}
      <header className="bg-white border-b border-[#e8ede8] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">

          {/* Рядок 1: назва + лічильник */}
          <div className="flex items-center justify-between gap-2 pt-2.5 pb-1.5">
            <p className="font-semibold text-[#1a2e1a] text-sm truncate flex-1 min-w-0">
              Сет НМТ
            </p>
            <p className="text-xs text-[#7a9a7a] flex-shrink-0">
              відповіді: {totalAnswered}/{totalQuestions}
            </p>
          </div>

          {/* Рядок 2: таймер + перемикач предметів + завершити */}
          <div className="flex gap-2 pb-2">
            <div className="flex-shrink-0">
              <Timer
                startedAt={startedAt}
                timeLimitMin={120}
                onWarning={handleWarning}
              />
            </div>

            {/* Перемикач предметів */}
            <div className="flex rounded-xl border border-[#e8ede8] overflow-hidden flex-1">
              <button
                onClick={() => setActiveSubject('math')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 transition-all ${
                  activeSubject === 'math'
                    ? 'bg-[#0ead69] text-white'
                    : 'bg-white text-[#445544] hover:bg-[#f0faf2]'
                }`}
              >
                📐
                <span className="hidden sm:inline">Математика</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSubject === 'math' ? 'bg-white/20 text-white' : 'bg-[#e8f5e9] text-[#2e7d32]'
                }`}>
                  {mathAnswered}/{mathQuestions.length}
                </span>
              </button>
              <button
                onClick={() => setActiveSubject('ukrainian')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 border-l border-[#e8ede8] transition-all ${
                  activeSubject === 'ukrainian'
                    ? 'bg-[#1565c0] text-white'
                    : 'bg-white text-[#445544] hover:bg-[#e3f2fd]'
                }`}
              >
                🇺🇦
                <span className="hidden sm:inline">Укр. мова</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSubject === 'ukrainian' ? 'bg-white/20 text-white' : 'bg-[#e3f2fd] text-[#1565c0]'
                }`}>
                  {ukrAnswered}/{ukrainianQuestions.length}
                </span>
              </button>
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="flex-shrink-0 btn-primary text-xs px-3"
            >
              {submitting ? '...' : 'Завершити'}
            </button>
          </div>

          {/* Рядок 3: номери питань поточного предмету */}
          <div className="grid grid-cols-8 md:grid-cols-15 lg:grid-cols-19 gap-1.5 pb-2.5">
            {questions.map((question, i) => {
              const a = answers[question.id]
              const hasAnswer = a && (
                (question.type === 'single' && !!a.answer_single) ||
                (question.type === 'matching' && Object.keys(a.answer_matching ?? {}).length > 0) ||
                (question.type === 'open' && !!a.answer_open?.trim())
              )
              return (
                <button
                  key={question.id}
                  onClick={() => setCurrent(i)}
                  className={`h-8 rounded-lg text-xs font-bold transition-all ${
                    i === current
                      ? activeSubject === 'math'
                        ? 'bg-[#0ead69] text-white ring-2 ring-[#0ead69] ring-offset-1'
                        : 'bg-[#1565c0] text-white ring-2 ring-[#1565c0] ring-offset-1'
                      : hasAnswer
                      ? activeSubject === 'math'
                        ? 'bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]'
                        : 'bg-[#e3f2fd] text-[#1565c0] border border-[#bbdefb]'
                      : 'bg-[#f5f7f5] text-[#7a9a7a] border border-[#e8ede8]'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Питання */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {q && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <span className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                activeSubject === 'math' ? 'bg-[#0ead69]' : 'bg-[#1565c0]'
              }`}>
                {q.number}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  activeSubject === 'math'
                    ? 'bg-[#e8f5e9] text-[#2e7d32]'
                    : 'bg-[#e3f2fd] text-[#1565c0]'
                }`}>
                  {q.type === 'single' && 'ОДНА ПРАВИЛЬНА'}
                  {q.type === 'matching' && (activeSubject === 'ukrainian' ? 'ЛОГІЧНІ ПАРИ' : 'ВІДПОВІДНОСТІ')}
                  {q.type === 'open' && 'ВПИСАТИ ВІДПОВІДЬ'}
                </span>
                <span className="badge-warning">
                  {q.type === 'matching'
                    ? activeSubject === 'ukrainian' ? 'до 4 балів' : 'до 3 балів'
                    : q.type === 'open' ? '2 бали' : '1 бал'
                  }
                </span>
                {q.topic && <span className="text-xs text-[#7a9a7a]">{q.topic}</span>}
              </div>
            </div>

            {q.type === 'single' && (
              <SingleQuestionComponent
                question={q as any}
                answer={answers[q.id]?.answer_single ?? null}
                onChange={v => handleSingle(q.id, v)}
              />
            )}
            {q.type === 'matching' && (
              <MatchingQuestionComponent
                question={q as any}
                answer={answers[q.id]?.answer_matching ?? {}}
                onChange={v => handleMatching(q.id, v)}
              />
            )}
            {q.type === 'open' && (
              <OpenQuestionComponent
                question={q as any}
                answer={answers[q.id]?.answer_open ?? ''}
                onChange={v => handleOpen(q.id, v)}
              />
            )}
          </div>
        )}

        <div className="flex justify-between mt-4">
          <button
            onClick={() => setCurrent(p => Math.max(0, p - 1))}
            disabled={current === 0}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            ← Попереднє
          </button>
          <button
            onClick={() => setCurrent(p => Math.min(questions.length - 1, p + 1))}
            disabled={current === questions.length - 1}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Наступне →
          </button>
        </div>
      </main>

      {/* Підтвердження завершення */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1a2e1a] mb-4">Завершити сет?</h3>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#556655]">📐 Математика:</span>
                <span className="font-semibold">{mathAnswered}/{mathQuestions.length} відповідей</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#556655]">🇺🇦 Укр. мова:</span>
                <span className="font-semibold">{ukrAnswered}/{ukrainianQuestions.length} відповідей</span>
              </div>
            </div>
            {totalAnswered < totalQuestions && (
              <p className="text-sm text-[#f57f17] mb-4">
                ⚠️ {totalQuestions - totalAnswered} питань без відповіді
              </p>
            )}
            <p className="text-xs text-[#7a9a7a] mb-5">
              Після завершення зміни неможливі.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary flex-1"
              >
                Продовжити
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary flex-1"
              >
                Так, завершити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}