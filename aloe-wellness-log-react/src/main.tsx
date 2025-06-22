import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializePrivacySettings } from './utils/privacy';

// i18nの初期化
import './i18n';

// PWA型定義
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface Window {
    showInstallPrompt: () => Promise<void>;
  }
}

// 🔐 プライバシー・セキュリティ機能を初期化
initializePrivacySettings();

// パフォーマンス監視を開発環境でのみ有効化
if (import.meta.env.MODE === 'development') {
  import('./utils/performanceMonitor').then(({ PerformanceMonitor }) => {
    new PerformanceMonitor();
  });
}

// Service Workerの登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);

        // 更新があった場合の処理
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // 新しいバージョンが利用可能
                console.log('New version available! Please refresh.');

                // ユーザーに更新を通知
                if (
                  confirm(
                    'アプリの新しいバージョンが利用可能です。更新しますか？'
                  )
                ) {
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// PWA インストールプロンプト
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e: Event) => {
  // デフォルトのミニ情報バーを表示させない
  e.preventDefault();

  // 後で使用するためにイベントを保存
  deferredPrompt = e as BeforeInstallPromptEvent;

  console.log('🎯 PWA install prompt ready');
});

// アプリがインストールされた際の処理
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA was installed successfully');
  deferredPrompt = null;
});

// PWAインストール関数をグローバルに公開

window.showInstallPrompt = async () => {
  if (deferredPrompt) {
    // インストールプロンプトを表示
    deferredPrompt.prompt();

    // ユーザーの選択を待つ
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`🎯 PWA install outcome: ${outcome}`);

    // プロンプトは一度しか使用できない
    deferredPrompt = null;
  } else {
    console.log('❌ Install prompt not available');
  }
};

// セキュリティ強化：コンテンツ保護
document.addEventListener('contextmenu', _e => {
  // 本番環境では右クリックメニューを無効化（必要に応じて）
  if (import.meta.env.PROD) {
    // _e.preventDefault(); // 必要に応じてコメントアウト解除
  }
});

// セキュリティ強化：開発者ツール検出（基本的な対策）
const devtools = {
  open: false,
  orientation: null as string | null,
};

const threshold = 160;

// 画面サイズの変化を監視
function detectDevTools() {
  if (
    window.outerHeight - window.innerHeight > threshold ||
    window.outerWidth - window.innerWidth > threshold
  ) {
    if (!devtools.open) {
      devtools.open = true;
      console.warn('🔒 Developer tools detected');
    }
  } else {
    devtools.open = false;
  }
}

// 本番環境でのみ開発者ツール検出を有効化
if (import.meta.env.PROD) {
  setInterval(detectDevTools, 500);
}

// グローバルエラーハンドリング
// パフォーマンス追跡用のカスタムイベント
const sendPerformanceEvent = (
  eventName: string,
  data: Record<string, unknown>
) => {
  // 開発環境でのみログ出力
  if (import.meta.env.MODE === 'development') {
    console.log(`Performance Event: ${eventName}`, data);
  }

  // 後で使用するためにイベントを保存
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(`performance:${eventName}`, { detail: data })
    );
  }
};

// 初期パフォーマンス計測
const startTime = performance.now();

// エラーハンドリング関数
const handleGlobalError = (error: ErrorEvent | PromiseRejectionEvent) => {
  console.error('Global error:', error);

  let errorInfo: Record<string, unknown>;

  if (error instanceof ErrorEvent) {
    errorInfo = {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
      stack: error.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  } else {
    // PromiseRejectionEvent
    errorInfo = {
      reason: error.reason,
      promise: String(error.promise),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  // パフォーマンス情報を追加
  if (typeof performance !== 'undefined') {
    const perfData = {
      timing: performance.timing,
      navigation: performance.navigation,
      memory: (performance as any).memory,
    };

    errorInfo.performance = perfData;
  }

  // 機密情報が含まれる可能性のあるプロパティを削除
  const sanitizedErrorInfo = {
    ...errorInfo,
    // 機密情報を含む可能性のあるフィールドを削除/マスク
    userAgent: navigator.userAgent.substring(0, 100), // 長すぎる場合は切り詰め
    url: new URL(window.location.href).pathname, // クエリパラメータを除去
  };

  // エラー情報をパフォーマンスイベントとして送信
  sendPerformanceEvent('error', sanitizedErrorInfo);
};

// グローバルエラーイベントリスナーの設定
window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', handleGlobalError);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// 初期ロード時間を計測
window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime;
  sendPerformanceEvent('initialLoad', { loadTime });
});
