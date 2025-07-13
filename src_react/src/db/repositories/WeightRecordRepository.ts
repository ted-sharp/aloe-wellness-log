import type { WeightRecordV2 } from '../../types/record';
import { BaseRepository, type OperationResult, type QueryOptions } from '../repository';
import { STORE_NAMES } from '../config';
import { trackDbOperation } from '../performance';
import { executeTransaction } from '../connection';

/**
 * 体重記録専用のクエリオプション
 */
export interface WeightRecordQuery extends QueryOptions<WeightRecordV2> {
  dateRange?: {
    start: string;
    end: string;
  };
  excludeFromGraph?: boolean;
  weightRange?: {
    min: number;
    max: number;
  };
}

/**
 * 体重記録の統計情報
 */
export interface WeightRecordStats {
  recordCount: number;
  totalRecords: number;
  averageWeight: number;
  minWeight: number;
  maxWeight: number;
  weightTrend: 'increasing' | 'decreasing' | 'stable';
  lastRecord?: WeightRecordV2;
  recordsThisMonth: number;
  recordsThisWeek: number;
}

/**
 * 体重記録専用リポジトリ
 */
export class WeightRecordRepository extends BaseRepository<WeightRecordV2> {
  constructor() {
    super(STORE_NAMES.WEIGHT_RECORDS);
  }

  protected upgradeDatabase(db: IDBDatabase, _oldVersion: number, _newVersion: number): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
      store.createIndex('date', 'date', { unique: false });
      store.createIndex('weight', 'weight', { unique: false });
      store.createIndex('excludeFromGraph', 'excludeFromGraph', { unique: false });
    }
  }

  /**
   * 全ての体重記録を取得
   */
  async getAll(): Promise<OperationResult<WeightRecordV2[]>> {
    return trackDbOperation('get-all-weight-records', async () => {
      try {
        const records = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<WeightRecordV2[]>((resolve, reject) => {
              const request = objectStore.getAll();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
          }
        );

        return { success: true, data: records, recordsAffected: records.length };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  }

  /**
   * IDで体重記録を取得
   */
  async getById(id: string): Promise<OperationResult<WeightRecordV2>> {
    return trackDbOperation('get-weight-record-by-id', async () => {
      try {
        const record = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<WeightRecordV2>((resolve, reject) => {
              const request = objectStore.get(id);
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
          }
        );

        if (!record) {
          return { success: false, error: 'Record not found' };
        }

        return { success: true, data: record };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  }

  /**
   * 体重記録を追加
   */
  async add(recordData: Omit<WeightRecordV2, 'id'>): Promise<OperationResult<WeightRecordV2>> {
    return trackDbOperation('add-weight-record', async () => {
      try {
        const record: WeightRecordV2 = {
          ...recordData,
          id: this.generateId(),
        };

        await executeTransaction(
          this.storeName as any,
          'readwrite',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<void>((resolve, reject) => {
              const request = objectStore.add(record);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        );

        return { success: true, data: record, recordsAffected: 1 };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }, 1);
  }

  /**
   * 体重記録を更新
   */
  async update(record: WeightRecordV2): Promise<OperationResult<WeightRecordV2>> {
    return trackDbOperation('update-weight-record', async () => {
      try {
        await executeTransaction(
          this.storeName as any,
          'readwrite',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<void>((resolve, reject) => {
              const request = objectStore.put(record);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        );

        return { success: true, data: record, recordsAffected: 1 };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }, 1);
  }

  /**
   * 体重記録を削除
   */
  async delete(id: string): Promise<OperationResult<void>> {
    return trackDbOperation('delete-weight-record', async () => {
      try {
        await executeTransaction(
          this.storeName as any,
          'readwrite',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<void>((resolve, reject) => {
              const request = objectStore.delete(id);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        );

        return { success: true, recordsAffected: 1 };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }, 1);
  }

  /**
   * 全ての体重記録を削除
   */
  async deleteAll(): Promise<OperationResult<void>> {
    return trackDbOperation('delete-all-weight-records', async () => {
      try {
        await executeTransaction(
          this.storeName as any,
          'readwrite',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<void>((resolve, reject) => {
              const request = objectStore.clear();
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        );

        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  }

  /**
   * 体重記録の検索
   */
  async search(options: WeightRecordQuery): Promise<OperationResult<WeightRecordV2[]>> {
    return trackDbOperation('search-weight-records', async () => {
      try {
        const allRecords = await this.getAll();
        if (!allRecords.success || !allRecords.data) {
          return allRecords;
        }

        let filtered = allRecords.data;

        // 基本的なフィルタリング
        if (options.where) {
          filtered = filtered.filter(record => {
            return Object.entries(options.where!).every(([key, value]) => {
              return record[key as keyof WeightRecordV2] === value;
            });
          });
        }

        // 日付範囲フィルタリング
        if (options.dateRange) {
          filtered = filtered.filter(record => 
            record.date >= options.dateRange!.start && 
            record.date <= options.dateRange!.end
          );
        }

        // グラフ除外フィルタリング
        if (options.excludeFromGraph !== undefined) {
          filtered = filtered.filter(record => 
            Boolean(record.excludeFromGraph) === options.excludeFromGraph
          );
        }

        // 体重範囲フィルタリング
        if (options.weightRange) {
          filtered = filtered.filter(record => 
            record.weight >= options.weightRange!.min && 
            record.weight <= options.weightRange!.max
          );
        }

        // ソート
        if (options.orderBy) {
          filtered.sort((a, b) => {
            const aVal = a[options.orderBy!];
            const bVal = b[options.orderBy!];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return options.order === 'desc' ? -comparison : comparison;
          });
        }

        // ページング
        if (options.offset || options.limit) {
          const start = options.offset || 0;
          const end = options.limit ? start + options.limit : undefined;
          filtered = filtered.slice(start, end);
        }

        return { success: true, data: filtered, recordsAffected: filtered.length };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  }

  /**
   * 体重記録の件数を取得
   */
  async count(): Promise<OperationResult<number>> {
    return trackDbOperation('count-weight-records', async () => {
      try {
        const count = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_transaction, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<number>((resolve, reject) => {
              const request = objectStore.count();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
          }
        );

        return { success: true, data: count };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  }

  /**
   * 基本的な統計情報を取得
   */
  async getStats(): Promise<OperationResult<WeightRecordStats>> {
    return trackDbOperation('get-weight-record-stats', async () => {
      try {
        const allRecords = await this.getAll();
        if (!allRecords.success || !allRecords.data) {
          return { success: false, error: 'Failed to get records for stats' };
        }

        const records = allRecords.data;
        if (records.length === 0) {
          return {
            success: true,
            data: {
              recordCount: 0,
              totalRecords: 0,
              averageWeight: 0,
              minWeight: 0,
              maxWeight: 0,
              weightTrend: 'stable',
              recordsThisMonth: 0,
              recordsThisWeek: 0,
            }
          };
        }

        // 基本統計
        const weights = records.map(r => r.weight);
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);
        const averageWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;

        // 最新記録
        const sortedRecords = records.sort((a, b) => b.date.localeCompare(a.date));
        const lastRecord = sortedRecords[0];

        // トレンド計算（直近5件で判定）
        const recentRecords = sortedRecords.slice(0, 5);
        let weightTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        
        if (recentRecords.length >= 2) {
          const firstWeight = recentRecords[recentRecords.length - 1].weight;
          const lastWeight = recentRecords[0].weight;
          const difference = lastWeight - firstWeight;
          
          if (difference > 0.5) {
            weightTrend = 'increasing';
          } else if (difference < -0.5) {
            weightTrend = 'decreasing';
          }
        }

        // 期間別記録数
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const thisWeekStartStr = thisWeekStart.toISOString().slice(0, 10);

        const recordsThisMonth = records.filter(r => r.date.startsWith(thisMonth)).length;
        const recordsThisWeek = records.filter(r => r.date >= thisWeekStartStr).length;

        return {
          success: true,
          data: {
            recordCount: records.length,
            totalRecords: records.length,
            averageWeight,
            minWeight,
            maxWeight,
            weightTrend,
            lastRecord,
            recordsThisMonth,
            recordsThisWeek,
          }
        };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  }

  /**
   * 日付範囲での体重記録取得
   */
  async getByDateRange(startDate: string, endDate: string): Promise<OperationResult<WeightRecordV2[]>> {
    return this.search({
      dateRange: { start: startDate, end: endDate },
      orderBy: 'date',
      order: 'asc',
    });
  }

  /**
   * 最新の体重記録を取得
   */
  async getLatest(limit: number = 10): Promise<OperationResult<WeightRecordV2[]>> {
    return this.search({
      orderBy: 'date',
      order: 'desc',
      limit,
    });
  }

  /**
   * グラフ用の体重記録を取得（グラフから除外されていないもののみ）
   */
  async getForGraph(): Promise<OperationResult<WeightRecordV2[]>> {
    return this.search({
      excludeFromGraph: false,
      orderBy: 'date',
      order: 'asc',
    });
  }
}

// シングルトンインスタンス
export const weightRecordRepository = new WeightRecordRepository();