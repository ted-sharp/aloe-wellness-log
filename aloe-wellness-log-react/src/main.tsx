import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializePrivacySettings } from './utils/privacy';

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

// Service Worker登録（本番環境のみ）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('🌿 SW registered:', registration);

        // セキュリティ強化：定期的なService Worker更新チェック
        setInterval(() => {
          registration.update();
        }, 60000); // 1分ごと
      })
      .catch(error => {
        console.error('🔥 SW registration failed:', error);
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
    // _e.preventDefault();
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

// エラーハンドリング強化
window.addEventListener('error', event => {
  console.error('🔥 Global error:', event.error);

  // セキュリティ関連のエラーを特別に処理
  if (event.error?.name === 'SecurityError') {
    console.error(
      '🔒 Security error detected, additional logging may be required'
    );
  }
});

window.addEventListener('unhandledrejection', event => {
  console.error('🔥 Unhandled promise rejection:', event.reason);

  // プライバシー配慮でエラー詳細をマスク
  if (typeof event.reason === 'object' && event.reason !== null) {
    const sanitizedReason = { ...event.reason };
    // 機密情報が含まれる可能性のあるプロパティを削除
    delete sanitizedReason.stack;
    delete sanitizedReason.message;
    console.error('🔒 Sanitized error:', sanitizedReason);
  }
});

// パフォーマンス監視
if ('performance' in window && 'getEntriesByType' in window.performance) {
  window.addEventListener('load', () => {
    // ページロード時間を計測
    const perfData = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    if (perfData) {
      const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
      console.log(`⚡ Page load time: ${loadTime}ms`);

      // セキュリティ監視：異常に長いロード時間の検出
      if (loadTime > 10000) {
        // 10秒以上
        console.warn(
          '⚠️ Unusually long load time detected, potential security issue'
        );
      }
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
