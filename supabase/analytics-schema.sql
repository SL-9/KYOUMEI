-- ============================================================
-- Kyoumei Analytics - Supabase スキーマ定義
-- ============================================================
-- このSQLをSupabaseの「SQL Editor」に貼り付けて実行してください
-- 実行場所: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- analytics_eventsテーブルの作成
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    text            NOT NULL,
  event_name    text,
  page_path     text,
  button_id     text,
  button_label  text,
  destination_url text,
  referrer      text,
  visitor_id    uuid,
  session_id    uuid,
  device_type   text,
  user_agent    text,
  created_at    timestamptz     DEFAULT now() NOT NULL
);

-- コメント
COMMENT ON TABLE public.analytics_events IS 'Kyoumei NFTサイトのアクセス解析イベント';
COMMENT ON COLUMN public.analytics_events.event_type IS 'page_view | opensea_click';
COMMENT ON COLUMN public.analytics_events.visitor_id IS 'ランダム生成UUID（個人特定不可）';
COMMENT ON COLUMN public.analytics_events.session_id IS '30分非アクティブで更新されるセッションID';
COMMENT ON COLUMN public.analytics_events.device_type IS 'mobile | tablet | desktop';

-- ============================================================
-- インデックス（集計速度向上）
-- ============================================================

-- created_at: 期間絞り込み用（最も重要）
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON public.analytics_events (created_at DESC);

-- event_type: page_view / opensea_click の絞り込み用
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type
  ON public.analytics_events (event_type);

-- visitor_id: ユニーク訪問者集計用
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id
  ON public.analytics_events (visitor_id)
  WHERE visitor_id IS NOT NULL;

-- button_id: OpenSeaクリック集計用
CREATE INDEX IF NOT EXISTS idx_analytics_events_button_id
  ON public.analytics_events (button_id)
  WHERE button_id IS NOT NULL;

-- 複合インデックス: 期間 + イベントタイプの絞り込み（集計で頻繁に使う組み合わせ）
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON public.analytics_events (event_type, created_at DESC);

-- ============================================================
-- Row Level Security (RLS) の有効化
-- ============================================================

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーが存在する場合は削除して再作成
DROP POLICY IF EXISTS "analytics_events_no_select_anon" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_no_insert_anon" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_no_update_anon" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_no_delete_anon" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_no_select_authenticated" ON public.analytics_events;

-- anonロール（一般ユーザー）からの全操作を禁止
-- INSERTもAPI経由（service role key）でのみ許可する
-- service role keyはRLSをバイパスするため、ポリシーは不要
-- 以下は念のため明示的に禁止ポリシーを設定
CREATE POLICY "analytics_events_no_select_anon"
  ON public.analytics_events
  FOR SELECT
  TO anon
  USING (false);

CREATE POLICY "analytics_events_no_insert_anon"
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (false);

CREATE POLICY "analytics_events_no_update_anon"
  ON public.analytics_events
  FOR UPDATE
  TO anon
  USING (false);

CREATE POLICY "analytics_events_no_delete_anon"
  ON public.analytics_events
  FOR DELETE
  TO anon
  USING (false);

-- authenticated ユーザー（管理者）からのSELECTも禁止
-- データアクセスはすべてAPI経由（service role key）のみ許可
CREATE POLICY "analytics_events_no_select_authenticated"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (false);

-- ============================================================
-- 管理画面用のサーバーサイド集計関数
-- ============================================================
-- service_role からだけ呼び出します。生イベントをブラウザへ送らず、
-- Supabase内で集計するため、PostgRESTの既定1,000行制限にも影響されません。
CREATE OR REPLACE FUNCTION public.get_analytics_dashboard(p_start timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH filtered AS MATERIALIZED (
  SELECT * FROM public.analytics_events
  WHERE p_start IS NULL OR created_at >= p_start
),
summary AS (
  SELECT
    count(*) FILTER (WHERE event_type = 'page_view') AS page_views,
    count(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') AS unique_visitors,
    count(DISTINCT session_id) AS sessions,
    count(*) FILTER (WHERE event_type = 'opensea_click') AS clicks,
    count(*) AS total_events
  FROM filtered
),
daily_rows AS (
  SELECT
    to_char(created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD') AS day,
    count(*) FILTER (WHERE event_type = 'page_view') AS page_views,
    count(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') AS visitors,
    count(*) FILTER (WHERE event_type = 'opensea_click') AS clicks
  FROM filtered GROUP BY 1 ORDER BY 1
),
button_rows AS (
  SELECT button_id, max(button_label) AS button_label,
    max(destination_url) AS destination_url, count(*) AS clicks
  FROM filtered WHERE event_type = 'opensea_click'
  GROUP BY button_id ORDER BY clicks DESC
),
device_rows AS (
  SELECT coalesce(device_type, 'unknown') AS device, count(*) AS count
  FROM filtered WHERE event_type = 'page_view'
  GROUP BY 1 ORDER BY count DESC
),
referrer_rows AS (
  SELECT CASE
    WHEN nullif(referrer, '') IS NULL THEN 'Direct / None'
    ELSE regexp_replace(split_part(regexp_replace(referrer, '^https?://', ''), '/', 1), '^www\\.', '')
  END AS referrer_name, count(*) AS count
  FROM filtered WHERE event_type = 'page_view'
  GROUP BY 1 ORDER BY count DESC LIMIT 20
),
page_rows AS (
  SELECT coalesce(page_path, '/') AS path, count(*) AS count
  FROM filtered WHERE event_type = 'page_view'
  GROUP BY 1 ORDER BY count DESC LIMIT 20
),
recent_rows AS (
  SELECT id, event_type, event_name, page_path, button_id, button_label,
    visitor_id, device_type, created_at
  FROM filtered ORDER BY created_at DESC LIMIT 20
)
SELECT jsonb_build_object(
  'summary', jsonb_build_object(
    'pageViews', s.page_views,
    'uniqueVisitors', s.unique_visitors,
    'sessions', s.sessions,
    'openseaClicks', s.clicks,
    'clickThroughRate', CASE WHEN s.sessions = 0 THEN 0
      ELSE round((s.clicks::numeric / s.sessions) * 100, 1) END,
    'totalEvents', s.total_events
  ),
  'daily', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'date', day, 'pageViews', page_views, 'uniqueVisitors', visitors,
    'openseaClicks', clicks) ORDER BY day) FROM daily_rows), '[]'::jsonb),
  'buttons', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'button_id', button_id, 'button_label', button_label,
    'destination_url', destination_url, 'clicks', clicks,
    'percentage', CASE WHEN s.clicks = 0 THEN 0
      ELSE round((clicks::numeric / s.clicks) * 100, 1) END) ORDER BY clicks DESC)
    FROM button_rows), '[]'::jsonb),
  'devices', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'device', device, 'count', count,
    'percentage', CASE WHEN s.page_views = 0 THEN 0
      ELSE round((count::numeric / s.page_views) * 100, 1) END) ORDER BY count DESC)
    FROM device_rows), '[]'::jsonb),
  'referrers', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'referrer', referrer_name, 'count', count) ORDER BY count DESC)
    FROM referrer_rows), '[]'::jsonb),
  'pages', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'path', path, 'count', count) ORDER BY count DESC)
    FROM page_rows), '[]'::jsonb),
  'recentEvents', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY created_at DESC)
    FROM recent_rows r), '[]'::jsonb),
  'updatedAt', to_jsonb(now())
)
FROM summary s;
$$;

REVOKE ALL ON FUNCTION public.get_analytics_dashboard(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_dashboard(timestamptz) TO service_role;

-- ============================================================
-- 設定確認用クエリ（実行後に確認してください）
-- ============================================================

-- RLSが有効になっているか確認
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'analytics_events';

-- ポリシー一覧の確認
-- SELECT policyname, cmd, roles FROM pg_policies
-- WHERE tablename = 'analytics_events';

-- インデックスの確認
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'analytics_events';

-- ============================================================
-- 完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ analytics_events テーブルの作成が完了しました';
  RAISE NOTICE '✅ インデックスが作成されました';
  RAISE NOTICE '✅ RLSが有効化されました';
  RAISE NOTICE '✅ セキュリティポリシーが設定されました';
  RAISE NOTICE '📝 次のステップ: Supabase Authで管理者ユーザーを作成してください';
END $$;
