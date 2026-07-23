import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // UI確認用。productionでは環境変数が設定されていても絶対に迂回しない。
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.ANALYTICS_DEMO_MODE === 'true'
  ) {
    return NextResponse.next()
  }

  // /admin以下のパスを保護
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // /admin/loginは保護しない
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Supabaseセッションを確認
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const adminEmail = process.env.ADMIN_EMAIL

  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 未ログイン → /admin/loginへリダイレクト
  if (!user) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 許可メールアドレス以外 → /admin/loginへリダイレクト
  if (adminEmail && user.email?.toLowerCase() !== adminEmail.trim().toLowerCase()) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
