# Kyoumei Analytics - アクセス解析セットアップガイド

> このガイドは、Kyoumeiサイトのアクセス解析システムを一から設定するための手順書です。  
> 専門知識がない方でも操作できるよう、画面の操作手順を詳しく説明しています。

---

## 📋 目次

1. [Supabaseプロジェクトの作成](#1-supabaseプロジェクトの作成)
2. [SQLの実行（テーブル作成）](#2-sqlの実行テーブル作成)
3. [RLS設定の確認方法](#3-rls設定の確認方法)
4. [管理者ユーザーの作成](#4-管理者ユーザーの作成)
5. [環境変数の取得と設定](#5-環境変数の取得と設定)
6. [ローカルでの起動方法](#6-ローカルでの起動方法)
7. [本番デプロイ（Vercel）](#7-本番デプロイvercel)
8. [アクセス記録の確認方法](#8-アクセス記録の確認方法)
9. [OpenSeaクリックのテスト方法](#9-openseaクリックのテスト方法)
10. [自分のアクセスを除外する方法](#10-自分のアクセスを除外する方法)
11. [問題が起きた場合の確認方法](#11-問題が起きた場合の確認方法)

---

## 1. Supabaseプロジェクトの作成

### 手順

1. ブラウザで [https://supabase.com](https://supabase.com) を開く
2. 右上の「Start your project」または「Sign In」ボタンをクリック
3. GitHubアカウントまたはメールアドレスでアカウント登録・ログイン
4. ダッシュボードが表示されたら、「New project」ボタンをクリック
5. 以下を入力する：
   - **Organization**: 自分のアカウント名を選択
   - **Name**: `kyoumei-analytics`（何でもOK）
   - **Database Password**: 安全なパスワードを設定（後で使わないので控えなくてOK）
   - **Region**: `Northeast Asia (Tokyo)` を選択（日本向けで一番速い）
6. 「Create new project」をクリック
7. プロジェクトの準備に1〜2分かかります。緑色の「Project is ready」が表示されたら完了

---

## 2. SQLの実行（テーブル作成）

analytics_eventsテーブルを作成します。

### 手順

1. Supabaseダッシュボードの左メニューから「**SQL Editor**」をクリック
2. 画面上部の「**New query**」ボタンをクリック
3. このリポジトリの `supabase/analytics-schema.sql` ファイルを開く
4. ファイルの内容をすべてコピー（Ctrl+A → Ctrl+C）
5. SQL Editorの入力エリアに貼り付け（Ctrl+V）
6. 右側の「**Run**」ボタン（または Ctrl+Enter）をクリック
7. 画面下部に `✅ analytics_events テーブルの作成が完了しました` などのメッセージが表示されれば成功

### 確認方法

左メニューの「**Table Editor**」をクリックすると、`analytics_events` テーブルが表示されているはずです。

---

## 3. RLS設定の確認方法

RLS（Row Level Security）が正しく設定されているか確認します。

### 手順

1. Supabaseダッシュボードの左メニューから「**Authentication**」→「**Policies**」をクリック
2. テーブル一覧に `analytics_events` が表示されているか確認
3. テーブル名の横に「**RLS enabled**」と表示されていればOK
4. ポリシー（Rules）が4〜5件設定されていることを確認

または、SQL Editorで以下のSQLを実行して確認することもできます：

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'analytics_events';
```

`rowsecurity` の値が `true` であればRLSが有効です。

---

## 4. 管理者ユーザーの作成

ダッシュボードにログインするためのユーザーを作成します。

### 手順

1. Supabaseダッシュボードの左メニューから「**Authentication**」→「**Users**」をクリック
2. 右上の「**Add user**」→「**Create new user**」をクリック
3. 以下を入力：
   - **Email**: 管理者のメールアドレス（これが環境変数 `ADMIN_EMAIL` に設定するもの）
   - **Password**: 安全なパスワードを設定（これがダッシュボードのログインに使うもの）
   - **Auto Confirm User**: チェックを入れる（メール確認をスキップ）
4. 「**Create User**」をクリック

---

## 5. 環境変数の取得と設定

### Supabaseの値を取得する

1. Supabaseダッシュボードの左メニューから「**Project Settings**」をクリック（歯車アイコン）
2. 「**API**」タブをクリック
3. 以下の値をコピーして控えておく：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` に使用
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` に使用
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` に使用（「Reveal」ボタンで表示）

> ⚠️ `service_role` キーは絶対に他人に見せないでください。サーバーサイドのみで使います。

### .env.localファイルの作成

`analytics-app` フォルダの中に `.env.local` ファイルを作成します。

```bash
# analytics-app フォルダに移動してコピー
cp analytics-app/.env.example analytics-app/.env.local
```

その後 `.env.local` をテキストエディタで開き、以下のように値を設定します：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_EMAIL=あなたのメールアドレス@example.com
NEXT_PUBLIC_ANALYTICS_ENABLED=true
ANALYTICS_ALLOWED_ORIGIN=https://kyoumei.app,https://www.kyoumei.app
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. ローカルでの起動方法

### 前提条件

- Node.js がインストールされていること（v18以上推奨）

### 手順

#### まず管理画面の見た目だけ確認する（Supabase設定不要）

```bash
cd analytics-app
npm install
npm run dev:demo
```

このリポジトリに同梱したプロジェクト用Node.jsを使う場合は、次回から以下だけでも起動できます。

```bash
./analytics-app/start-demo.sh
```

起動後、ブラウザで `http://localhost:3000/admin/analytics` を開いてください。
ログインせず、データ0件の状態を確認できます。この迂回は開発サーバーでのみ有効で、
`npm run build` した本番環境では利用できません。

#### Supabaseへ接続して実データを確認する

```bash
# analytics-appフォルダに移動
cd analytics-app

# 依存パッケージをインストール（初回のみ）
npm install

# 開発サーバーを起動
npm run dev
```

起動後、ブラウザで以下のURLにアクセスしてください：

- **ログイン画面**: http://localhost:3000/admin/login
- **ダッシュボード**: http://localhost:3000/admin/analytics（ログイン後）

---

## 7. 本番デプロイ（Vercel）

### 前提条件

- GitHubにリポジトリをプッシュしていること
- Vercelアカウントを持っていること（[vercel.com](https://vercel.com) で無料登録）

### 手順

1. [vercel.com](https://vercel.com) にログイン
2. 「**Add New Project**」をクリック
3. GitHubのリポジトリ一覧から `kyoumei_nft` を選択
4. **重要**: 「Root Directory」を `analytics-app` に変更する  
   （デフォルトはリポジトリルートなので変更が必要）
5. 「Environment Variables」セクションで、`.env.local` の内容を1つずつ入力する：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`
   - `NEXT_PUBLIC_ANALYTICS_ENABLED` = `true`
   - `ANALYTICS_ALLOWED_ORIGIN` = `https://kyoumei.app,https://www.kyoumei.app`
   - `NEXT_PUBLIC_APP_URL` = デプロイ後のVercel URL（後で更新OK）
6. 「**Deploy**」ボタンをクリック
7. デプロイ完了後、VercelのURLをコピー（例: `https://kyoumei-analytics.vercel.app`）

### tracking.jsのAPIURLを更新

`index.html` の末尾にある `tracking.js` 読み込みタグの `data-api-base` を、Vercelのデプロイ先URLに変更してください：

```html
<script
  src="tracking.js"
  data-api-base="https://実際のVercel URL"
  data-enabled="true"></script>
```

静的HTMLではVercelの環境変数をブラウザへ直接展開できないため、公開サイト側の送信ON/OFFは
`data-enabled="true"` / `data-enabled="false"` で切り替えます。API側は
`NEXT_PUBLIC_ANALYTICS_ENABLED` でも停止でき、どちらかが無効なら記録されません。

その後、GitHubにプッシュするとVercelが自動で再デプロイされます。

---

## 8. アクセス記録の確認方法

### ダッシュボードで確認

1. `https://あなたのVercelURL/admin/analytics` にアクセス
2. Supabase Authで設定したメールアドレス・パスワードでログイン
3. ダッシュボードにデータが表示される

### Supabaseで直接確認

1. Supabaseダッシュボードの「**Table Editor**」を開く
2. `analytics_events` テーブルをクリック
3. 記録されたイベントが一覧表示される

---

## 9. OpenSeaクリックのテスト方法

1. ブラウザで Kyoumeiサイト（kyoumei.app）を開く
2. 開発者ツールのNetworkタブを開く（F12 → Network）
3. OpenSeaボタンをクリックする
4. Networkタブに `/api/analytics/track` へのリクエストが表示されることを確認
5. レスポンスに `{"ok":true}` が返ってきていればOK
6. Supabaseの `analytics_events` テーブルに `opensea_click` イベントが記録されていることを確認

---

## 10. 自分のアクセスを除外する方法

自分がサイトを閲覧するときのアクセスを集計から除外できます。

### 手順

1. Kyoumeiサイト（kyoumei.app）をブラウザで開く
2. 開発者ツールのConsoleタブを開く（F12 → Console）
3. 以下のコマンドを貼り付けてEnterキーを押す：

```javascript
localStorage.setItem('analytics_excluded', 'true');
console.log('アクセス除外が設定されました');
```

4. これ以降、そのブラウザからのアクセスは記録されません

### 除外を解除する場合

```javascript
localStorage.removeItem('analytics_excluded');
console.log('アクセス除外を解除しました');
```

---

## 11. 問題が起きた場合の確認方法

### ダッシュボードにアクセスできない

1. VercelのデプロイURLが正しいか確認
2. `/admin/login` にアクセスし、正しいメールアドレス・パスワードを入力
3. `ADMIN_EMAIL` 環境変数が、Supabase Authで作成したユーザーのメールアドレスと一致しているか確認

### アクセスが記録されない

1. index.htmlの `data-api-base` がVercelのデプロイURLと一致しているか確認
2. ブラウザの開発者ツールのConsoleにエラーが表示されていないか確認
3. `NEXT_PUBLIC_ANALYTICS_ENABLED` が `true` になっているか確認
4. ブラウザの開発者ツールのNetworkタブで `/api/analytics/track` へのリクエストを確認

### Supabase接続エラー

1. `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認
2. Supabaseダッシュボードで、プロジェクトが起動しているか確認（Pausedになっていないか）

### buildエラーが出る場合

```bash
cd analytics-app
npm install  # 依存パッケージを再インストール
npm run build  # ビルドを実行
```

エラーメッセージを確認し、TypeScriptエラーやESLintエラーを修正してください。

---

## 📝 環境変数一覧

| 変数名 | 説明 | 例 |
|--------|------|----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase公開鍵 | `eyJh...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase秘密鍵（サーバー専用） | `eyJh...` |
| `ADMIN_EMAIL` | 管理者メールアドレス | `admin@example.com` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | 解析の有効/無効 | `true` |
| `ANALYTICS_ALLOWED_ORIGIN` | CORSを許可するオリジン（カンマ区切り） | `https://kyoumei.app,https://www.kyoumei.app` |
| `NEXT_PUBLIC_APP_URL` | このアプリ自身のURL | `https://kyoumei-analytics.vercel.app` |
