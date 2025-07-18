import { makeAutoObservable, runInAction } from 'mobx';
import { deleteAllData } from '../db';
import { DbError, DbErrorType } from '../db';

// 操作状態の定義
interface OperationState {
  loading: boolean;
  error: DbError | null;
}

export class RecordsStore {
  // 操作状態
  recordsOperation: OperationState = { loading: false, error: null };
  fieldsOperation: OperationState = { loading: false, error: null };

  constructor() {
    makeAutoObservable(this);
  }

  // エラー状態クリア
  clearRecordsError = () => {
    this.recordsOperation.error = null;
  };

  clearFieldsError = () => {
    this.fieldsOperation.error = null;
  };

  deleteAllData = async () => {
    // 楽観的更新
    runInAction(() => {
      this.recordsOperation = { loading: true, error: null };
      this.fieldsOperation = { loading: true, error: null };
    });

    try {
      await deleteAllData();
      runInAction(() => {
        this.recordsOperation = { loading: false, error: null };
        this.fieldsOperation = { loading: false, error: null };
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

      runInAction(() => {
        this.recordsOperation = { loading: false, error: dbError };
        this.fieldsOperation = { loading: false, error: dbError };
      });
      throw error;
    }
  };
}

// シングルトンインスタンス
export const recordsStore = new RecordsStore();

// React Hook（既存のコンポーネントとの互換性のため）
export const useRecordsStore = () => ({
  recordsOperation: recordsStore.recordsOperation,
  fieldsOperation: recordsStore.fieldsOperation,
  clearRecordsError: recordsStore.clearRecordsError,
  clearFieldsError: recordsStore.clearFieldsError,
  deleteAllData: recordsStore.deleteAllData,
});