import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Перевіряємо чи є профіль
      const { data: profile } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', user.id)
        .single()

      // Якщо профілю немає — створюємо як student
      if (!profile) {
        await supabase.from('users').insert({
          id: user.id,
          name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Учень',
          email: user.email!,
          role: 'student',
          is_verified: false,
          is_active: true,
        })
        // Новий учень → на головну (там побачить що не підтверджений)
        return NextResponse.redirect(`${origin}/home`)
      }

      // Існуючий юзер
      return NextResponse.redirect(`${origin}/${profile.role === 'teacher' ? 'admin' : 'home'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}