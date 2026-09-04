import { NextRequest, NextResponse } from 'next/server'

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL('/admin/login', request.url))
}

/**
 * Middlewareでは外部通信を行わない。
 * Cookieは画面遷移の判定だけに使い、真正性と管理者権限はAPI側の
 * supabase.auth.getUser()で必ず検証する。
 */
export function middleware(request: NextRequest) {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.ANALYTICS_DEMO_MODE === 'true'
  ) {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }

  const hasSupabaseSession = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))

  return hasSupabaseSession ? NextResponse.next() : redirectToLogin(request)
}

export const config = {
  matcher: ['/admin/:path*'],
}
