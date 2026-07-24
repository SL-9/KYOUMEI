/**
 * Kyoumei NFT - アクセス解析トラッキングスクリプト
 *
 * このスクリプトは既存サイト (index.html) から読み込まれ、
 * ページビューと OpenSea クリックを計測します。
 *
 * 設計方針:
 * - このファイルが壊れても、サイトの動作には影響しない
 * - OpenSea リンクのクリックイベントは絶対にブロックしない
 * - IPアドレスは収集しない（visitor_id はランダム UUID のみ）
 * - 同一セッションの重複ページビューを防ぐ
 * - React Strict Mode 相当の二重実行を防ぐ
 */

(function () {
  'use strict';

  // ============================================================
  // 設定
  // ============================================================

  /**
   * analytics-app のAPIベースURL
   * Vercelデプロイ後は実際のURLに変更してください
   * 例: 'https://kyoumei-analytics.vercel.app'
   */
  var scriptElement = document.currentScript;
  var API_BASE_URL = scriptElement
    ? (scriptElement.getAttribute('data-api-base') || '').replace(/\/$/, '')
    : '';

  /** アクセス解析の有効/無効フラグ */
  var ANALYTICS_ENABLED = scriptElement
    ? scriptElement.getAttribute('data-enabled') === 'true'
    : false;

  /** セッションタイムアウト（30分 = 1800秒） */
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  /** 管理画面・APIパスは計測対象外 */
  var EXCLUDED_PATHS = ['/admin', '/admin/login', '/admin/analytics', '/api'];

  /** botパターン（一部抜粋） */
  var BOT_PATTERNS = [
    'bot', 'crawler', 'spider', 'preview',
    'facebookexternalhit', 'twitterbot', 'discordbot',
    'googlebot', 'bingbot', 'headlesschrome',
  ];

  // ============================================================
  // ユーティリティ
  // ============================================================

  /** UUIDv4を生成する */
  function generateUUID() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    // フォールバック
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /** botかどうかをチェック */
  function isBot(ua) {
    var lowerUA = (ua || '').toLowerCase();
    for (var i = 0; i < BOT_PATTERNS.length; i++) {
      if (lowerUA.indexOf(BOT_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  /** 現在のパスが除外対象かチェック */
  function isExcludedPath() {
    var path = window.location.pathname;
    for (var i = 0; i < EXCLUDED_PATHS.length; i++) {
      if (path === EXCLUDED_PATHS[i] || path.startsWith(EXCLUDED_PATHS[i] + '/')) {
        return true;
      }
    }
    return false;
  }

  /** 本番環境かどうかをチェック */
  function isProduction() {
    var hostname = window.location.hostname;
    // localhost や Vercel Preview、192.168.x.x は除外
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname.endsWith('.vercel.app')
    ) {
      return false;
    }
    return true;
  }

  /** アクセス解析を送信すべきかチェック */
  function shouldTrack() {
    if (!ANALYTICS_ENABLED) return false;
    if (!API_BASE_URL) return false;
    if (isBot(navigator.userAgent)) return false;
    if (isExcludedPath()) return false;

    // 自分のアクセスを除外（localStorageにanalytics_excluded=trueが設定されている場合）
    try {
      if (localStorage.getItem('analytics_excluded') === 'true') return false;
    } catch (e) { /* noop */ }

    // localhost、プライベートIP、Vercel Previewからは本番データを送らない
    return isProduction();
  }

  // ============================================================
  // visitor_id / session_id 管理
  // ============================================================

  var VISITOR_ID_KEY = 'kyoumei_visitor_id';
  var SESSION_ID_KEY = 'kyoumei_session_id';
  var SESSION_LAST_ACTIVITY_KEY = 'kyoumei_session_last_activity';

  /** visitor_idを取得（なければ生成して保存） */
  function getVisitorId() {
    try {
      var id = localStorage.getItem(VISITOR_ID_KEY);
      if (!id) {
        id = generateUUID();
        localStorage.setItem(VISITOR_ID_KEY, id);
      }
      return id;
    } catch (e) {
      return generateUUID(); // localStorage が使えない場合は毎回生成
    }
  }

  /**
   * session_idを取得
   * 最終アクティビティから30分以上経過した場合は新しいIDを発行
   */
  function getSessionId() {
    try {
      var now = Date.now();
      var sessionId = sessionStorage.getItem(SESSION_ID_KEY);
      var lastActivity = parseInt(sessionStorage.getItem(SESSION_LAST_ACTIVITY_KEY) || '0', 10);

      // セッションが存在しない、または30分以上経過した場合は新しいセッション
      if (!sessionId || (now - lastActivity) > SESSION_TIMEOUT_MS) {
        sessionId = generateUUID();
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
      }
      // 最終アクティビティ時刻を更新
      sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, now.toString());
      return sessionId;
    } catch (e) {
      return generateUUID();
    }
  }

  // ============================================================
  // イベント送信
  // ============================================================

  /**
   * イベントをAPIに送信する
   * クロスオリジンでも確実に送信できるよう、認証情報を付けない
   * fetch + keepalive を使用する
   * 失敗してもエラーを外部に出さない（サイト動作を妨げない）
   */
  function sendEvent(payload) {
    if (!shouldTrack()) return;

    var url = API_BASE_URL + '/api/analytics/track';
    var data = JSON.stringify(payload);

    try {
      if (window.fetch) {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true,
          credentials: 'omit',
        }).catch(function () { /* サイレントに失敗 */ });
      } else if (navigator.sendBeacon) {
        // 古いブラウザ向けフォールバック
        var blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    } catch (e) {
      /* サイレントに失敗 - サイトの動作を妨げない */
    }
  }

  // ============================================================
  // ページビュー計測
  // ============================================================

  var pageViewSentForPath = null; // 同一パスの重複送信防止

  function trackPageView() {
    if (!shouldTrack()) return;

    var currentPath = window.location.pathname + window.location.search;

    // 同じパスで既に送信済みの場合はスキップ（Strict Mode対策も兼ねる）
    if (pageViewSentForPath === currentPath) return;
    pageViewSentForPath = currentPath;

    sendEvent({
      event_type: 'page_view',
      event_name: 'Page View',
      page_path: currentPath,
      referrer: document.referrer || null,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
    });
  }

  // ============================================================
  // OpenSea クリック計測
  // ============================================================

  /**
   * OpenSeaリンク要素にクリックイベントを設定する
   * data-opensea-id と data-opensea-label 属性を持つ <a> タグが対象
   */
  function setupOpenSeaTracking() {
    // 全てのOpenSeaリンクを取得（data属性で識別）
    var openseaLinks = document.querySelectorAll('a[data-opensea-id]');

    openseaLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var buttonId = link.getAttribute('data-opensea-id');
        var buttonLabel = link.getAttribute('data-opensea-label') || buttonId;
        var href = link.getAttribute('href');

        // クリックイベントを送信（失敗してもリンクは開く）
        try {
          sendEvent({
            event_type: 'opensea_click',
            event_name: 'OpenSea Click',
            page_path: window.location.pathname + window.location.search,
            button_id: buttonId,
            button_label: buttonLabel,
            destination_url: href,
            visitor_id: getVisitorId(),
            session_id: getSessionId(),
          });
        } catch (err) {
          /* サイレントに失敗 - リンクは正常に開く */
        }
        // e.preventDefault() は絶対に呼ばない
      }, { passive: true });
    });
  }

  // ============================================================
  // 初期化
  // ============================================================

  function init() {
    try {
      trackPageView();
      setupOpenSeaTracking();
    } catch (e) {
      /* 完全にサイレントに失敗 */
    }
  }

  // DOMContentLoaded 後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
