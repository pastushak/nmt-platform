import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Публічні маршрути
  if (
    pathname === '/login' ||
    pathname.startsWith('/auth') ||
    pathname === '/setup-name' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  // Перевіряємо наявність будь-якої сесійної куки Supabase
  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(cookie => 
    cookie.name.includes('auth-token') || 
    cookie.name.includes('sb-') ||
    cookie.name === 'supabase-auth-token'
  )

  if (!hasSession) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}