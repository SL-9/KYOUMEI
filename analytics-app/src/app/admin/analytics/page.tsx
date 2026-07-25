'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import KyoumeiMark from '@/components/KyoumeiMark'

// ============================================================
// 型定義
// ============================================================
type Range = 'today' | '7d' | '30d' | 'all'

interface Summary {
  pageViews: number
  uniqueVisitors: number
  sessions: number
  openseaClicks: number
  clickThroughRate: number
  totalEvents: number
}

interface DailyData {
  date: string
  pageViews: number
  uniqueVisitors: number
  openseaClicks: number
}

interface ButtonData {
  button_id: string
  button_label: string | null
  destination_url: string | null
  clicks: number
  percentage: number
}

interface DeviceData {
  device: string
  count: number
  percentage: number
}

interface ReferrerData {
  referrer: string
  count: number
}

interface PageData {
  path: string
  count: number
}

interface RecentEvent {
  id: string
  event_type: string
  event_name: string | null
  page_path: string | null
  button_id: string | null
  button_label: string | null
  visitor_id: string | null
  device_type: string | null
  created_at: string
}

interface AnalyticsData {
  demo?: boolean
  summary: Summary
  daily: DailyData[]
  buttons: ButtonData[]
  devices: DeviceData[]
  referrers: ReferrerData[]
  pages: PageData[]
  recentEvents: RecentEvent[]
  updatedAt: string
}

// ============================================================
// カラー定義
// ============================================================
const CHART_COLORS = {
  pageViews: '#3713ec',
  visitors: '#7c3aed',
  opensea: '#06b6d4',
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#3713ec',
  mobile: '#7c3aed',
  tablet: '#06b6d4',
  unknown: '#6b7280',
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'デスクトップ',
  mobile: 'スマートフォン',
  tablet: 'タブレット',
  unknown: '不明',
}

// ============================================================
// 小コンポーネント
// ============================================================

type IconName = 'eye' | 'user' | 'session' | 'wave' | 'trend' | 'chart' | 'warning' | 'trash'

function DashboardIcon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.75" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.65-4 3-6 7-6s6.35 2 7 6" />
      </>
    ),
    session: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M19 12a7.5 7.5 0 1 0-1.45 4.45" />
        <path d="m19.5 6.5-2.1 2.1" />
      </>
    ),
    wave: (
      <path d="M2 12h3l2.2-5.5L11 18l3.1-11 2.4 5H22" />
    ),
    trend: (
      <>
        <path d="M4 18V6" />
        <path d="M4 18h16" />
        <path d="m7 15 4-4 3 2 5-6" />
        <path d="M15 7h4v4" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </>
    ),
    warning: (
      <>
        <path d="M10.3 4.1 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.1a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="m6 7 1 13h10l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#3713ec]/30" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#3713ec] animate-spin" />
      </div>
      <span className="ml-4 text-[#9b92c9] text-sm">データを読み込み中...</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8274ce]/20 bg-[#8274ce]/10 text-[#9b92c9]/50">
        <DashboardIcon name="chart" className="h-6 w-6" />
      </div>
      <p className="text-[#9b92c9] text-sm">{message}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300/70">
        <DashboardIcon name="warning" className="h-6 w-6" />
      </div>
      <p className="text-red-400 text-sm mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-[#3713ec]/20 border border-[#3713ec]/40 text-[#9b92c9] text-xs hover:bg-[#3713ec]/30 transition-colors"
      >
        再試行
      </button>
    </div>
  )
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{
        background: 'linear-gradient(120deg, rgba(41, 35, 72, 0.85), rgba(30, 25, 51, 0.85))',
        borderColor: 'rgba(130, 116, 206, 0.25)',
        boxShadow: '0 0 20px rgba(62, 52, 112, 0.15)',
      }}
    >
      {children}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  unit,
  icon,
  color,
}: {
  title: string
  value: string | number
  unit?: string
  icon: IconName
  color: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#9b92c9] text-xs font-medium uppercase tracking-wider mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-white">{value.toLocaleString()}</span>
            {unit && <span className="text-[#9b92c9] text-sm">{unit}</span>}
          </div>
        </div>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl text-lg"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}
        >
          <span style={{ color }}>
            <DashboardIcon name={icon} />
          </span>
        </div>
      </div>
    </Card>
  )
}

// ============================================================
// カスタムツールチップ
// ============================================================
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm"
      style={{
        background: 'rgba(19, 16, 34, 0.95)',
        border: '1px solid rgba(130, 116, 206, 0.4)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <p className="text-[#9b92c9] text-xs mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-white">
          <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// ============================================================
// メインページコンポーネント
// ============================================================
export default function AnalyticsDashboard() {
  const router = useRouter()
  const [range, setRange] = useState<Range>('7d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`, {
        cache: 'no-store',
      })
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(`データの取得に失敗しました。${err instanceof Error ? err.message : ''}`)
    } finally {
      setLoading(false)
    }
  }, [range, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ログアウト
  const handleLogout = async () => {
    setLoggingOut(true)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
      await supabase.auth.signOut()
    }
    router.push('/admin/login')
  }

  const handleReset = async () => {
    setResetting(true)
    setResetMessage(null)
    try {
      const res = await fetch('/api/admin/analytics', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range, confirmation: 'RESET_ANALYTICS' }),
      })
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || `HTTP ${res.status}`)
      }
      setShowResetConfirm(false)
      setResetMessage(`${rangeLabels[range]}の数値をリセットしました`)
      await fetchData()
    } catch (err) {
      setResetMessage(
        `リセットに失敗しました。${err instanceof Error ? err.message : ''}`
      )
    } finally {
      setResetting(false)
    }
  }

  // 期間ラベル
  const rangeLabels: Record<Range, string> = {
    today: '今日',
    '7d': '過去7日',
    '30d': '過去30日',
    all: '全期間',
  }

  // 日付フォーマット（日本語）
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 最終更新時刻のフォーマット
  const formatUpdatedAt = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  // イベントタイプのラベル
  const eventTypeLabel = (type: string) => {
    switch (type) {
      case 'page_view': return 'ページ閲覧'
      case 'opensea_click': return 'OpenSeaクリック'
      default: return type
    }
  }

  // クリック時刻フォーマット
  const formatEventTime = (iso: string) => {
    return new Date(iso).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen text-white font-sans" style={{ background: '#0d0b1e' }}>
      {/* 背景 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3713ec]/40 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      {/* ヘッダー */}
      <header
        className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(13, 11, 30, 0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(130, 116, 206, 0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <KyoumeiMark className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              響鳴-Kyoumei- Analytics
            </h1>
            <p className="text-[#9b92c9] text-xs mt-0.5">アクセス解析ダッシュボード</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-[#9b92c9] border border-white/10 hover:bg-white/5 hover:text-white transition-all"
        >
          {loggingOut ? '...' : 'ログアウト'}
        </button>
      </header>

      <main className="relative px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        {data?.demo && (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
            ローカルデモモードです。Supabaseへ接続せず、データ0件の画面を表示しています。
          </div>
        )}
        {/* 期間セレクター */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(130,116,206,0.2)' }}>
            {(['today', '7d', '30d', 'all'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  range === r
                    ? 'text-white'
                    : 'text-[#9b92c9] hover:text-white'
                }`}
                style={
                  range === r
                    ? { background: 'linear-gradient(135deg, #3713ec, #6d28d9)', boxShadow: '0 0 12px rgba(55,19,236,0.3)' }
                    : {}
                }
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <p className="text-[#9b92c9]/50 text-xs">
                最終更新: {formatUpdatedAt(data.updatedAt)}
              </p>
            )}
            <button
              onClick={() => {
                setResetMessage(null)
                setShowResetConfirm(true)
              }}
              disabled={loading || !data}
              className="flex items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-400/5 px-3 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <DashboardIcon name="trash" className="h-3.5 w-3.5" />
              数値をリセット
            </button>
          </div>
        </div>

        {resetMessage && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-xs ${
            resetMessage.startsWith('リセットに失敗')
              ? 'border-red-400/30 bg-red-400/10 text-red-200'
              : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
          }`}>
            {resetMessage}
          </div>
        )}

        {/* エラー表示 */}
        {error && !loading && (
          <ErrorState message={error} onRetry={fetchData} />
        )}

        {/* ローディング */}
        {loading && <LoadingSpinner />}

        {/* データ表示 */}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* サマリーカード */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <SummaryCard title="ページ閲覧数" value={data.summary.pageViews} icon="eye" color="#8b5cf6" />
              <SummaryCard title="ユニーク訪問者" value={data.summary.uniqueVisitors} icon="user" color="#a78bfa" />
              <SummaryCard title="セッション数" value={data.summary.sessions} icon="session" color="#7c3aed" />
              <SummaryCard title="OpenSeaクリック" value={data.summary.openseaClicks} icon="wave" color="#22d3ee" />
              <SummaryCard title="クリック率" value={data.summary.clickThroughRate} unit="%" icon="trend" color="#34d399" />
            </div>

            {/* 日別グラフ */}
            <Card>
              <h2 className="text-sm font-semibold text-white mb-4">日別推移</h2>
              {data.daily.length === 0 ? (
                <EmptyState message="この期間のデータがありません" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fill: '#9b92c9', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(130,116,206,0.2)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#9b92c9', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(130,116,206,0.2)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value) => <span style={{ color: '#9b92c9', fontSize: 12 }}>{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="pageViews"
                      name="ページ閲覧数"
                      stroke={CHART_COLORS.pageViews}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: CHART_COLORS.pageViews }}
                    />
                    <Line
                      type="monotone"
                      dataKey="uniqueVisitors"
                      name="ユニーク訪問者"
                      stroke={CHART_COLORS.visitors}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: CHART_COLORS.visitors }}
                    />
                    <Line
                      type="monotone"
                      dataKey="openseaClicks"
                      name="OpenSeaクリック"
                      stroke={CHART_COLORS.opensea}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: CHART_COLORS.opensea }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* OpenSeaボタン別 & デバイス別 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* OpenSeaボタン別ランキング */}
              <Card>
                <h2 className="text-sm font-semibold text-white mb-4">OpenSeaボタン別クリック数</h2>
                {data.buttons.length === 0 ? (
                  <EmptyState message="クリックデータがありません" />
                ) : (
                  <div className="space-y-3">
                    {data.buttons.map((btn) => (
                      <div key={btn.button_id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <span className="text-white text-sm font-medium truncate block">
                              {btn.button_label || btn.button_id}
                            </span>
                            <span className="text-[#9b92c9] text-xs font-mono">{btn.button_id}</span>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <span className="text-white font-bold text-sm">{btn.clicks}</span>
                            <span className="text-[#9b92c9] text-xs ml-1">回 ({btn.percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${btn.percentage}%`,
                              background: 'linear-gradient(90deg, #3713ec, #06b6d4)',
                            }}
                          />
                        </div>
                        {btn.destination_url && (
                          <a
                            href={btn.destination_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-1 text-[10px] text-cyan-400/70 hover:text-cyan-300 truncate"
                            title={btn.destination_url}
                          >
                            {btn.destination_url}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* デバイス別 */}
              <Card>
                <h2 className="text-sm font-semibold text-white mb-4">デバイス別割合</h2>
                {data.devices.length === 0 ? (
                  <EmptyState message="デバイスデータがありません" />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={data.devices}
                          dataKey="count"
                          nameKey="device"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          strokeWidth={2}
                          stroke="rgba(13,11,30,0.8)"
                        >
                          {data.devices.map((entry) => (
                            <Cell
                              key={entry.device}
                              fill={DEVICE_COLORS[entry.device] || DEVICE_COLORS.unknown}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value, '']}
                          contentStyle={{
                            background: 'rgba(19,16,34,0.95)',
                            border: '1px solid rgba(130,116,206,0.4)',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: '#9b92c9' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {data.devices.map((d) => (
                        <div key={d.device} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: DEVICE_COLORS[d.device] || DEVICE_COLORS.unknown }}
                            />
                            <span className="text-[#9b92c9]">{DEVICE_LABELS[d.device] || d.device}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white font-medium">{d.count.toLocaleString()}</span>
                            <span className="text-[#9b92c9] text-xs ml-1">({d.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* 参照元 & ページ別 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 参照元ランキング */}
              <Card>
                <h2 className="text-sm font-semibold text-white mb-4">流入元（参照元）</h2>
                {data.referrers.length === 0 ? (
                  <EmptyState message="流入元データがありません" />
                ) : (
                  <div className="space-y-2">
                    {data.referrers.slice(0, 10).map((ref, i) => (
                      <div key={ref.referrer} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[#9b92c9]/50 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                          <span className="text-white text-sm truncate">{ref.referrer}</span>
                        </div>
                        <span className="text-[#9b92c9] text-sm flex-shrink-0 ml-4">{ref.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* ページ別閲覧数 */}
              <Card>
                <h2 className="text-sm font-semibold text-white mb-4">ページ別閲覧数</h2>
                {data.pages.length === 0 ? (
                  <EmptyState message="ページデータがありません" />
                ) : (
                  <div className="space-y-2">
                    {data.pages.slice(0, 10).map((page, i) => (
                      <div key={page.path} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[#9b92c9]/50 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                          <span className="text-white text-sm font-mono truncate">{page.path}</span>
                        </div>
                        <span className="text-[#9b92c9] text-sm flex-shrink-0 ml-4">{page.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* OpenSeaクリック日別棒グラフ */}
            <Card>
              <h2 className="text-sm font-semibold text-white mb-4">日別OpenSeaクリック数</h2>
              {data.daily.length === 0 ? (
                <EmptyState message="この期間のデータがありません" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fill: '#9b92c9', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(130,116,206,0.2)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#9b92c9', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(130,116,206,0.2)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="openseaClicks" name="OpenSeaクリック" radius={[4, 4, 0, 0]}>
                      {data.daily.map((_, index) => (
                        <Cell key={index} fill="url(#barGradient)" />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3713ec" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* 最近のイベント */}
            <Card>
              <h2 className="text-sm font-semibold text-white mb-4">最近のイベント</h2>
              {data.recentEvents.length === 0 ? (
                <EmptyState message="この期間のイベントがありません" />
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-[#9b92c9] text-xs font-medium pb-2 pl-5 pr-4 whitespace-nowrap">時刻</th>
                        <th className="text-left text-[#9b92c9] text-xs font-medium pb-2 pr-4 whitespace-nowrap">イベント</th>
                        <th className="text-left text-[#9b92c9] text-xs font-medium pb-2 pr-4 whitespace-nowrap">詳細</th>
                        <th className="text-left text-[#9b92c9] text-xs font-medium pb-2 pr-4 whitespace-nowrap">デバイス</th>
                        <th className="text-left text-[#9b92c9] text-xs font-medium pb-2 pr-5 whitespace-nowrap">訪問者ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentEvents.map((event) => (
                        <tr key={event.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="py-2.5 pl-5 pr-4 text-[#9b92c9] text-xs whitespace-nowrap">
                            {formatEventTime(event.created_at)}
                          </td>
                          <td className="py-2.5 pr-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                event.event_type === 'page_view'
                                  ? 'bg-blue-500/15 text-blue-300'
                                  : 'bg-cyan-500/15 text-cyan-300'
                              }`}
                            >
                              {eventTypeLabel(event.event_type)}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-white text-xs max-w-[200px] truncate">
                            {event.event_type === 'page_view'
                              ? event.page_path || '/'
                              : event.button_label || event.button_id || '-'}
                          </td>
                          <td className="py-2.5 pr-4 text-[#9b92c9] text-xs whitespace-nowrap">
                            {DEVICE_LABELS[event.device_type || ''] || event.device_type || '-'}
                          </td>
                          <td className="py-2.5 pr-5 text-[#9b92c9] text-xs font-mono whitespace-nowrap">
                            {event.visitor_id ? `${event.visitor_id.substring(0, 8)}...` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-400/25 bg-[#17132c] p-6 shadow-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/25 bg-red-400/10 text-red-300">
              <DashboardIcon name="warning" className="h-5 w-5" />
            </div>
            <h2 id="reset-dialog-title" className="text-lg font-bold text-white">
              {rangeLabels[range]}の数値をリセットしますか？
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#b4acd9]">
              選択期間内のアクセス解析データをすべて削除します。この操作は取り消せません。
              リセット後に発生したアクセスは通常どおり記録されます。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#b4acd9] transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
              >
                {resetting ? 'リセット中...' : '削除してリセット'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
