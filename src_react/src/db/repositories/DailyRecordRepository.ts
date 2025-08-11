import type { DailyFieldV2, DailyRecordV2 } from '../../types/record';
import { STORE_NAMES } from '../config';
import { executeTransaction } from '../connection';
import { trackDbOperation } from '../performance';
import {
  BaseRepository,
  type OperationResult,
  type QueryOptions,
} from '../repository';

export interface DailyRecordQuery extends QueryOptions<DailyRecordV2> {
  dateRange?: { start: string; end: string };
}

export class DailyRecordRepository extends BaseRepository<DailyRecordV2> {
  constructor() {
    super(STORE_NAMES.DAILY_RECORDS);
  }

  protected upgradeDatabase(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      db.createObjectStore(this.storeName, { keyPath: 'id' });
    }
  }

  async getAll(): Promise<OperationResult<DailyRecordV2[]>> {
    return trackDbOperation('get-all-daily-records', async () => {
      try {
        const records = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_tx, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<DailyRecordV2[]>((resolve, reject) => {
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

  async getById(id: string): Promise<OperationResult<DailyRecordV2>> {
    return trackDbOperation('get-daily-record-by-id', async () => {
      try {
        const record = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_tx, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<DailyRecordV2>((resolve, reject) => {
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

  async add(record: DailyRecordV2): Promise<OperationResult<DailyRecordV2>> {
    return trackDbOperation(
      'add-daily-record',
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

  async update(record: DailyRecordV2): Promise<OperationResult<DailyRecordV2>> {
    return trackDbOperation(
      'update-daily-record',
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
      'delete-daily-record',
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
    return trackDbOperation('delete-all-daily-records', async () => {
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

  async search(
    options: DailyRecordQuery
  ): Promise<OperationResult<DailyRecordV2[]>> {
    return trackDbOperation('search-daily-records', async () => {
      try {
        const all = await this.getAll();
        if (!all.success || !all.data) return all;
        let filtered = all.data;
        if (options.where) {
          filtered = filtered.filter(r =>
            Object.entries(options.where!).every(
              ([k, v]) => r[k as keyof DailyRecordV2] === v
            )
          );
        }
        if (options.dateRange) {
          const { start, end } = options.dateRange;
          filtered = filtered.filter(r => r.date >= start && r.date <= end);
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
}

export class DailyFieldRepository extends BaseRepository<DailyFieldV2> {
  constructor() {
    super(STORE_NAMES.DAILY_FIELDS);
  }

  protected upgradeDatabase(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      db.createObjectStore(this.storeName, { keyPath: 'fieldId' });
    }
  }

  async getAll(): Promise<OperationResult<DailyFieldV2[]>> {
    return trackDbOperation('get-all-daily-fields', async () => {
      try {
        const records = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_tx, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<DailyFieldV2[]>((resolve, reject) => {
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

  async getById(fieldId: string): Promise<OperationResult<DailyFieldV2>> {
    return trackDbOperation('get-daily-field-by-id', async () => {
      try {
        const record = await executeTransaction(
          this.storeName as any,
          'readonly',
          async (_tx, store) => {
            const objectStore = store as IDBObjectStore;
            return new Promise<DailyFieldV2>((resolve, reject) => {
              const request = objectStore.get(fieldId);
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

  async add(field: DailyFieldV2): Promise<OperationResult<DailyFieldV2>> {
    return trackDbOperation(
      'add-daily-field',
      async () => {
        try {
          await executeTransaction(
            this.storeName as any,
            'readwrite',
            async (_tx, store) => {
              const objectStore = store as IDBObjectStore;
              return new Promise<void>((resolve, reject) => {
                const request = objectStore.put(field);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
              });
            }
          );
          return { success: true, data: field, recordsAffected: 1 };
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

  async update(field: DailyFieldV2): Promise<OperationResult<DailyFieldV2>> {
    return trackDbOperation(
      'update-daily-field',
      async () => {
        try {
          await executeTransaction(
            this.storeName as any,
            'readwrite',
            async (_tx, store) => {
              const objectStore = store as IDBObjectStore;
              return new Promise<void>((resolve, reject) => {
                const request = objectStore.put(field);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
              });
            }
          );
          return { success: true, data: field, recordsAffected: 1 };
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

  async delete(fieldId: string): Promise<OperationResult<void>> {
    return trackDbOperation(
      'delete-daily-field',
      async () => {
        try {
          await executeTransaction(
            this.storeName as any,
            'readwrite',
            async (_tx, store) => {
              const objectStore = store as IDBObjectStore;
              return new Promise<void>((resolve, reject) => {
                const request = objectStore.delete(fieldId);
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
}

export const dailyRecordRepository = new DailyRecordRepository();
export const dailyFieldRepository = new DailyFieldRepository();
