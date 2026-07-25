import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'
import { getRangeStartDate, isValidRange } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const demoData = {
  summary: {
    pageViews: 0,
    uniqueVisitors: 0,
    sessions: 0,
    openseaClicks: 0,
    clickThroughRate: 0,
    totalEvents: 0,
  },
  daily: [],
  buttons: [],
  devices: [],
  referrers: [],
  pages: [],
  recentEvents: [],
  updatedAt: new Date(0).toISOString(),
}

/** 集計はDB関数内で実施し、大量の生イベントをVercelへ転送しない。 */
export async function GET(request: NextRequest) {
  // Supabase未設定でもEmpty Stateを含むUIだけ確認できる開発専用モード。
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.ANALYTICS_DEMO_MODE === 'true'
  ) {
    return NextResponse.json(
      { ...demoData, demo: true, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.message }, { status: 401 })
  }

  const range = request.nextUrl.searchParams.get('range') || '7d'
  if (!isValidRange(range)) {
    return NextResponse.json(
      { error: 'Invalid range. Use: today, 7d, 30d, all' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc('get_analytics_dashboard', {
      p_start: getRangeStartDate(range),
    })

    if (error) {
      console.error('[admin/analytics] Supabase aggregation error:', error.message)
      return NextResponse.json({ error: '集計データを取得できませんでした' }, { status: 500 })
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    console.error(
      '[admin/analytics] Unexpected error:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** 選択期間の解析イベントを削除する。誤呼び出し防止の確認文字列を必須にする。 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.message }, { status: 401 })
  }

  let body: { range?: unknown; confirmation?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  if (body.confirmation !== 'RESET_ANALYTICS') {
    return NextResponse.json({ error: '確認情報が一致しません' }, { status: 400 })
  }

  if (typeof body.range !== 'string' || !isValidRange(body.range)) {
    return NextResponse.json(
      { error: 'Invalid range. Use: today, 7d, 30d, all' },
      { status: 400 }
    )
  }

  if (
    process.env.NODE_ENV === 'development' &&
    process.env.ANALYTICS_DEMO_MODE === 'true'
  ) {
    return NextResponse.json({ success: true, demo: true })
  }

  try {
    const supabase = createServiceRoleClient()
    const resetRequestedAt = new Date().toISOString()
    const startDate = getRangeStartDate(body.range)

    let query = supabase
      .from('analytics_events')
      .delete()
      .lte('created_at', resetRequestedAt)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    const { error } = await query
    if (error) {
      console.error('[admin/analytics] Supabase reset error:', error.message)
      return NextResponse.json({ error: '解析データをリセットできませんでした' }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, resetAt: resetRequestedAt },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    )
  } catch (error) {
    console.error(
      '[admin/analytics] Unexpected reset error:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
