'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import KyoumeiMark from '@/components/KyoumeiMark'

const AUTH_TIMEOUT_MS = 8000

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeoutId)
  })
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(
    error === 'unauthorized'
      ? '許可されていないメールアドレスです。'
      : error === 'auth_unavailable'
        ? '認証サービスへの接続がタイムアウトしました。時間をおいて再度ログインしてください。'
        : null
  )

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: fetchWithTimeout } }
    ),
    []
  )

  // 既にログイン済みの場合はダッシュボードへ
  useEffect(() => {
    const checkSession = async () => {
      if (error === 'unauthorized' || error === 'auth_unavailable') {
        if (error === 'auth_unavailable') return
        await supabase.auth.signOut()
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/admin/analytics')
      }
    }
    checkSession()
  }, [error, supabase, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setErrorMsg(
          loginError.message === 'Invalid login credentials'
            ? 'メールアドレスまたはパスワードが正しくありません。'
            : loginError.message
        )
        return
      }

      router.push('/admin/analytics')
      router.refresh()
    } catch {
      setErrorMsg(
        '認証サービスに接続できません。Supabaseプロジェクトの稼働状態と接続設定を確認してください。'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0b1e] flex items-center justify-center px-4">
      {/* 背景グラデーション */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0d0b1e] via-[#131022] to-[#1a0f35] pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <KyoumeiMark className="mx-auto mb-4 h-16 w-16 drop-shadow-[0_0_24px_rgba(109,40,217,0.45)]" />
          <h1 className="text-2xl font-bold text-white tracking-tight">響鳴-Kyoumei-</h1>
          <p className="text-[#9b92c9] text-sm mt-1">Analytics Dashboard</p>
        </div>

        {/* ログインカード */}
        <div
          className="rounded-2xl px-8 py-8 border"
          style={{
            background: 'linear-gradient(120deg, rgba(41, 35, 72, 0.92), rgba(30, 25, 51, 0.9))',
            borderColor: 'rgba(130, 116, 206, 0.4)',
            boxShadow: '0 0 40px rgba(62, 52, 112, 0.3), 0 0 80px rgba(62, 52, 112, 0.1)',
          }}
        >
          <h2 className="text-lg font-semibold text-white mb-6">管理者ログイン</h2>

          {errorMsg && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-[#9b92c9] mb-1" htmlFor="email">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/60 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(130, 116, 206, 0.3)',
                }}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-[#9b92c9] mb-1" htmlFor="password">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/60 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(130, 116, 206, 0.3)',
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-sm text-white transition-all mt-2"
              style={{
                background: loading
                  ? 'rgba(55, 19, 236, 0.4)'
                  : 'linear-gradient(135deg, #3713ec, #6d28d9)',
                boxShadow: loading ? 'none' : '0 0 20px rgba(55, 19, 236, 0.3)',
              }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#9b92c9]/50 text-xs mt-6">
          このページは管理者専用です
        </p>
      </div>
    </div>
  )
}
