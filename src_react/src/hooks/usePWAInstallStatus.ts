import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWAInstallStatus = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWAがすでにインストールされているかチェック
    const checkIfInstalled = () => {
      const standaloneMode = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;
      const iosStandalone = (navigator as any).standalone === true;

      if (standaloneMode || iosStandalone) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    checkIfInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    // イベントリスナー追加
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // PWAボタンが表示されるかどうか
  const shouldShowPWAButton = !isInstalled && isInstallable;

  return {
    isInstallable,
    isInstalled,
    shouldShowPWAButton,
  };
};