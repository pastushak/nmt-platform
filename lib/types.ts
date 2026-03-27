export type UserRole = 'teacher' | 'student'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
}

export type QuestionType = 'single' | 'matching' | 'open'

export interface Variant {
  id: string
  title: string
  description: string | null
  time_limit: number
  is_published: boolean
  created_by: string
  created_at: string
}

export interface SingleQuestion {
  id: string
  variant_id: string
  number: number
  type: 'single'
  text: string
  image_url: string | null
  topic: string
  options: { А: string; Б: string; В: string; Г: string; Д: string }
  correct_single: 'А' | 'Б' | 'В' | 'Г' | 'Д'
}

export interface MatchingItem {
  id: string
  text: string
}

export interface MatchingQuestion {
  id: string
  variant_id: string
  number: number
  type: 'matching'
  text: string
  image_url: string | null
  topic: string
  left_items: MatchingItem[]
  right_items: MatchingItem[]
  correct_matching: Record<string, string>
}

export interface OpenQuestion {
  id: string
  variant_id: string
  number: number
  type: 'open'
  text: string
  image_url: string | null
  topic: string
  correct_open: string
  accepted_answers: string[]
}

export type Question = SingleQuestion | MatchingQuestion | OpenQuestion

export type AttemptStatus = 'in_progress' | 'done'

export interface Attempt {
  id: string
  student_id: string
  variant_id: string
  started_at: string
  finished_at: string | null
  status: AttemptStatus
  score_single: number
  score_matching: number
  score_open: number
  score_total: number
  nmt_score: number | null
}

export interface AttemptWithVariant extends Attempt {
  variants: Pick<Variant, 'title'>
}

export interface Answer {
  id: string
  attempt_id: string
  question_id: string
  question_type: QuestionType
  answer_single: string | null
  answer_matching: Record<string, string> | null
  answer_open: string | null
  score: number
  answered_at: string
}