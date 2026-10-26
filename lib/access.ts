import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentSeason, isCurrentSeason } from './season'

/**
 * Перевіряє, чи учень має доступ до платформи.
 * Заблоковані (is_active = false) та учні минулих сезонів виходять з акаунта.
 * Вчителі проходять завжди. Повертає профіль і поточний сезон.
 */
export async function requireStudentAccess(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, currentSeason] = await Promise.all([
    supabase.from('users').select('role, is_active, is_verified, season').eq('id', userId).single(),
    getCurrentSeason(supabase),
  ])

  if (profile?.role === 'student') {
    if (profile.is_active === false) redirect('/auth/signout?reason=blocked')
    if (!isCurrentSeason(profile.season, currentSeason)) redirect('/auth/signout?reason=archived')
  }

  return { ...profile, currentSeason }
}
