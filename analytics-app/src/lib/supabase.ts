import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_TIMEOUT_MS = 8000

/** Supabase障害時にもAPI RouteがVercelの実行上限まで待ち続けないようにする。 */
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS)

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId)
  })
}

/**
 * サービスロールキーを使ったサーバーサイド専用クライアント
 * API RouteのINSERT・集計クエリ用。絶対にクライアントへ公開しない。
 */
export function createServiceRoleClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { fetch: fetchWithTimeout },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * 認証セッション付きサーバーサイドクライアント (SSR用)
 * Supabase Authのセッション管理に使用
 */
export async function createServerSideClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Componentから呼ばれた場合は無視 (read-only)
        }
      },
    },
  })
}
