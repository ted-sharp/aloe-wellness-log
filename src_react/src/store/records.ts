import { create } from 'zustand';
import * as db from '../db/indexedDb';
import { DbError, DbErrorType } from '../db/indexedDb';

// 操作状態の定義
interface OperationState {
  loading: boolean;
  error: DbError | null;
}

type RecordsState = {
  // 操作状態
  recordsOperation: OperationState;
  fieldsOperation: OperationState;

  deleteAllData: () => Promise<void>;

  // エラー状態クリア
  clearRecordsError: () => void;
  clearFieldsError: () => void;
};

export const useRecordsStore = create<RecordsState>((set) => ({
  recordsOperation: { loading: false, error: null },
  fieldsOperation: { loading: false, error: null },

  // エラー状態クリア
  clearRecordsError: () => {
    set(state => ({
      recordsOperation: { ...state.recordsOperation, error: null },
    }));
  },

  clearFieldsError: () => {
    set(state => ({
      fieldsOperation: { ...state.fieldsOperation, error: null },
    }));
  },

  deleteAllData: async () => {
    // 楽観的更新
    set({
      recordsOperation: { loading: true, error: null },
      fieldsOperation: { loading: true, error: null },
    });

    try {
      await db.deleteAllData();
      set({
        recordsOperation: { loading: false, error: null },
        fieldsOperation: { loading: false, error: null },
      });
    } catch (error) {
      // ロールバック
      const dbError =
        error instanceof DbError
          ? error
          : new DbError(
              DbErrorType.UNKNOWN,
              '全データ削除に失敗しました',
              error
            );

      set({
        recordsOperation: { loading: false, error: dbError },
        fieldsOperation: { loading: false, error: dbError },
      });
      throw error;
    }
  },
}));