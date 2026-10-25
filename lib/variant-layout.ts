// Структура варіанта з математики: скільки питань кожного типу.
// Повний варіант НМТ — фіксовані 15 / 3 / 4. Тематичний тест — довільно.

export type VariantKind = 'full' | 'topic'

export interface Layout {
  single: number
  matching: number
  open: number
}

export const FULL_MATH_LAYOUT: Layout = { single: 15, matching: 3, open: 4 }
export const DEFAULT_TOPIC_LAYOUT: Layout = { single: 10, matching: 1, open: 2 }

// Бали за одне питання (математика)
export const POINTS = { single: 1, matching: 3, open: 2 }

export function isTopicVariant(v: { kind?: string | null } | null | undefined): boolean {
  return v?.kind === 'topic'
}

export function getLayout(v: { kind?: string | null; layout?: any } | null | undefined): Layout {
  if (!isTopicVariant(v)) return FULL_MATH_LAYOUT
  const l = v?.layout ?? {}
  return {
    single: Number(l.single ?? DEFAULT_TOPIC_LAYOUT.single) || 0,
    matching: Number(l.matching ?? DEFAULT_TOPIC_LAYOUT.matching) || 0,
    open: Number(l.open ?? DEFAULT_TOPIC_LAYOUT.open) || 0,
  }
}

export function totalQuestions(l: Layout): number {
  return l.single + l.matching + l.open
}

export function maxScore(l: Layout): number {
  return l.single * POINTS.single + l.matching * POINTS.matching + l.open * POINTS.open
}

/** Тип питання за номером: спершу single, потім matching, потім open */
export function typeForNumber(num: number, l: Layout): 'single' | 'matching' | 'open' {
  if (num <= l.single) return 'single'
  if (num <= l.single + l.matching) return 'matching'
  return 'open'
}

/** Діапазони номерів для кожного блоку (порожній блок → null) */
export function blockRanges(l: Layout) {
  const r = (from: number, count: number) => (count > 0 ? { from, to: from + count - 1 } : null)
  return {
    single: r(1, l.single),
    matching: r(l.single + 1, l.matching),
    open: r(l.single + l.matching + 1, l.open),
  }
}

export function rangeLabel(range: { from: number; to: number } | null): string {
  if (!range) return ''
  return range.from === range.to ? `${range.from}` : `${range.from}–${range.to}`
}

// Теми тематичних тестів — за змістом посібника (вхідний тест, потім § 1–26), у цьому ж порядку
// показуються учням у розділі «За темами». Можна вписати й свою тему — вона піде в кінець.
export const MATH_TOPICS = [
  "Вхідний тест",
  "Числові вирази. Арифметичні задачі",
  "Алгебраїчні вирази",
  "Лінійні рівняння, системи лінійних рівнянь та їх застосування до розв'язування задач",
  "Відношення та пропорції. Відсотки. Текстові задачі",
  "Ірраціональні вирази. Степінь з раціональним показником",
  "Квадратні рівняння. Квадратний тричлен. Системи нелінійних рівнянь. Розв'язування текстових задач",
  "Нерівності. Системи нерівностей",
  "Модуль. Рівняння та нерівності з модулями",
  "Ірраціональні рівняння та системи рівнянь. Ірраціональні нерівності",
  "Показникові рівняння, системи рівнянь та нерівності",
  "Логарифми. Логарифмічні рівняння, системи рівнянь та нерівності",
  "Тригонометричні вирази. Тригонометричні рівняння",
  "Числові послідовності. Арифметична та геометрична прогресії",
  "Функції",
  "Похідна функції та її застосування",
  "Первісна. Інтеграл та його застосування",
  "Елементи комбінаторики, теорії ймовірностей та статистики",
  "Геометричні фігури на площині та їх властивості",
  "Трикутники",
  "Многокутники",
  "Коло, круг та їх елементи. Вписані та описані многокутники",
  "Пряма та площина в просторі",
  "Многогранники",
  "Тіла обертання. Комбінації геометричних тіл",
  "Метод координат. Вектори",
  "Задачі з параметрами",
]

/** Порядковий номер теми у списку (невідомі теми — в кінець) */
export function topicOrder(topic: string): number {
  const norm = (x: string) => x.trim().toLowerCase().replace(/[’`ʼ]/g, "'")
  const i = MATH_TOPICS.findIndex(t => norm(t) === norm(topic))
  return i === -1 ? MATH_TOPICS.length : i
}
