import { Question } from './types'
import { scoreSingle, scoreMatching, scoreOpen, getNMTScore } from './scoring'
import { convertUkrainianScore } from './scoring-ukrainian'

export interface SetAnswerState {
  type: string
  answer_single?: string
  answer_matching?: Record<string, string>
  answer_open?: string
}

export interface SetScoreResult {
  // Математика
  math_score_single: number
  math_score_matching: number
  math_score_open: number
  math_score_total: number
  math_nmt_score: number | null
  math_answer_scores: Record<string, number>

  // Українська мова
  ukrainian_score_single: number
  ukrainian_score_matching: number
  ukrainian_score_total: number
  ukrainian_nmt_score: number | null
  ukrainian_answer_scores: Record<string, number>
}

export function calculateSetScore(
  mathQuestions: Question[],
  mathAnswers: Record<string, SetAnswerState>,
  ukrainianQuestions: Question[],
  ukrainianAnswers: Record<string, SetAnswerState>
): SetScoreResult {
  // --- Математика ---
  let math_score_single = 0
  let math_score_matching = 0
  let math_score_open = 0
  const math_answer_scores: Record<string, number> = {}

  for (const q of mathQuestions) {
    const a = mathAnswers[q.id]
    let s = 0
    if (q.type === 'single') {
      s = scoreSingle(a?.answer_single ?? null, (q as any).correct_single)
      math_score_single += s
    } else if (q.type === 'matching') {
      s = scoreMatching(a?.answer_matching ?? null, (q as any).correct_matching)
      math_score_matching += s
    } else if (q.type === 'open') {
      s = scoreOpen(a?.answer_open ?? null, (q as any).accepted_answers)
      math_score_open += s
    }
    math_answer_scores[q.id] = s
  }

  const math_score_total = math_score_single + math_score_matching + math_score_open
  const math_nmt_score = getNMTScore(math_score_total)

  // --- Українська мова ---
  let ukrainian_score_single = 0
  let ukrainian_score_matching = 0
  const ukrainian_answer_scores: Record<string, number> = {}

  for (const q of ukrainianQuestions) {
    const a = ukrainianAnswers[q.id]
    let s = 0
    if (q.type === 'single') {
      // Для укр. мови single завжди 1 бал
      s = scoreSingle(a?.answer_single ?? null, (q as any).correct_single)
      ukrainian_score_single += s
    } else if (q.type === 'matching') {
      // Для укр. мови matching: 4 пари по 1 балу
      s = scoreMatching(a?.answer_matching ?? null, (q as any).correct_matching)
      ukrainian_score_matching += s
    }
    ukrainian_answer_scores[q.id] = s
  }

  const ukrainian_score_total = ukrainian_score_single + ukrainian_score_matching
  const ukrainian_nmt_score = convertUkrainianScore(ukrainian_score_total)

  return {
    math_score_single,
    math_score_matching,
    math_score_open,
    math_score_total,
    math_nmt_score,
    math_answer_scores,
    ukrainian_score_single,
    ukrainian_score_matching,
    ukrainian_score_total,
    ukrainian_nmt_score: ukrainian_score_total >= 8 ? ukrainian_nmt_score : null,
    ukrainian_answer_scores,
  }
}