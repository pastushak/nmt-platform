'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Question, Variant } from '@/lib/types'
import { calculateAttemptScore } from '@/lib/scoring'
import Timer from '@/components/ui/Timer'
import MathText from '@/components/ui/MathText'
import SingleQuestionComponent from '@/components/questions/SingleQuestion'
import MatchingQuestionComponent from '@/components/questions/MatchingQuestion'
import OpenQuestionComponent from '@/components/questions/OpenQuestion'
import toast, { Toaster } from 'react-hot-toast'

interface Props {
  variant: Variant
  questions: Question[]
  userId: string
}

type AnswerState = {
  type: string
  answer_single?: string
  answer_matching?: Record<string, string>
  answer_open?: string
}

export default function TestClient({ variant, questions, userId }: Props) {
  const router = useRouter()
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number>(Date.now())
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [current, setCurrent] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const supabase = createClient()
  const saveTimer = useRef<NodeJS.Timeout>()

  // Створюємо спробу
  useEffect(() => {
    async function createAttempt() {
      const { data } = await supabase
        .from('attempts')
        .insert({
          student_id: userId,
          variant_id: variant.id,
          started_at: new Date().toISOString(),
          status: 'in_progress',
        })
        .select('id')
        .single()
      if (data) {
        setAttemptId(data.id)
        setStartedAt(Date.now())
      }
    }
    createAttempt()
  }, [])

  // Збереження відповіді
  const saveAnswer = useCallback(async (questionId: string, answerData: AnswerState) => {
    if (!attemptId) return
    await supabase.from('answers').upsert({
      attempt_id: attemptId,
      question_id: questionId,
      question_type: answerData.type,
      answer_single: answerData.answer_single ?? null,
      answer_matching: answerData.answer_matching ?? null,
      answer_open: answerData.answer_open ?? null,
      score: 0,
    }, { onConflict: 'attempt_id,question_id' })
  }, [attemptId, supabase])

  function handleSingle(qId: string, value: string) {
    const a: AnswerState = { type: 'single', answer_single: value }
    setAnswers(prev => ({ ...prev, [qId]: a }))
    saveAnswer(qId, a)
  }

  function handleMatching(qId: string, value: Record<string, string>) {
    const a: AnswerState = { type: 'matching', answer_matching: value }
    setAnswers(prev => ({ ...prev, [qId]: a }))
    saveAnswer(qId, a)
  }

  function handleOpen(qId: string, value: string) {
    const a: AnswerState = { type: 'open', answer_open: value }
    setAnswers(prev => ({ ...prev, [qId]: a }))
    // Зберігаємо через 1 секунду після зупинки друку
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveAnswer(qId, a), 1000)
  }

  // Сповіщення таймера
  function handleWarning(minutesLeft: number) {
    if (minutesLeft === 10) {
      toast('⏰ Залишилось 10 хвилин', {
        duration: 5000,
        style: { background: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', fontWeight: '600' }
      })
    } else if (minutesLeft === 5) {
      toast('⚠️ Залишилось 5 хвилин!', {
        duration: 6000,
        style: { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc02', fontWeight: '700' }
      })
    } else if (minutesLeft === 3) {
      toast('🚨 Залишилось лише 3 хвилини!', {
        duration: 8000,
        style: { background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', fontWeight: '700', fontSize: '15px' }
      })
    }
  }

  // Завершення спроби
  async function handleSubmit() {
    if (!attemptId || submitting) return
    setSubmitting(true)
    setShowConfirm(false)

    const result = calculateAttemptScore(questions, answers)

    for (const q of questions) {
      const a = answers[q.id]
      await supabase.from('answers').upsert({
        attempt_id: attemptId,
        question_id: q.id,
        question_type: q.type,
        answer_single: a?.answer_single ?? null,
        answer_matching: a?.answer_matching ?? null,
        answer_open: a?.answer_open ?? null,
        score: result.answerScores[q.id] ?? 0,
      }, { onConflict: 'attempt_id,question_id' })
    }

    await supabase.from('attempts').update({
      status: 'done',
      finished_at: new Date().toISOString(),
      score_single: result.score_single,
      score_matching: result.score_matching,
      score_open: result.score_open,
      score_total: result.score_total,
      nmt_score: result.nmt_score,
    }).eq('id', attemptId)

    router.push(`/results/${attemptId}`)
  }

  // Кількість відповідей
  const answeredCount = questions.filter(q => {
    const a = answers[q.id]
    if (!a) return false
    if (q.type === 'single') return !!a.answer_single
    if (q.type === 'matching') return Object.keys(a.answer_matching ?? {}).length > 0
    if (q.type === 'open') return !!a.answer_open?.trim()
    return false
  }).length

  const q = questions[current]

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex flex-col">
      <Toaster position="top-center" />

      {/* Шапка тесту */}
      <header className="bg-white border-b border-[#e8ede8] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">

          {/* Назва */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#1a2e1a] text-sm truncate">{variant.title}</p>
            <p className="text-xs text-[#7a9a7a]">відповіді: {answeredCount}/{questions.length}</p>
          </div>

          {/* Таймер */}
          <Timer
            startedAt={startedAt}
            timeLimitMin={variant.time_limit}
            onWarning={handleWarning}
          />

          {/* Матеріали */}
          
            href="/materials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#1565c0] bg-[#e3f2fd] border border-[#bbdefb] px-3 py-2 rounded-xl hover:bg-[#bbdefb] transition-colors"
          >
            📚 Матеріали
          </a>

          {/* Завершити */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="btn-primary text-xs py-2"
          >
            {submitting ? 'Збереження...' : 'Завершити спробу'}
          </button>
        </div>

        {/* Навігація по питаннях */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-1.5 flex-wrap">
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
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  i === current
                    ? 'bg-[#0ead69] text-white ring-2 ring-[#0ead69] ring-offset-1'
                    : hasAnswer
                    ? 'bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]'
                    : 'bg-[#f5f7f5] text-[#7a9a7a] border border-[#e8ede8]'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </header>

      {/* Питання */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {q && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-xl bg-[#0ead69] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {q.number}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-done text-xs">
                  {q.type === 'single' && 'ОДНА ПРАВИЛЬНА'}
                  {q.type === 'matching' && 'ВІДПОВІДНОСТІ'}
                  {q.type === 'open' && 'ВПИСАТИ ВІДПОВІДЬ'}
                </span>
                <span className="badge-warning">
                  {q.type === 'matching' ? 'до 3 балів' : q.type === 'open' ? '2 бали' : '1 бал'}
                </span>
                {q.topic && <span className="text-xs text-[#7a9a7a]">{q.topic}</span>}
              </div>
            </div>

            {q.type === 'single' && (
              <SingleQuestionComponent
                question={q}
                answer={answers[q.id]?.answer_single ?? null}
                onChange={v => handleSingle(q.id, v)}
              />
            )}
            {q.type === 'matching' && (
              <MatchingQuestionComponent
                question={q}
                answer={answers[q.id]?.answer_matching ?? {}}
                onChange={v => handleMatching(q.id, v)}
              />
            )}
            {q.type === 'open' && (
              <OpenQuestionComponent
                question={q}
                answer={answers[q.id]?.answer_open ?? ''}
                onChange={v => handleOpen(q.id, v)}
              />
            )}
          </div>
        )}

        {/* Навігація */}
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

      {/* Модальне підтвердження */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1a2e1a] mb-2">Завершити спробу?</h3>
            <p className="text-sm text-[#556655] mb-1">
              Відповідей надано: <strong>{answeredCount}</strong> з {questions.length}
            </p>
            {answeredCount < questions.length && (
              <p className="text-sm text-[#f57f17] mb-4">
                ⚠️ {questions.length - answeredCount} питань без відповіді
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