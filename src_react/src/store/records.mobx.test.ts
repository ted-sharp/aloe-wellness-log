import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordsStore } from './records.mobx';
import { DbError, DbErrorType } from '../db';

// deleteAllData のモック
vi.mock('../db', () => ({
  deleteAllData: vi.fn(),
  DbError: class DbError extends Error {
    constructor(public type: string, message: string, public originalError?: any) {
      super(message);
      this.name = 'DbError';
    }
  },
  DbErrorType: {
    UNKNOWN: 'UNKNOWN',
    DATABASE_ERROR: 'DATABASE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
}));

describe('RecordsStore (MobX)', () => {
  let store: RecordsStore;
  let mockDeleteAllData: any;

  beforeEach(async () => {
    store = new RecordsStore();
    mockDeleteAllData = vi.mocked(
      (await import('../db')).deleteAllData
    );
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('初期状態では操作中ではない', () => {
      expect(store.recordsOperation.loading).toBe(false);
      expect(store.recordsOperation.error).toBeNull();
      expect(store.fieldsOperation.loading).toBe(false);
      expect(store.fieldsOperation.error).toBeNull();
    });
  });

  describe('エラークリア', () => {
    it('recordsエラーをクリアできる', () => {
      // エラーを設定
      store.recordsOperation.error = new DbError(
        DbErrorType.UNKNOWN,
        'Test error'
      );
      
      store.clearRecordsError();
      
      expect(store.recordsOperation.error).toBeNull();
    });

    it('fieldsエラーをクリアできる', () => {
      // エラーを設定
      store.fieldsOperation.error = new DbError(
        DbErrorType.UNKNOWN,
        'Test error'
      );
      
      store.clearFieldsError();
      
      expect(store.fieldsOperation.error).toBeNull();
    });
  });

  describe('deleteAllData', () => {
    it('全データ削除が成功する', async () => {
      mockDeleteAllData.mockResolvedValue(undefined);
      
      await store.deleteAllData();
      
      expect(mockDeleteAllData).toHaveBeenCalled();
      expect(store.recordsOperation.loading).toBe(false);
      expect(store.recordsOperation.error).toBeNull();
      expect(store.fieldsOperation.loading).toBe(false);
      expect(store.fieldsOperation.error).toBeNull();
    });

    it('削除中はローディング状態になる', async () => {
      let resolveDeleteAllData: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDeleteAllData = resolve;
      });
      mockDeleteAllData.mockReturnValue(deletePromise);
      
      const deleteOperation = store.deleteAllData();
      
      // 削除中はローディング状態
      expect(store.recordsOperation.loading).toBe(true);
      expect(store.fieldsOperation.loading).toBe(true);
      
      // 削除完了
      resolveDeleteAllData!();
      await deleteOperation;
      
      // ローディング状態が解除される
      expect(store.recordsOperation.loading).toBe(false);
      expect(store.fieldsOperation.loading).toBe(false);
    });

    it('削除に失敗した場合はエラーが設定される', async () => {
      const error = new Error('Delete failed');
      mockDeleteAllData.mockRejectedValue(error);
      
      await expect(store.deleteAllData()).rejects.toThrow('Delete failed');
      
      expect(store.recordsOperation.loading).toBe(false);
      expect(store.recordsOperation.error).toBeInstanceOf(DbError);
      expect(store.recordsOperation.error?.message).toBe('全データ削除に失敗しました');
      expect(store.fieldsOperation.loading).toBe(false);
      expect(store.fieldsOperation.error).toBeInstanceOf(DbError);
    });

    it('DbErrorが投げられた場合はそのまま設定される', async () => {
      const dbError = new DbError(
        DbErrorType.DATABASE_ERROR,
        'Database connection failed'
      );
      mockDeleteAllData.mockRejectedValue(dbError);
      
      await expect(store.deleteAllData()).rejects.toThrow(dbError);
      
      expect(store.recordsOperation.error).toBe(dbError);
      expect(store.fieldsOperation.error).toBe(dbError);
    });
  });

  describe('楽観的更新', () => {
    it('削除開始時にエラーがクリアされる', async () => {
      // 初期エラーを設定
      store.recordsOperation.error = new DbError(
        DbErrorType.UNKNOWN,
        'Previous error'
      );
      store.fieldsOperation.error = new DbError(
        DbErrorType.UNKNOWN,
        'Previous error'
      );
      
      mockDeleteAllData.mockResolvedValue(undefined);
      
      await store.deleteAllData();
      
      expect(store.recordsOperation.error).toBeNull();
      expect(store.fieldsOperation.error).toBeNull();
    });

    it('エラー発生時にローディング状態がロールバックされる', async () => {
      const error = new Error('Delete failed');
      mockDeleteAllData.mockRejectedValue(error);
      
      try {
        await store.deleteAllData();
      } catch {
        // エラーを無視
      }
      
      expect(store.recordsOperation.loading).toBe(false);
      expect(store.fieldsOperation.loading).toBe(false);
    });
  });
});