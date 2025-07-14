import { Suspense, lazy, memo, useCallback, useEffect, useState } from 'react';
import { HiChartBarSquare } from 'react-icons/hi2';
import {
  ErrorMessage,
  InfoMessage,
  SuccessMessage,
} from '../components/StatusMessage';
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
    // 必要に応じて他のコンポーネントに通知
    if (showTipsModal) {
      showTipsModal();
    }
  }, [showTipsModal]);

  const handleClearStatus = useCallback(() => {
    setGlobalStatus(null);
  }, []);

  const triggerTestError = useCallback(() => {
    setErrorToThrow(new Error('これは意図的なテストエラーです'));
  }, []);

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

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={showTipsModal}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                >
                  TIPSを表示
                </button>
              </div>
            </div>
          </div>
        )}

        {/* グローバルステータス表示 */}
        {globalStatus && (
          <div className="w-full">
            {globalStatus.includes('エラー') ||
            globalStatus.includes('失敗') ? (
              <ErrorMessage message={globalStatus} onHide={handleClearStatus} />
            ) : globalStatus.includes('完了') ||
              globalStatus.includes('削除しました') ? (
              <SuccessMessage
                message={globalStatus}
                onHide={handleClearStatus}
              />
            ) : (
              <InfoMessage message={globalStatus} />
            )}
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

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={triggerTestError}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  エラーバウンダリをテスト
                </button>
              </div>

              <div className="flex justify-center">
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-500 dark:text-gray-400 text-left max-w-md">
                  <li>
                    エラーバウンダリ:
                    意図的にエラーを発生させて、エラーハンドリングをテストします
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

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
