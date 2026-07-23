import { createServerSideClient } from './supabase'

const adminEmail = process.env.ADMIN_EMAIL

/**
 * 現在のセッションユーザーが管理者かどうかを確認する
 * サーバーサイドのみで使用する
 * @returns 管理者ならtrue
 */
export async function isAdmin(): Promise<boolean> {
  if (!adminEmail) {
    return false
  }

  try {
    const supabase = await createServerSideClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return false
    }

    // 許可されたメールアドレスのみ管理者として認証
    return user.email?.toLowerCase() === adminEmail.trim().toLowerCase()
  } catch {
    return false
  }
}

/**
 * 管理者でない場合はエラーを返すためのミドルウェアヘルパー
 * API Routeで使用する
 */
export async function requireAdmin(): Promise<{ authorized: true } | { authorized: false; message: string }> {
  const authorized = await isAdmin()
  if (!authorized) {
    return { authorized: false, message: '認証が必要です' }
  }
  return { authorized: true }
}
