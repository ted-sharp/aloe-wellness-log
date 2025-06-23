import { useEffect, useState } from 'react';
import { useI18n } from '../hooks/useI18n';

// iOS Safari用の型拡張
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallButtonProps {
  className?: string;
  onInstall?: () => void;
  onCancel?: () => void;
  debug?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  onInstall,
  onCancel,
  debug = false,
}) => {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    // PWAがすでにインストールされているかチェック
    const checkIfInstalled = () => {
      const standaloneMode = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;
      const iosStandalone = navigator.standalone === true;

      if (standaloneMode || iosStandalone) {
        setIsInstalled(true);
        setDebugInfo(
          `Already installed: standalone=${standaloneMode}, ios=${iosStandalone}`
        );
        return;
      }
      setDebugInfo(
        `Not installed: standalone=${standaloneMode}, ios=${iosStandalone}`
      );
    };

    checkIfInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎯 beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      setDebugInfo('beforeinstallprompt event received - installable!');
    };

    const handleAppInstalled = () => {
      console.log('🎉 App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setDebugInfo('App installed successfully');
      onInstall?.();
    };

    // イベントリスナー追加
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // デバッグ用：5秒後にbeforeinstallpromptイベントの状態をチェック
    if (debug) {
      setTimeout(() => {
        if (!isInstallable && !isInstalled) {
          setDebugInfo(prev => `${prev} | No beforeinstallprompt after 5s`);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall, debug, isInstallable, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'dismissed') {
        onCancel?.();
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Installation failed:', error);
      setDebugInfo(`Installation failed: ${error}`);
    } finally {
      setIsInstalling(false);
    }
  };

  // デバッグモード用の強制表示
  const handleDebugInstall = () => {
    // 開発環境では手動でブラウザのインストール機能を案内
    alert(`PWAインストール方法:

Chrome/Edge: アドレスバー右側の📦アイコンをクリック
Firefox: アドレスバーの⋮ → このサイトをインストール
Safari (iOS): 共有ボタン → ホーム画面に追加

現在の状態: ${debugInfo}`);
  };

  // デバッグモードの場合は常に表示
  if (debug) {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={isInstallable ? handleInstallClick : handleDebugInstall}
          disabled={isInstalling}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            isInstallable
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${className}`}
          aria-label={t('actions.add')}
          title={t('actions.add')}
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isInstalling
            ? 'インストール中...'
            : isInstallable
            ? 'アプリをインストール'
            : 'インストール方法を表示'}
        </button>
        <div className="text-xs text-gray-500 max-w-xs">
          デバッグ: {debugInfo}
        </div>
      </div>
    );
  }

  // 通常モード：インストール可能でない場合は非表示
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      disabled={isInstalling}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${className}`}
      aria-label={t('actions.add')}
      title={t('actions.add')}
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {isInstalling ? 'インストール中...' : 'アプリをインストール'}
    </button>
  );
};
