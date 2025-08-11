import type { BpRecordV2 } from '../../types/record';
import { STORE_NAMES } from '../config';
import { executeTransaction } from '../connection';
import { trackDbOperation } from '../performance';
import {
  BaseRepository,
  type OperationResult,
  type QueryOptions,
} from '../repository';

export interface BpRecordQuery extends QueryOptions<BpRecordV2> {
  dateRange?: { start: string; end: string };
  excludeFromGraph?: boolean;
}

export interface BpRecordStats {
  recordCount: number;
  avgSystolic: number;
  avgDiastolic: number;
  minSystolic: number;
  maxSystolic: number;
  minDiastolic: number;
  maxDiastolic: number;
}

export class BpRecordRepository extends BaseRepository<BpRecordV2> {
  constructor() {
    super(STORE_NAMES.BP_RECORDS);
  }

  protected upgradeDatabase(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
      store.createIndex('date', 'date', { unique: false });
      store.createIndex('fieldId', 'fieldId', { unique: false });
      store.createIndex('excludeFromGraph', 'excludeFromGraph', {
        unique: false,
      });
    }
  }

  async getAll(): Promise<OperationResult<BpRecordV2[]>> {
    return trackDbOperation('get-all-bp-records', async () => {
      try {
        const records = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_tx, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<BpRecordV2[]>((resolve, reject) => {
              const request = objectStore.getAll();
              request.onsuccess = () => resolve(request.result || []);
              request.onerror = () => reject(request.error);
            });
          }
        );
        return {
          success: true,
          data: records,
          recordsAffected: records.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  async getById(id: string): Promise<OperationResult<BpRecordV2>> {
    return trackDbOperation('get-bp-record-by-id', async () => {
      try {
        const record = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_tx, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<BpRecordV2>((resolve, reject) => {
              const request = objectStore.get(id);
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
          }
        );
        if (!record) return { success: false, error: 'Record not found' };
        return { success: true, data: record };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  async add(record: BpRecordV2): Promise<OperationResult<BpRecordV2>> {
    return trackDbOperation(
      'add-bp-record',
      async () => {
        try {
          await executeTransaction(
            this.storeName as any,
            'readwrite',
            async (_tx, store) => {
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
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
      1
    );
  }

  async update(record: BpRecordV2): Promise<OperationResult<BpRecordV2>> {
    return trackDbOperation(
      'update-bp-record',
      async () => {
        try {
          await executeTransaction(
            this.storeName as any,
            'readwrite',
            async (_tx, store) => {
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
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
      1
    );
  }

  async delete(id: string): Promise<OperationResult<void>> {
    return trackDbOperation(
      'delete-bp-record',
      async () => {
        try {
          await executeTransaction(
            this.storeName as any,
            'readwrite',
            async (_tx, store) => {
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
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
      1
    );
  }

  async deleteAll(): Promise<OperationResult<void>> {
    return trackDbOperation('delete-all-bp-records', async () => {
      try {
        await executeTransaction(
          this.storeName as any,
          'readwrite',
          async (_tx, store) => {
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
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  async search(options: BpRecordQuery): Promise<OperationResult<BpRecordV2[]>> {
    return trackDbOperation('search-bp-records', async () => {
      try {
        const all = await this.getAll();
        if (!all.success || !all.data) return all;
        let filtered = all.data;

        if (options.where) {
          filtered = filtered.filter(r =>
            Object.entries(options.where!).every(
              ([k, v]) => r[k as keyof BpRecordV2] === v
            )
          );
        }
        if (options.dateRange) {
          const { start, end } = options.dateRange;
          filtered = filtered.filter(r => r.date >= start && r.date <= end);
        }
        if (options.excludeFromGraph !== undefined) {
          filtered = filtered.filter(
            r => Boolean(r.excludeFromGraph) === options.excludeFromGraph
          );
        }
        if (options.orderBy) {
          filtered.sort((a, b) => {
            const aVal = a[options.orderBy!];
            const bVal = b[options.orderBy!];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return options.order === 'desc' ? -cmp : cmp;
          });
        }
        if (options.offset || options.limit) {
          const start = options.offset || 0;
          const end = options.limit ? start + options.limit : undefined;
          filtered = filtered.slice(start, end);
        }
        return {
          success: true,
          data: filtered,
          recordsAffected: filtered.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  async count(): Promise<OperationResult<number>> {
    return trackDbOperation('count-bp-records', async () => {
      try {
        const count = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_tx, store) => {
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
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  async getStats(): Promise<OperationResult<BpRecordStats>> {
    return trackDbOperation('get-bp-record-stats', async () => {
      try {
        const all = await this.getAll();
        if (!all.success || !all.data)
          return { success: false, error: 'Failed to get records for stats' };
        const records = all.data;
        if (records.length === 0) {
          return {
            success: true,
            data: {
              recordCount: 0,
              avgSystolic: 0,
              avgDiastolic: 0,
              minSystolic: 0,
              maxSystolic: 0,
              minDiastolic: 0,
              maxDiastolic: 0,
            },
          };
        }
        const sList = records.map(r => r.systolic);
        const dList = records.map(r => r.diastolic);
        const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
        const avgSystolic = Math.round(sum(sList) / sList.length);
        const avgDiastolic = Math.round(sum(dList) / dList.length);
        return {
          success: true,
          data: {
            recordCount: records.length,
            avgSystolic,
            avgDiastolic,
            minSystolic: Math.min(...sList),
            maxSystolic: Math.max(...sList),
            minDiastolic: Math.min(...dList),
            maxDiastolic: Math.max(...dList),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }
}

export const bpRecordRepository = new BpRecordRepository();
