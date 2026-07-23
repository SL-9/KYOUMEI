import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase'
import { isBot, detectDeviceType, truncate } from '@/lib/analytics'

/** 許可するOpenSeaドメイン */
const ALLOWED_OPENSEA_DOMAINS = ['opensea.io', 'www.opensea.io']

/** 許可するevent_type */
const ALLOWED_EVENT_TYPES = ['page_view', 'opensea_click'] as const

/** リクエストボディのバリデーションスキーマ */
const TrackEventSchema = z.object({
  event_type: z.enum(ALLOWED_EVENT_TYPES),
  event_name: z.string().max(200).nullable().optional(),
  page_path: z.string().max(2000).nullable().optional(),
  button_id: z.string().max(200).nullable().optional(),
  button_label: z.string().max(200).nullable().optional(),
  destination_url: z.string().max(2000).nullable().optional(),
  referrer: z.string().max(2000).nullable().optional(),
  visitor_id: z.string().uuid().nullable().optional(),
  session_id: z.string().uuid().nullable().optional(),
})

/** CORSヘッダーを設定するヘルパー */
function allowedOrigins() {
  return (process.env.ANALYTICS_ALLOWED_ORIGIN || 'https://kyoumei.app,https://www.kyoumei.app')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false
  return allowedOrigins().includes(origin) ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
}

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  // 許可オリジンまたはlocalhostから来たリクエストを許可
  if (
    origin &&
    isAllowedOrigin(origin)
  ) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
  }
  return headers
}

/** OPTIONSリクエスト（CORS preflight）のハンドラ */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  })
}

/** POSTリクエスト（イベント記録）のハンドラ */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  try {
    // CORSヘッダーだけに頼らず、API側でも許可していない送信元を拒否する
    if (
      !isAllowedOrigin(origin)
    ) {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers })
    }

    // アクセス解析が無効な場合はスキップ
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'false') {
      return NextResponse.json({ ok: true, skipped: 'disabled' }, { headers })
    }

    // User-Agentを取得
    const userAgent = request.headers.get('user-agent') || ''

    // botチェック
    if (isBot(userAgent)) {
      return NextResponse.json({ ok: true, skipped: 'bot' }, { headers })
    }

    // リクエストボディをパース
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers }
      )
    }

    // Zodバリデーション
    const result = TrackEventSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400, headers }
      )
    }

    const data = result.data

    // opensea_clickの場合はdestination_urlのドメインチェック
    if (data.event_type === 'opensea_click' && !data.destination_url) {
      return NextResponse.json(
        { error: 'destination_url is required for opensea_click' },
        { status: 400, headers }
      )
    }
    if (data.event_type === 'opensea_click' && data.destination_url) {
      try {
        const url = new URL(data.destination_url)
        if (!ALLOWED_OPENSEA_DOMAINS.includes(url.hostname)) {
          return NextResponse.json(
            { error: 'destination_url domain not allowed' },
            { status: 400, headers }
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid destination_url' },
          { status: 400, headers }
        )
      }
    }

    // デバイスタイプを判定
    const deviceType = detectDeviceType(userAgent)

    // Supabaseにイベントを記録（service role key使用）
    const supabase = createServiceRoleClient()
    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert({
        event_type: data.event_type,
        event_name: truncate(data.event_name, 200),
        page_path: truncate(data.page_path, 2000),
        button_id: truncate(data.button_id, 200),
        button_label: truncate(data.button_label, 200),
        destination_url: truncate(data.destination_url, 2000),
        referrer: truncate(data.referrer, 2000),
        visitor_id: data.visitor_id || null,
        session_id: data.session_id || null,
        device_type: deviceType,
        user_agent: truncate(userAgent, 500),
      })

    if (insertError) {
      // エラーログ（本番ではコンソールエラーのみ）
      console.error('[analytics/track] Supabase insert error:', insertError.message)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500, headers }
      )
    }

    return NextResponse.json({ ok: true }, { headers })
  } catch (err) {
    console.error('[analytics/track] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    )
  }
}
