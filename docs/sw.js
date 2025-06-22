// Service Worker for Aloe Wellness Log PWA
// 🔐 セキュリティ強化版

const CACHE_NAME = "aloe-wellness-v1.0.0";
const STATIC_CACHE_NAME = "aloe-wellness-static-v1.0.0";
const DYNAMIC_CACHE_NAME = "aloe-wellness-dynamic-v1.0.0";

// セキュリティ設定
const SECURITY_CONFIG = {
  // キャッシュの最大サイズ（バイト）
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  // キャッシュエントリの最大数
  MAX_CACHE_ENTRIES: 100,
  // セキュアなオリジンのみ許可
  ALLOWED_ORIGINS: [
    self.location.origin,
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
  ],
  // 許可するリソースタイプ
  ALLOWED_RESOURCE_TYPES: [
    "document",
    "script",
    "style",
    "image",
    "font",
    "manifest",
  ],
  // センシティブなヘッダーを除外
  SENSITIVE_HEADERS: [
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
  ],
};

// キャッシュするファイルのリスト（アプリシェル）
const STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  // 主要なページ
  "/list",
  "/graph",
  "/calendar",
  "/export",
  // 静的アセット（ビルド後に更新）
  // '/assets/index-*.css',
  // '/assets/index-*.js',
];

// 重要なルート（オフライン時にフォールバック）
const IMPORTANT_ROUTES = ["/", "/list", "/graph", "/calendar", "/export"];

// セキュリティチェック関数
function isSecureRequest(request) {
  const url = new URL(request.url);

  // HTTPSまたはlocalhostのみ許可
  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  ) {
    console.warn("🔒 SW: Insecure request blocked:", request.url);
    return false;
  }

  // 許可されたオリジンのみ
  if (!SECURITY_CONFIG.ALLOWED_ORIGINS.includes(url.origin)) {
    console.warn("🔒 SW: Origin not allowed:", url.origin);
    return false;
  }

  return true;
}

// プライバシー保護のためのヘッダークリーニング
function cleanHeaders(headers) {
  const cleanedHeaders = new Headers();

  for (const [key, value] of headers.entries()) {
    // センシティブなヘッダーは除外
    if (!SECURITY_CONFIG.SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      cleanedHeaders.append(key, value);
    }
  }

  // セキュリティヘッダーを追加
  cleanedHeaders.append("X-Content-Type-Options", "nosniff");
  cleanedHeaders.append("X-Frame-Options", "DENY");
  cleanedHeaders.append("X-XSS-Protection", "1; mode=block");
  cleanedHeaders.append("Referrer-Policy", "strict-origin-when-cross-origin");

  return cleanedHeaders;
}

// キャッシュサイズ管理
async function manageCacheSize(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  // エントリ数制限
  if (keys.length > SECURITY_CONFIG.MAX_CACHE_ENTRIES) {
    const deleteCount = keys.length - SECURITY_CONFIG.MAX_CACHE_ENTRIES;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`🗑️ SW: Cleaned ${deleteCount} old cache entries`);
  }

  // サイズ制限（概算）
  let totalSize = 0;
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const size = parseInt(response.headers.get("content-length") || "0");
      totalSize += size;
    }
  }

  if (totalSize > SECURITY_CONFIG.MAX_CACHE_SIZE) {
    console.warn("⚠️ SW: Cache size exceeded limit, cleaning up...");
    // 古いエントリから削除
    const deleteCount = Math.ceil(keys.length * 0.3); // 30%削除
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Service Worker インストール
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Installing with security enhancements...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("📦 Service Worker: Caching app shell securely");
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log("✅ Service Worker: Secure app shell cached");
        // 新しいService Workerを即座にアクティブ化
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Service Worker: Secure install failed", error);
      })
  );
});

// Service Worker アクティベーション
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker: Activating with security features...");

  event.waitUntil(
    Promise.all([
      // 古いキャッシュを削除
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME
            ) {
              console.log("🗑️ Service Worker: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 全クライアントを制御下に置く
      self.clients.claim(),
    ])
  );
});

// フェッチイベント（セキュリティ強化版）
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // セキュリティチェック
  if (!isSecureRequest(request)) {
    return; // ブロック
  }

  // GETリクエストのみキャッシュ
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches
      .match(request)
      .then((response) => {
        // キャッシュヒット時はプライバシー保護ヘッダーを追加
        if (response) {
          console.log("💾 Service Worker: Cache hit for", request.url);

          // セキュアなレスポンスを作成
          const secureResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: cleanHeaders(response.headers),
          });

          return secureResponse;
        }

        // ネットワークからフェッチ
        console.log("🌐 Service Worker: Fetching from network", request.url);
        return fetch(request)
          .then((networkResponse) => {
            // レスポンスのセキュリティチェック
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // キャッシュ対象かチェック
            const url = new URL(request.url);
            const shouldCache =
              url.origin === self.location.origin ||
              SECURITY_CONFIG.ALLOWED_ORIGINS.includes(url.origin);

            if (shouldCache) {
              // レスポンスをクローンしてキャッシュ
              const responseToCache = networkResponse.clone();

              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
                // キャッシュサイズ管理
                manageCacheSize(DYNAMIC_CACHE_NAME);
              });
            }

            // セキュアなレスポンスを返す
            return new Response(networkResponse.body, {
              status: networkResponse.status,
              statusText: networkResponse.statusText,
              headers: cleanHeaders(networkResponse.headers),
            });
          })
          .catch((error) => {
            console.error("🔥 Service Worker: Network error", error);

            // オフライン時のフォールバック
            if (IMPORTANT_ROUTES.includes(new URL(request.url).pathname)) {
              return caches.match("/");
            }

            throw error;
          });
      })
      .catch((error) => {
        console.error("🔥 Service Worker: Fetch error", error);
        throw error;
      })
  );
});

// メッセージハンドリング（設定更新など）
self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case "SKIP_WAITING":
      console.log("⏭️ Service Worker: Skip waiting requested");
      self.skipWaiting();
      break;

    case "CLEAR_CACHE":
      console.log("🗑️ Service Worker: Cache clear requested");
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
      );
      break;

    case "GET_CACHE_INFO":
      event.waitUntil(
        caches.keys().then(async (cacheNames) => {
          const cacheInfo = {};
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            cacheInfo[cacheName] = keys.length;
          }

          // メッセージを送信
          event.ports[0].postMessage({
            type: "CACHE_INFO",
            payload: cacheInfo,
          });
        })
      );
      break;

    default:
      console.log("❓ Service Worker: Unknown message type", type);
  }
});

// プッシュ通知（セキュリティ配慮）
self.addEventListener("push", (event) => {
  // プッシュデータの検証
  let notificationData;
  try {
    notificationData = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("🔒 Service Worker: Invalid push data", error);
    return;
  }

  // セキュアな通知データのみ処理
  const { title, body, icon, tag } = notificationData;

  if (title && typeof title === "string" && title.length <= 100) {
    const options = {
      body: typeof body === "string" ? body.substring(0, 200) : "",
      icon: icon || "/aloe-icon.png",
      tag: typeof tag === "string" ? tag.substring(0, 50) : "default",
      badge: "/aloe-icon.png",
      requireInteraction: false,
      silent: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// 通知クリックハンドリング
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Service Worker: Notification clicked");

  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // 既存のウィンドウがあればフォーカス
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }

      // 新しいウィンドウを開く
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});

// エラーハンドリング
self.addEventListener("error", (event) => {
  console.error("🔥 Service Worker: Global error", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("🔥 Service Worker: Unhandled promise rejection", event.reason);
});

console.log(
  "🌿 Service Worker: Loaded successfully with security enhancements"
);

// プライバシー保護のためのデータクリーンアップ（定期実行）
setInterval(async () => {
  try {
    await manageCacheSize(DYNAMIC_CACHE_NAME);
    console.log("🔒 Service Worker: Periodic privacy cleanup completed");
  } catch (error) {
    console.error("🔥 Service Worker: Privacy cleanup failed", error);
  }
}, 30 * 60 * 1000); // 30分ごと
