// Поточний сезон підготовки.
// НАСТУПНОГО РОКУ: змінити на '2028' + default у міграції (alter column season set default ...).
export const CURRENT_SEASON = '2027'

export function seasonLabel(season: string | null | undefined): string {
  return `НМТ-${season ?? CURRENT_SEASON}`
}

/** Чи належить учень до поточного сезону (null вважаємо поточним, щоб нікого не заблокувати випадково) */
export function isCurrentSeason(season: string | null | undefined): boolean {
  return !season || season === CURRENT_SEASON
}

/** Фільтр для Supabase: учні поточного сезону (включно з season = null) */
export const CURRENT_SEASON_FILTER = `season.eq.${CURRENT_SEASON},season.is.null`

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
