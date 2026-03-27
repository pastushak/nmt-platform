import { Question } from './types'

const CONVERSION_TABLE: Record<number, number | null> = {
  0: null, 1: null, 2: null, 3: null, 4: null,
  5: 100,  6: 108,  7: 115,  8: 123,  9: 131,
  10: 134, 11: 137, 12: 140, 13: 143, 14: 145,
  15: 147, 16: 148, 17: 149, 18: 150, 19: 151,
  20: 152, 21: 155, 22: 159, 23: 163, 24: 167,
  25: 170, 26: 173, 27: 176, 28: 180, 29: 184,
  30: 189, 31: 194, 32: 200,
}

export function getNMTScore(rawScore: number): number | null {
  return CONVERSION_TABLE[rawScore] ?? null
}

export function scoreSingle(student: string | null, correct: string): number {
  return student === correct ? 1 : 0
}

export function scoreMatching(
  student: Record<string, string> | null,
  correct: Record<string, string>
): number {
  if (!student) return 0
  return Object.keys(correct).filter(k => student[k] === correct[k]).length
}

export function scoreOpen(student: string | null, accepted: string[]): number {
  if (!student) return 0
  const norm = (s: string) => s.trim().toLowerCase().replace(',', '.')
  return accepted.map(norm).includes(norm(student)) ? 2 : 0
}

export interface ScoreResult {
  score_single: number
  score_matching: number
  score_open: number
  score_total: number
  nmt_score: number | null
  answerScores: Record<string, number>
}

export function calculateAttemptScore(
  questions: Question[],
  answers: Record<string, {
    type: string
    answer_single?: string
    answer_matching?: Record<string, string>
    answer_open?: string
  }>
): ScoreResult {
  let score_single = 0, score_matching = 0, score_open = 0
  const answerScores: Record<string, number> = {}

  for (const q of questions) {
    const a = answers[q.id]
    let s = 0
    if (q.type === 'single') {
      s = scoreSingle(a?.answer_single ?? null, q.correct_single)
      score_single += s
    } else if (q.type === 'matching') {
      s = scoreMatching(a?.answer_matching ?? null, q.correct_matching)
      score_matching += s
    } else if (q.type === 'open') {
      s = scoreOpen(a?.answer_open ?? null, q.accepted_answers)
      score_open += s
    }
    answerScores[q.id] = s
  }

  const score_total = score_single + score_matching + score_open
  return { score_single, score_matching, score_open, score_total, nmt_score: getNMTScore(score_total), answerScores }
}

export const MAX_SCORES = { single: 15, matching: 9, open: 8, total: 32 }