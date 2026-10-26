// Supabase (PostgREST) віддає не більше 1000 рядків на запит і МОВЧКИ обрізає решту.
// Ці помічники догружають дані сторінками, поки не прийде неповна сторінка.
//
// Запит передаємо як функцію (будівник запиту одноразовий), і в ньому обов'язково
// має бути .order(...) за унікальною колонкою (зазвичай 'id') — інакше сторінки
// можуть перекриватися або губити рядки.
//
//   const rows = await fetchAll((from, to) =>
//     supabase.from('answers').select('question_id, score')
//       .eq('attempt_id', id).order('id').range(from, to))

import { chunk } from './season'

export const PAGE_SIZE = 1000 // = ліміт Supabase за замовчуванням (Settings → API → Max rows)

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

/** Усі рядки запиту, сторінками по PAGE_SIZE */
export async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Помилка завантаження даних: ${error.message}`)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE_SIZE) return out
  }
}

/**
 * Те саме для фільтра .in(колонка, ids) з довгим списком id:
 * ділимо id на шматки (обмеження довжини URL) і кожен шматок догружаємо сторінками.
 */
export async function fetchAllIn<T>(
  ids: string[],
  page: (part: string[], from: number, to: number) => PageResult<T>,
): Promise<T[]> {
  if (!ids.length) return []
  const parts = await Promise.all(chunk(ids).map(part => fetchAll<T>((from, to) => page(part, from, to))))
  return parts.flat()
}
