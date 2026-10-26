import type { SupabaseClient } from '@supabase/supabase-js'

// Поточний сезон зберігається в БД (app_settings.current_season) і змінюється
// кнопкою в адмінці: Архів сезонів → «Розпочати новий сезон».
// Це значення — лише запасне, поки міграцію 20261026_season_setting.sql не запущено.
export const FALLBACK_SEASON = '2027'

/** Поточний сезон з бази */
export async function getCurrentSeason(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('current_season')
  if (error || typeof data !== 'string' || !data) return FALLBACK_SEASON
  return data
}

export function seasonLabel(season: string | null | undefined): string {
  return season ? `НМТ-${season}` : 'НМТ'
}

/** Чи належить учень до поточного сезону (null вважаємо поточним, щоб нікого не заблокувати випадково) */
export function isCurrentSeason(season: string | null | undefined, current: string): boolean {
  return !season || season === current
}

/** Фільтр для Supabase .or(): учні поточного сезону (включно з season = null) */
export function currentSeasonFilter(current: string): string {
  return `season.eq.${current},season.is.null`
}

/** Порожній список id ламає .in() — підставляємо неіснуючий UUID */
export function safeIds(ids: string[]): string[] {
  return ids.length ? ids : ['00000000-0000-0000-0000-000000000000']
}

/** Розбиває масив на шматки (щоб .in() з сотнями id не впирався в довжину URL) */
export function chunk<T>(arr: T[], size = 100): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
