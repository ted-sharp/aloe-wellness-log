import { Suspense, lazy, memo, useCallback, useEffect, useState } from 'react';
import { HiChartBarSquare } from 'react-icons/hi2';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useToastStore } from '../store/toast.mobx';
import { isDev } from '../utils/devTools';
import { useRenderPerformance } from '../utils/performance';

// 重いコンポーネントを動的インポートで最適化
const DataExporter = lazy(() => import('../components/DataExporter'));
const DataImporter = lazy(() => import('../components/DataImporter'));
const DataManager = lazy(() => import('../components/DataManager'));
const TestDataGenerator = lazy(() => import('../components/TestDataGenerator'));

interface RecordExportProps {
  showTipsModal?: () => void;
}

const RecordExport = memo(function RecordExport({
  showTipsModal,
}: RecordExportProps) {
  useRenderPerformance('RecordExport');

  const [globalStatus, setGlobalStatus] = useState<string | null>(null);
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);
  const { showSuccess, showError } = useToastStore();

  // エラーバウンダリテスト用
  useEffect(() => {
    if (errorToThrow) {
      throw errorToThrow;
    }
  }, [errorToThrow]);

  const handleStatusChange = useCallback((status: string | null) => {
    setGlobalStatus(status);
  }, []);

  const handleDataUpdated = useCallback(() => {
    // データが更新された時の処理
    // インポート時はTIPS表示しない（手動入力時のみ表示したい）
  }, []);

  const handleClearStatus = useCallback(() => {
    setGlobalStatus(null);
  }, []);

  const triggerTestError = useCallback(() => {
    setErrorToThrow(new Error('これは意図的なテストエラーです'));
  }, []);

  const triggerVersionUpdateMessage = useCallback(() => {
    // Service Worker更新通知をテストするためのモック
    const mockRegistration = {
      waiting: {
        postMessage: (message: { type: string }) => {
          console.log('Mock Service Worker message:', message);
        },
      },
    } as ServiceWorkerRegistration;

    // 新しいバージョンのメッセージを表示
    const toastRoot = document.createElement('div');
    toastRoot.style.position = 'fixed';
    toastRoot.style.bottom = '32px';
    toastRoot.style.left = '50%';
    toastRoot.style.transform = 'translateX(-50%)';
    toastRoot.style.zIndex = '9999';
    toastRoot.style.padding = '0 16px';
    document.body.appendChild(toastRoot);

    toastRoot.innerHTML = `
      <div style="background:#059669;color:#fff;padding:16px 20px;border-radius:12px;box-shadow:0 2px 8px #0002;display:flex;flex-direction:column;gap:12px;font-size:0.95rem;max-width:95vw;width:auto;min-width:280px;">
        <span style="text-align:center;">新しいバージョンがあります。<br>再読み込みで最新に更新できます。</span>
        <button id="sw-update-btn" style="background:#fff;color:#059669;font-weight:bold;padding:10px 16px;border:none;border-radius:8px;cursor:pointer;width:100%;">再読み込み</button>
      </div>
    `;

    const btn = toastRoot.querySelector('#sw-update-btn') as HTMLButtonElement;
    btn.onclick = () => {
      if (mockRegistration.waiting) {
        mockRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // テスト用なので実際の再読み込みではなく、メッセージを削除
      document.body.removeChild(toastRoot);
      setGlobalStatus('テスト用の更新通知を表示しました');
    };

    // 10秒後に自動的に削除
    setTimeout(() => {
      if (document.body.contains(toastRoot)) {
        document.body.removeChild(toastRoot);
      }
    }, 10000);
  }, []);

  const resetTipsHistory = useCallback(() => {
    try {
      // App.tsxで使用している履歴キー
      localStorage.removeItem(STORAGE_KEYS.shownTipIndices);
      showSuccess('TIPS表示履歴をリセットしました');
    } catch (e) {
      console.error(e);
      showError('TIPS履歴のリセットに失敗しました');
    }
  }, [showSuccess, showError]);

  return (
    <div className="flex flex-col items-center justify-start py-4 bg-transparent min-h-screen">
      <div className="w-full max-w-4xl space-y-6 px-4">
        {/* ページタイトル */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            データ管理
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            データのエクスポート、インポート、を行えます
          </p>
        </div>

        {/* TIPS表示カード */}
        {showTipsModal && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
              💡 健康TIPS
            </h2>

            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 flex justify-center">
                <div className="text-left max-w-md">
                  <p>健康に関するヒントやアドバイスを手動で表示できます。</p>
                </div>
              </div>

              <div className="flex justify-center gap-3 flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={showTipsModal}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                >
                  TIPSを表示
                </button>
                <button
                  type="button"
                  onClick={resetTipsHistory}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  TIPS履歴をリセット
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suspenseでラップして読み込み中の表示を追加 */}
        <Suspense
          fallback={<div className="text-center py-4">読み込み中...</div>}
        >
          {/* データエクスポート */}
          <DataExporter onStatusChange={handleStatusChange} />

          {/* データインポート */}
          <DataImporter
            onStatusChange={handleStatusChange}
            onDataUpdated={handleDataUpdated}
          />

          {/* データ管理（全削除） */}
          <DataManager
            onStatusChange={handleStatusChange}
            onDataUpdated={handleDataUpdated}
          />

          {/* テストデータ生成（開発環境のみ） */}
          {isDev && <TestDataGenerator onStatusChange={handleStatusChange} />}
        </Suspense>

        {/* 開発環境専用: エラーバウンダリテスト */}
        {isDev && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
              <HiChartBarSquare className="w-6 h-6" />
              開発者ツール
            </h2>

            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 flex justify-center">
                <div className="text-left max-w-md">
                  <p>開発環境でのみ表示される機能です。</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={triggerTestError}
                  className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                >
                  エラーバウンダリをテスト
                </button>
                <button
                  type="button"
                  onClick={triggerVersionUpdateMessage}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
                >
                  バージョン更新通知をテスト
                </button>
              </div>

              <div className="flex justify-center">
                <ul className="list-disc list-inside space-y-2 text-xs text-gray-500 dark:text-gray-400 text-left max-w-sm px-2">
                  <li>
                    <span className="font-medium">エラーバウンダリ:</span>
                    <br className="sm:hidden" />
                    <span className="sm:ml-1">
                      意図的にエラーを発生させて、エラーハンドリングをテストします
                    </span>
                  </li>
                  <li>
                    <span className="font-medium">バージョン更新通知:</span>
                    <br className="sm:hidden" />
                    <span className="sm:ml-1">
                      新しいバージョンがある際の通知メッセージをテストします
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* アプリ情報 */}
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 text-center">
            アプリ情報
          </h3>
          <div className="flex justify-center">
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">バージョン:</span>
                <span className="ml-2 font-mono text-green-600 dark:text-green-400">
                  v{import.meta.env.PACKAGE_VERSION || '1.1.0'}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                アロエ健康管理ログ
              </div>
            </div>
          </div>
        </div>

        {/* 使用上の注意 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200 text-center">
            使用上の注意
          </h3>
          <div className="flex justify-center">
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300 text-left max-w-md">
              <li>
                データは端末内のみに保存され、外部サーバーには送信されません
              </li>
              <li>
                定期的にデータをエクスポートしてバックアップを作成することをお勧めします
              </li>
              <li>ブラウザのデータを削除すると、記録したデータも失われます</li>
              <li>
                インポート時は既存データに新しいデータが追加されます（上書きではありません）
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RecordExport;
