import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Примусовий вихід (заблокований або архівний акаунт) → сторінка входу з поясненням
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const reason = searchParams.get('reason')

  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()

  const param = reason === 'archived' ? 'archived=1' : reason === 'blocked' ? 'blocked=1' : ''
  return NextResponse.redirect(`${origin}/login${param ? `?${param}` : ''}`)
}
