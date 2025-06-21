// Service Worker for Aloe Wellness Log PWA
const CACHE_NAME = 'aloe-wellness-v1.0.0';
const STATIC_CACHE_NAME = 'aloe-wellness-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'aloe-wellness-dynamic-v1.0.0';

// キャッシュするファイルのリスト（アプリシェル）
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // 主要なページ
  '/list',
  '/graph',
  '/calendar',
  '/export',
  // 静的アセット（ビルド後に更新）
  // '/assets/index-*.css',
  // '/assets/index-*.js',
];

// 重要なルート（オフライン時にフォールバック）
const IMPORTANT_ROUTES = ['/', '/list', '/graph', '/calendar', '/export'];

// Service Worker インストール
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Caching app shell');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: App shell cached');
        // 新しいService Workerを即座にアクティブ化
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Install failed', error);
      })
  );
});

// Service Worker アクティベーション
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 古いキャッシュを削除
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== CACHE_NAME
            ) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated');
        // 既存のタブも即座に制御下に置く
        return self.clients.claim();
      })
  );
});

// フェッチイベント（ネットワークリクエストの処理）
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 同一オリジンのリクエストのみ処理
  if (url.origin !== location.origin) {
    return;
  }

  // ナビゲーションリクエスト（ページ移動）の処理
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 静的リソースの処理
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(handleStaticResource(request));
    return;
  }

  // その他のリクエスト（API等）
  event.respondWith(handleOtherRequests(request));
});

// ナビゲーションリクエストの処理（ページ移動）
async function handleNavigationRequest(request) {
  try {
    // ネットワークを最初に試行
    const response = await fetch(request);

    // 成功した場合、動的キャッシュに保存
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('🌐 Service Worker: Network failed, trying cache', request.url);

    // ネットワーク失敗時、キャッシュから取得
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // キャッシュにもない場合、ルートをチェック
    for (const route of IMPORTANT_ROUTES) {
      if (request.url.includes(route)) {
        const fallbackResponse = await caches.match('/');
        if (fallbackResponse) {
          return fallbackResponse;
        }
      }
    }

    // 最終的にオフラインページを返す
    return createOfflinePage();
  }
}

// 静的リソースの処理
async function handleStaticResource(request) {
  // Cache First戦略
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('🌐 Service Worker: Static resource failed', request.url);

    // 重要でない静的リソースの場合は404を返す
    return new Response('', { status: 404 });
  }
}

// その他のリクエストの処理
async function handleOtherRequests(request) {
  // Network First戦略
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('🌐 Service Worker: Request failed', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('', { status: 404 });
  }
}

// オフラインページの生成
function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>オフライン - アロエ健康管理ログ</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          color: #374151;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #1f2937;
          margin-bottom: 1rem;
        }
        p {
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        .retry-btn {
          background: #059669;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
          transition: background-color 0.2s;
        }
        .retry-btn:hover {
          background: #047857;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🌿</div>
        <h1>オフラインモード</h1>
        <p>
          申し訳ございませんが、現在インターネットに接続されておりません。<br>
          健康記録の閲覧は可能ですが、一部機能が制限される場合がございます。
        </p>
        <button class="retry-btn" onclick="window.location.reload()">
          再接続を試す
        </button>
      </div>
    </body>
    </html>
  `;

  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// バックグラウンド同期（将来的な拡張用）
self.addEventListener('sync', event => {
  if (event.tag === 'health-data-sync') {
    console.log('🔄 Service Worker: Background sync triggered');
    event.waitUntil(syncHealthData());
  }
});

// ヘルスデータの同期（将来的な実装）
async function syncHealthData() {
  // IndexedDBからの未同期データを取得して送信
  // 現在はローカルストレージのみなので、将来的にクラウド同期時に実装
  console.log('📊 Service Worker: Health data sync completed');
}

// プッシュ通知（将来的な拡張用）
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('📢 Service Worker: Push received', data);

    const options = {
      body: data.body || '健康記録の時間ですわ',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'health-reminder',
      requireInteraction: false,
      actions: [
        {
          action: 'record',
          title: '記録する',
          icon: '/icons/action-record.png',
        },
        {
          action: 'dismiss',
          title: '後で',
          icon: '/icons/action-dismiss.png',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'アロエ健康管理ログ',
        options
      )
    );
  }
});

// 通知クリック処理
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'record') {
    // 記録画面を開く
    event.waitUntil(self.clients.openWindow('/'));
  } else if (event.action === 'dismiss') {
    // 何もしない（通知を閉じるだけ）
  } else {
    // 通知本体クリック時はアプリを開く
    event.waitUntil(self.clients.openWindow('/'));
  }
});

console.log('🌿 Service Worker: Loaded successfully');
