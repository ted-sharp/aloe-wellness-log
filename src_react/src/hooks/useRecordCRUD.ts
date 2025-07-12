import { useCallback, useEffect, useState } from 'react';

/**
 * 汎用的な記録のCRUD操作を管理するフック
 */
interface UseRecordCRUDOptions<T> {
  getAllRecords: () => Promise<T[]>;
  addRecord: (record: T) => Promise<void>;
  updateRecord: (record: T) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  onRecordAdded?: () => void;
}

interface UseRecordCRUDReturn<T> {
  records: T[];
  isLoading: boolean;
  error: string | null;
  handleAdd: (record: T) => Promise<void>;
  handleUpdate: (record: T) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  refetchRecords: () => Promise<void>;
  clearError: () => void;
}

export function useRecordCRUD<T extends { id: string }>({
  getAllRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  onRecordAdded,
}: UseRecordCRUDOptions<T>): UseRecordCRUDReturn<T> {
  const [records, setRecords] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // レコード取得
  const refetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const allRecords = await getAllRecords();
      setRecords(allRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [getAllRecords]);

  // 初回データ取得
  useEffect(() => {
    refetchRecords();
  }, [refetchRecords]);

  // レコード追加
  const handleAdd = useCallback(async (record: T) => {
    try {
      setError(null);
      await addRecord(record);
      await refetchRecords();
      onRecordAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録の追加に失敗しました');
      throw err;
    }
  }, [addRecord, refetchRecords, onRecordAdded]);

  // レコード更新
  const handleUpdate = useCallback(async (record: T) => {
    try {
      setError(null);
      await updateRecord(record);
      await refetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録の更新に失敗しました');
      throw err;
    }
  }, [updateRecord, refetchRecords]);

  // レコード削除
  const handleDelete = useCallback(async (id: string) => {
    try {
      setError(null);
      if (!window.confirm('本当に削除しますか？')) {
        return;
      }
      await deleteRecord(id);
      await refetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録の削除に失敗しました');
      throw err;
    }
  }, [deleteRecord, refetchRecords]);

  // エラークリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    records,
    isLoading,
    error,
    handleAdd,
    handleUpdate,
    handleDelete,
    refetchRecords,
    clearError,
  };
}