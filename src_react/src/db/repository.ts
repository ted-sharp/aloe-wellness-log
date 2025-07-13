// 型安全なデータベースリポジトリパターンの実装

import type { WeightRecordV2 } from '../types/record';

// 基本的なレコード型（すべてのレコードが持つべき最小限のフィールド）
export interface BaseRecord {
  id: string;
}

// データベース操作の結果型
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  recordsAffected?: number;
}

// 検索条件の型
export interface QueryOptions<T = any> {
  where?: Partial<T>;
  orderBy?: keyof T;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// 統計情報の型
export interface RepositoryStats {
  recordCount: number;
  lastModified?: Date;
  size?: number;
}

/**
 * 型安全なデータベースリポジトリの抽象基底クラス
 */
export abstract class BaseRepository<T extends BaseRecord> {
  constructor(
    protected storeName: string,
    protected dbName: string = 'aloe-wellness-log',
    protected dbVersion: number = 4
  ) {}

  // 抽象メソッド：実装は各具象クラスで行う
  abstract getAll(): Promise<OperationResult<T[]>>;
  abstract getById(id: string): Promise<OperationResult<T>>;
  abstract add(record: Omit<T, 'id'>): Promise<OperationResult<T>>;
  abstract update(record: T): Promise<OperationResult<T>>;
  abstract delete(id: string): Promise<OperationResult<void>>;
  abstract deleteAll(): Promise<OperationResult<void>>;
  abstract search(options: QueryOptions<T>): Promise<OperationResult<T[]>>;
  abstract count(): Promise<OperationResult<number>>;
  abstract getStats(): Promise<OperationResult<RepositoryStats>>;

  // 共通ユーティリティメソッド
  protected async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        reject(new Error(`Database connection failed: ${request.error?.message}`));
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.upgradeDatabase(db, event.oldVersion, event.newVersion || this.dbVersion);
      };
    });
  }

  protected abstract upgradeDatabase(db: IDBDatabase, oldVersion: number, newVersion: number): void;

  protected async executeTransaction<R>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<R>
  ): Promise<R> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.storeName], mode);
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };
      
      operation(store).then(resolve).catch(reject);
    });
  }

  protected generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 体重記録リポジトリ
 */
export class WeightRecordRepository extends BaseRepository<WeightRecordV2> {
  constructor() {
    super('weight_records');
  }

  protected upgradeDatabase(db: IDBDatabase, _oldVersion: number, _newVersion: number): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
      store.createIndex('date', 'date', { unique: false });
      store.createIndex('weight', 'weight', { unique: false });
    }
  }

  async getAll(): Promise<OperationResult<WeightRecordV2[]>> {
    try {
      const records = await this.executeTransaction('readonly', async (store) => {
        return new Promise<WeightRecordV2[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

      return { success: true, data: records, recordsAffected: records.length };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getById(id: string): Promise<OperationResult<WeightRecordV2>> {
    try {
      const record = await this.executeTransaction('readonly', async (store) => {
        return new Promise<WeightRecordV2>((resolve, reject) => {
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

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
  }

  async add(recordData: Omit<WeightRecordV2, 'id'>): Promise<OperationResult<WeightRecordV2>> {
    try {
      const record: WeightRecordV2 = {
        ...recordData,
        id: this.generateId(),
      };

      await this.executeTransaction('readwrite', async (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.add(record);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      return { success: true, data: record, recordsAffected: 1 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async update(record: WeightRecordV2): Promise<OperationResult<WeightRecordV2>> {
    try {
      await this.executeTransaction('readwrite', async (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.put(record);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      return { success: true, data: record, recordsAffected: 1 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async delete(id: string): Promise<OperationResult<void>> {
    try {
      await this.executeTransaction('readwrite', async (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      return { success: true, recordsAffected: 1 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async deleteAll(): Promise<OperationResult<void>> {
    try {
      await this.executeTransaction('readwrite', async (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async search(options: QueryOptions<WeightRecordV2>): Promise<OperationResult<WeightRecordV2[]>> {
    try {
      const allRecords = await this.getAll();
      if (!allRecords.success || !allRecords.data) {
        return allRecords;
      }

      let filtered = allRecords.data;

      // フィルタリング
      if (options.where) {
        filtered = filtered.filter(record => {
          return Object.entries(options.where!).every(([key, value]) => {
            return record[key as keyof WeightRecordV2] === value;
          });
        });
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
  }

  async count(): Promise<OperationResult<number>> {
    try {
      const count = await this.executeTransaction('readonly', async (store) => {
        return new Promise<number>((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

      return { success: true, data: count };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getStats(): Promise<OperationResult<RepositoryStats>> {
    try {
      const countResult = await this.count();
      if (!countResult.success) {
        return { success: false, error: 'Failed to get count' };
      }

      const allRecords = await this.getAll();
      if (!allRecords.success || !allRecords.data) {
        return { success: false, error: 'Failed to get records for stats' };
      }

      const lastModified = allRecords.data.length > 0
        ? new Date(Math.max(...allRecords.data.map(r => new Date(r.date).getTime())))
        : undefined;

      return {
        success: true,
        data: {
          recordCount: countResult.data!,
          lastModified,
          size: JSON.stringify(allRecords.data).length,
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 体重記録特有のメソッド
  async getByDateRange(startDate: string, endDate: string): Promise<OperationResult<WeightRecordV2[]>> {
    return this.search({
      where: {},
      orderBy: 'date',
      order: 'asc',
    }).then(result => {
      if (!result.success || !result.data) return result;
      
      const filtered = result.data.filter(record => 
        record.date >= startDate && record.date <= endDate
      );
      
      return { ...result, data: filtered, recordsAffected: filtered.length };
    });
  }

  async getLatest(limit: number = 10): Promise<OperationResult<WeightRecordV2[]>> {
    return this.search({
      orderBy: 'date',
      order: 'desc',
      limit,
    });
  }
}

// シングルトンインスタンス
export const weightRecordRepository = new WeightRecordRepository();

// 血圧記録、日課記録、目標データ用のリポジトリも同様に実装可能
// 例：BpRecordRepository, DailyRecordRepository, GoalRepository など