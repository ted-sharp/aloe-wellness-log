import { memo, useCallback, useState } from 'react';
import { HiExclamationTriangle, HiTrash } from 'react-icons/hi2';
import { useRecordsStore } from '../store/records.mobx';
import Button from './Button';
import { ErrorMessage, InfoMessage, SuccessMessage } from './StatusMessage';

interface DataManagerProps {
  onStatusChange?: (status: string | null) => void;
  onDataUpdated?: () => void;
}

const DataManager = memo(function DataManager({
  onStatusChange,
  onDataUpdated,
}: DataManagerProps) {
  const { deleteAllData } = useRecordsStore();
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = useCallback(async () => {
    const confirmed = window.confirm(
      '本当にすべてのデータを削除しますか？\n\nこの操作は取り消せません。削除前にデータをエクスポートしてバックアップを作成することをお勧めします。\n\n続行しますか？'
    );

    if (!confirmed) {
      return;
    }

    // 2回目の確認
    const doubleConfirmed = window.confirm(
      '最終確認です。\n\nすべての記録データ（体重、血圧、日課、目標）が完全に削除されます。\n\nこの操作は取り消せません。本当に実行しますか？'
    );

    if (!doubleConfirmed) {
      return;
    }

    setIsDeleting(true);
    setDeleteStatus('すべてのデータを削除中...');
    onStatusChange?.('すべてのデータを削除中...');

    try {
      await deleteAllData();
      setDeleteStatus('すべてのデータを削除しました');
      onStatusChange?.('すべてのデータを削除しました');
      onDataUpdated?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '不明なエラー';
      setDeleteStatus(`削除に失敗しました: ${errorMessage}`);
      onStatusChange?.(`削除に失敗しました: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteAllData, onStatusChange, onDataUpdated]);

  const handleClearStatus = useCallback(() => {
    setDeleteStatus(null);
    onStatusChange?.(null);
  }, [onStatusChange]);

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
        <HiExclamationTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        危険な操作
      </h2>

      <div className="space-y-4">
        <div className="text-sm text-red-800 dark:text-red-200 mb-4 flex justify-center">
          <div className="text-left max-w-md">
            <p className="mb-2">
              この操作により、すべての記録データが完全に削除されます。
            </p>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li>体重記録</li>
              <li>血圧記録</li>
              <li>日課記録</li>
              <li>日課項目設定</li>
              <li>目標設定</li>
            </ul>
            <p className="font-semibold">
              削除前に必ずデータをエクスポートしてバックアップを作成してください。
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            variant="danger"
            icon={HiTrash}
            onClick={handleDeleteAll}
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : 'すべてのデータを削除'}
          </Button>
        </div>

        {deleteStatus && (
          <div className="mt-4">
            {deleteStatus.includes('失敗') ||
            deleteStatus.includes('エラー') ? (
              <ErrorMessage message={deleteStatus} onHide={handleClearStatus} />
            ) : deleteStatus.includes('削除しました') ? (
              <SuccessMessage
                message={deleteStatus}
                onHide={handleClearStatus}
              />
            ) : (
              <InfoMessage message={deleteStatus} />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default DataManager;
