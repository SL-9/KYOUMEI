/**
 * アクセス解析ユーティリティ
 * デバイス判定・bot判定・日付集計ヘルパーを提供
 */

/** 明らかなbotのUser-Agentパターン */
const BOT_PATTERNS = [
  'bot',
  'crawler',
  'spider',
  'preview',
  'facebookexternalhit',
  'twitterbot',
  'discordbot',
  'slackbot',
  'whatsapp',
  'telegrambot',
  'googlebot',
  'bingbot',
  'yandexbot',
  'baiduspider',
  'duckduckbot',
  'applebot',
  'linkedinbot',
  'pingdom',
  'uptimerobot',
  'headlesschrome',
  'phantomjs',
  'selenium',
  'puppeteer',
  'playwright',
] as const

/**
 * User-Agentがbotかどうかをチェックする
 * @param userAgent User-Agent文字列
 * @returns botならtrue
 */
export function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern))
}

/**
 * User-Agentからデバイスタイプを判定する
 * @param userAgent User-Agent文字列
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase()
  
  // タブレット判定（iPadを含む）
  if (
    /ipad/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua)) ||
    /tablet/.test(ua)
  ) {
    return 'tablet'
  }
  
  // モバイル判定
  if (
    /iphone|ipod/.test(ua) ||
    (/android/.test(ua) && /mobile/.test(ua)) ||
    /windows phone/.test(ua) ||
    /blackberry/.test(ua) ||
    /mobile/.test(ua)
  ) {
    return 'mobile'
  }
  
  return 'desktop'
}

/**
 * 文字列を指定した最大長に切り詰める
 * @param str 元の文字列
 * @param maxLength 最大長（デフォルト: 2000）
 */
export function truncate(str: string | null | undefined, maxLength = 2000): string | null {
  if (!str) return null
  return str.length > maxLength ? str.substring(0, maxLength) : str
}

/**
 * rangeパラメータからSupabaseのフィルタ用日時文字列を返す
 * 日本時間（Asia/Tokyo）を基準にする
 * @param range 'today' | '7d' | '30d' | 'all'
 */
export function getRangeStartDate(range: string): string | null {
  const now = new Date()
  // UTCで計算するが、日本時間の0時を基準にする
  const jstOffset = 9 * 60 * 60 * 1000 // 9時間（ミリ秒）
  const jstNow = new Date(now.getTime() + jstOffset)
  
  switch (range) {
    case 'today': {
      // 日本時間の今日0時（UTC換算）
      const todayJST = new Date(
        Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate())
      )
      return new Date(todayJST.getTime() - jstOffset).toISOString()
    }
    case '7d': {
      const date = new Date(now)
      date.setDate(date.getDate() - 7)
      return date.toISOString()
    }
    case '30d': {
      const date = new Date(now)
      date.setDate(date.getDate() - 30)
      return date.toISOString()
    }
    case 'all':
      return null
    default:
      return null
  }
}

/**
 * 許可されたrangeパラメータかチェックする
 */
export function isValidRange(range: string): range is 'today' | '7d' | '30d' | 'all' {
  return ['today', '7d', '30d', 'all'].includes(range)
}

/**
 * referrerURLから簡潔な参照元名を生成する
 * @param referrer 参照元URL
 */
export function formatReferrer(referrer: string | null | undefined): string {
  if (!referrer) return 'Direct / None'
  try {
    const url = new URL(referrer)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return referrer.substring(0, 100)
  }
}
