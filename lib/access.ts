import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isCurrentSeason } from './season'

/**
 * Перевіряє, чи учень має доступ до платформи.
 * Заблоковані (is_active = false) та учні минулих сезонів виходять з акаунта.
 * Вчителі проходять завжди.
 */
export async function requireStudentAccess(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active, is_verified, season')
    .eq('id', userId)
    .single()

  if (profile?.role === 'student') {
    if (profile.is_active === false) redirect('/auth/signout?reason=blocked')
    if (!isCurrentSeason(profile.season)) redirect('/auth/signout?reason=archived')
  }

  return profile
}
