/**
 * 統合データベース API
 *
 * このファイルは、アプリケーション全体で使用される
 * データベース操作の統一インターフェースを提供します。
 *
 * 旧来の indexedDb.ts を置き換え、
 * 責任が分離された各クラスへの統一アクセス点となります。
 */

// コアコンポーネント
export { DATABASE_CONFIG, STORE_NAMES, type StoreName } from './config';
export { dbConnection, executeTransaction, openDb } from './connection';
export {
  DbError,
  DbErrorType,
  classifyDbError,
  isRetryableError,
} from './errors';
export {
  clearPerformanceMetrics,
  getPerformanceStats,
  trackDbOperation,
} from './performance';

// リポジトリクラス
export {
  BpRecordRepository,
  bpRecordRepository,
} from './repositories/BpRecordRepository';
export {
  DailyFieldRepository,
  DailyRecordRepository,
  dailyFieldRepository,
  dailyRecordRepository,
} from './repositories/DailyRecordRepository';
export { GoalRepository, goalRepository } from './repositories/GoalRepository';
export {
  WeightRecordRepository,
  weightRecordRepository,
} from './repositories/WeightRecordRepository';

// 型定義
export type {
  GoalOperationResult,
  GoalStats,
} from './repositories/GoalRepository';
export type {
  WeightRecordQuery,
  WeightRecordStats,
} from './repositories/WeightRecordRepository';
export type { OperationResult, QueryOptions } from './repository';

// 旧来の関数との互換性のための便利な関数
import type { GoalData } from '../types/goal';
import type { WeightRecordV2 } from '../types/record';
import { bpRecordRepository } from './repositories/BpRecordRepository';
import {
  dailyFieldRepository,
  dailyRecordRepository,
} from './repositories/DailyRecordRepository';
import { goalRepository } from './repositories/GoalRepository';
import { weightRecordRepository } from './repositories/WeightRecordRepository';

// === 体重記録関連の便利な関数 ===

/**
 * 体重記録の追加
 * @deprecated weightRecordRepository.add() を直接使用してください
 */
export async function addWeightRecord(record: WeightRecordV2): Promise<void> {
  const result = await weightRecordRepository.add(record);
  if (!result.success) {
    throw new Error(result.error || 'Failed to add weight record');
  }
}

/**
 * 全体重記録の取得
 * @deprecated weightRecordRepository.getAll() を直接使用してください
 */
export async function getAllWeightRecords(): Promise<WeightRecordV2[]> {
  const result = await weightRecordRepository.getAll();
  if (!result.success) {
    throw new Error(result.error || 'Failed to get weight records');
  }
  return result.data || [];
}

/**
 * 体重記録の更新
 * @deprecated weightRecordRepository.update() を直接使用してください
 */
export async function updateWeightRecord(
  record: WeightRecordV2
): Promise<void> {
  const result = await weightRecordRepository.update(record);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update weight record');
  }
}

/**
 * 体重記録の削除
 * @deprecated weightRecordRepository.delete() を直接使用してください
 */
export async function deleteWeightRecord(id: string): Promise<void> {
  const result = await weightRecordRepository.delete(id);
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete weight record');
  }
}

// === 目標データ関連の便利な関数 ===

/**
 * 目標データの保存
 * @deprecated goalRepository.setGoal() を直接使用してください
 */
export async function setGoalData(goal: GoalData): Promise<void> {
  const result = await goalRepository.setGoal(goal);
  if (!result.success) {
    throw new Error(result.error || 'Failed to set goal data');
  }
}

/**
 * 目標データの取得
 * @deprecated goalRepository.getGoal() を直接使用してください
 */
export async function getGoalData(): Promise<GoalData | null> {
  const result = await goalRepository.getGoal();
  if (!result.success) {
    return null;
  }
  return result.data || null;
}

/**
 * 目標データの削除
 * @deprecated goalRepository.clearGoal() を直接使用してください
 */
export async function clearGoalData(): Promise<void> {
  const result = await goalRepository.clearGoal();
  if (!result.success) {
    throw new Error(result.error || 'Failed to clear goal data');
  }
}

// === その他のデータベース操作 ===

/**
 * 血圧記録の追加（旧来の関数の簡単な実装）
 * TODO: BpRecordRepository の実装後に置き換える
 */
export async function addBpRecord(
  record: import('../types/record').BpRecordV2
): Promise<void> {
  const result = await bpRecordRepository.add(record);
  if (!result.success)
    throw new Error(result.error || 'Failed to add BP record');
}

/**
 * 血圧記録の全件取得（旧来の関数の簡単な実装）
 * TODO: BpRecordRepository の実装後に置き換える
 */
export async function getAllBpRecords(): Promise<
  import('../types/record').BpRecordV2[]
> {
  const result = await bpRecordRepository.getAll();
  if (!result.success)
    throw new Error(result.error || 'Failed to get BP records');
  return result.data || [];
}

/**
 * 血圧記録の更新（旧来の関数の簡単な実装）
 */
export async function updateBpRecord(
  record: import('../types/record').BpRecordV2
): Promise<void> {
  const result = await bpRecordRepository.update(record);
  if (!result.success)
    throw new Error(result.error || 'Failed to update BP record');
}

/**
 * 血圧記録の削除（旧来の関数の簡単な実装）
 */
export async function deleteBpRecord(id: string): Promise<void> {
  const result = await bpRecordRepository.delete(id);
  if (!result.success)
    throw new Error(result.error || 'Failed to delete BP record');
}

/**
 * 日課記録の追加（旧来の関数の簡単な実装）
 * TODO: DailyRecordRepository の実装後に置き換える
 */
export async function addDailyRecord(
  record: import('../types/record').DailyRecordV2
): Promise<void> {
  const result = await dailyRecordRepository.add(record);
  if (!result.success)
    throw new Error(result.error || 'Failed to add daily record');
}

/**
 * 日課記録の全件取得（旧来の関数の簡単な実装）
 */
export async function getAllDailyRecords(): Promise<
  import('../types/record').DailyRecordV2[]
> {
  const result = await dailyRecordRepository.getAll();
  if (!result.success)
    throw new Error(result.error || 'Failed to get daily records');
  return result.data || [];
}

/**
 * 日課記録の更新（旧来の関数の簡単な実装）
 */
export async function updateDailyRecord(
  record: import('../types/record').DailyRecordV2
): Promise<void> {
  const result = await dailyRecordRepository.update(record);
  if (!result.success)
    throw new Error(result.error || 'Failed to update daily record');
}

/**
 * 日課記録の削除（旧来の関数の簡単な実装）
 */
export async function deleteDailyRecord(id: string): Promise<void> {
  const result = await dailyRecordRepository.delete(id);
  if (!result.success)
    throw new Error(result.error || 'Failed to delete daily record');
}

/**
 * 日課フィールドの追加（旧来の関数の簡単な実装）
 */
export async function addDailyField(
  field: import('../types/record').DailyFieldV2
): Promise<void> {
  const result = await dailyFieldRepository.add(field);
  if (!result.success)
    throw new Error(result.error || 'Failed to add daily field');
}

/**
 * 日課フィールドの全件取得（旧来の関数の簡単な実装）
 */
export async function getAllDailyFields(): Promise<
  import('../types/record').DailyFieldV2[]
> {
  const result = await dailyFieldRepository.getAll();
  if (!result.success)
    throw new Error(result.error || 'Failed to get daily fields');
  return result.data || [];
}

/**
 * 日課フィールドの更新（旧来の関数の簡単な実装）
 */
export async function updateDailyField(
  field: import('../types/record').DailyFieldV2
): Promise<void> {
  const result = await dailyFieldRepository.update(field);
  if (!result.success)
    throw new Error(result.error || 'Failed to update daily field');
}

/**
 * 日課フィールドの削除（旧来の関数の簡単な実装）
 */
export async function deleteDailyField(fieldId: string): Promise<void> {
  const result = await dailyFieldRepository.delete(fieldId);
  if (!result.success)
    throw new Error(result.error || 'Failed to delete daily field');
}

/**
 * 全データ削除（記録と項目の両方）
 */
export async function deleteAllData(): Promise<void> {
  const { executeTransaction } = await import('./connection');
  const { STORE_NAMES } = await import('./config');
  const { trackDbOperation } = await import('./performance');

  return trackDbOperation('delete-all-data', async () => {
    await executeTransaction(
      [
        STORE_NAMES.GOAL,
        STORE_NAMES.WEIGHT_RECORDS,
        STORE_NAMES.BP_RECORDS,
        STORE_NAMES.DAILY_RECORDS,
        STORE_NAMES.DAILY_FIELDS,
      ],
      'readwrite',
      async (_transaction, stores) => {
        const storeArray = stores as IDBObjectStore[];
        const [
          goalStore,
          weightStore,
          bpStore,
          dailyRecordStore,
          dailyFieldStore,
        ] = storeArray;

        return new Promise<void>((resolve, reject) => {
          let completedOperations = 0;
          const totalOperations = 5;

          const checkCompletion = () => {
            completedOperations++;
            if (completedOperations === totalOperations) {
              resolve();
            }
          };

          const handleError = (error: any) => reject(error);

          // 全ストアのクリア
          const goalRequest = goalStore.clear();
          goalRequest.onsuccess = checkCompletion;
          goalRequest.onerror = () => handleError(goalRequest.error);

          const weightRequest = weightStore.clear();
          weightRequest.onsuccess = checkCompletion;
          weightRequest.onerror = () => handleError(weightRequest.error);

          const bpRequest = bpStore.clear();
          bpRequest.onsuccess = checkCompletion;
          bpRequest.onerror = () => handleError(bpRequest.error);

          const dailyRecordRequest = dailyRecordStore.clear();
          dailyRecordRequest.onsuccess = checkCompletion;
          dailyRecordRequest.onerror = () =>
            handleError(dailyRecordRequest.error);

          const dailyFieldRequest = dailyFieldStore.clear();
          dailyFieldRequest.onsuccess = checkCompletion;
          dailyFieldRequest.onerror = () =>
            handleError(dailyFieldRequest.error);
        });
      }
    );
  });
}
