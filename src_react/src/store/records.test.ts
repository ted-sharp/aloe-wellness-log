import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecordsStore } from './records';

// IndexedDBのモック
vi.mock('../db', () => ({
  deleteAllData: vi.fn(),
  // DbErrorクラスとDbErrorTypeのモック
  DbError: class DbError extends Error {
    constructor(
      public type: string,
      message: string,
      public originalError?: unknown,
      public retryable: boolean = true
    ) {
      super(message);
      this.name = 'DbError';
    }
  },
  DbErrorType: {
    CONNECTION_FAILED: 'connection_failed',
    TRANSACTION_FAILED: 'transaction_failed',
    DATA_CORRUPTED: 'data_corrupted',
    QUOTA_EXCEEDED: 'quota_exceeded',
    VERSION_ERROR: 'version_error',
    UNKNOWN: 'unknown',
  },
}));

import * as db from '../db';

// モックされたdbモジュール
const mockDb = vi.mocked(db);

describe('useRecordsStore', () => {
  beforeEach(() => {
    // ストアの状態をリセット
    useRecordsStore.setState({
      recordsOperation: { loading: false, error: null },
      fieldsOperation: { loading: false, error: null },
    });

    // モックをリセット
    vi.clearAllMocks();
  });

  describe('deleteAllData', () => {
    it('楽観的更新で全データを削除する', async () => {
      mockDb.deleteAllData.mockResolvedValue(undefined);

      const { deleteAllData } = useRecordsStore.getState();
      await deleteAllData();

      expect(mockDb.deleteAllData).toHaveBeenCalledTimes(1);

      const { recordsOperation, fieldsOperation } = useRecordsStore.getState();
      expect(recordsOperation.loading).toBe(false);
      expect(fieldsOperation.loading).toBe(false);
    });
  });
});