import { getLayout, maxScore, topicOrder } from './variant-layout'

// Спроба тематичного тесту з приєднаним варіантом
export interface TopicAttemptRow {
  student_id?: string
  variant_id: string
  score_total: number | null
  finished_at: string | null
  variants: { kind?: string | null; topic?: string | null; layout?: any; title?: string | null } | null
}

export interface TopicStat {
  topic: string
  attempts: number
  students: number
  tests: number          // різних тестів, які проходили
  avgPct: number         // середній результат усіх спроб, %
  bestPct: number        // найкращий результат, %
  lastPct: number        // останній результат, %
}

/** Відсоток спроби тематичного тесту (за структурою варіанта) */
export function attemptPct(a: TopicAttemptRow): number {
  const max = maxScore(getLayout(a.variants as any))
  return max ? Math.round(((a.score_total ?? 0) / max) * 100) : 0
}

/** Статистика за темами; порядок — як у списку тем посібника */
export function topicStats(rows: TopicAttemptRow[]): TopicStat[] {
  const map = new Map<string, { pcts: number[]; last: { t: number; pct: number }; students: Set<string>; tests: Set<string> }>()
  for (const a of rows) {
    if ((a.variants as any)?.kind !== 'topic') continue
    const topic = a.variants?.topic?.trim() || 'Інше'
    const pct = attemptPct(a)
    const t = a.finished_at ? new Date(a.finished_at).getTime() : 0
    let g = map.get(topic)
    if (!g) { g = { pcts: [], last: { t: -1, pct: 0 }, students: new Set(), tests: new Set() }; map.set(topic, g) }
    g.pcts.push(pct)
    if (t >= g.last.t) g.last = { t, pct }
    if (a.student_id) g.students.add(a.student_id)
    g.tests.add(a.variant_id)
  }
  return Array.from(map.entries())
    .map(([topic, g]) => ({
      topic,
      attempts: g.pcts.length,
      students: g.students.size,
      tests: g.tests.size,
      avgPct: Math.round(g.pcts.reduce((s, x) => s + x, 0) / g.pcts.length),
      bestPct: Math.max(...g.pcts),
      lastPct: g.last.pct,
    }))
    .sort((a, b) => topicOrder(a.topic) - topicOrder(b.topic) || a.topic.localeCompare(b.topic, 'uk'))
}

/** Колір результату у відсотках (як на сторінці «За темами») */
export function pctColor(pct: number): string {
  return pct >= 80 ? 'text-[#2e7d32]' : pct >= 50 ? 'text-[#f57f17]' : 'text-red-500'
}
export function pctBar(pct: number): string {
  return pct >= 80 ? 'bg-[#0ead69]' : pct >= 50 ? 'bg-[#f9a825]' : 'bg-red-400'
}
