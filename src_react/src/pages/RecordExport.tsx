import { useCallback, useEffect, useState } from 'react';
import { HiChartBarSquare } from 'react-icons/hi2';
import DataExporter from '../components/DataExporter';
import DataImporter from '../components/DataImporter';
import DataManager from '../components/DataManager';
import { ErrorMessage, InfoMessage, SuccessMessage } from '../components/StatusMessage';
import TestDataGenerator from '../components/TestDataGenerator';
import { isDev } from '../utils/devTools';

interface RecordExportProps {
  showTipsModal?: () => void;
}

export default function RecordExport({ showTipsModal }: RecordExportProps) {
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
            データのエクスポート、インポート、テストデータ生成を行えます
          </p>
        </div>

        {/* グローバルステータス表示 */}
        {globalStatus && (
          <div className="w-full">
            {globalStatus.includes('エラー') || globalStatus.includes('失敗') ? (
              <ErrorMessage message={globalStatus} onHide={handleClearStatus} />
            ) : globalStatus.includes('完了') || globalStatus.includes('削除しました') ? (
              <SuccessMessage message={globalStatus} onHide={handleClearStatus} />
            ) : (
              <InfoMessage message={globalStatus} />
            )}
          </div>
        )}

        {/* データエクスポート */}
        <DataExporter onStatusChange={handleStatusChange} />

        {/* データインポート */}
        <DataImporter 
          onStatusChange={handleStatusChange}
          onDataUpdated={handleDataUpdated}
        />

        {/* テストデータ生成（開発環境のみ） */}
        {isDev && (
          <TestDataGenerator onStatusChange={handleStatusChange} />
        )}

        {/* データ管理（全削除） */}
        <DataManager 
          onStatusChange={handleStatusChange}
          onDataUpdated={handleDataUpdated}
        />

        {/* 開発環境専用: エラーバウンダリテスト */}
        {isDev && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <HiChartBarSquare className="w-6 h-6" />
              開発者ツール
            </h2>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>開発環境でのみ表示される機能です。</p>
              </div>

              <button
                type="button"
                onClick={triggerTestError}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                エラーバウンダリをテスト
              </button>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>• エラーバウンダリ: 意図的にエラーを発生させて、エラーハンドリングをテストします</p>
                <p>• テストデータ生成: 開発・デモ用のサンプルデータを生成できます</p>
              </div>
            </div>
          </div>
        )}

        {/* 使用上の注意 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
            使用上の注意
          </h3>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <p>• データは端末内のみに保存され、外部サーバーには送信されません</p>
            <p>• 定期的にデータをエクスポートしてバックアップを作成することをお勧めします</p>
            <p>• ブラウザのデータを削除すると、記録したデータも失われます</p>
            <p>• インポート時は既存データに新しいデータが追加されます（上書きではありません）</p>
          </div>
        </div>
      </div>
    </div>
  );
}