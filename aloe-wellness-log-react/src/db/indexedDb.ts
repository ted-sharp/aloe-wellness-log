import type { Field, RecordItem } from '../types/record';
import { isDev } from '../utils/devTools';
import { performanceMonitor } from '../utils/performanceMonitor';

const DB_NAME = 'aloe-wellness-log';
const DB_VERSION = 1;
const RECORDS_STORE = 'records';
const FIELDS_STORE = 'fields';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1秒

// データベースエラーの種類
export enum DbErrorType {
  CONNECTION_FAILED = 'connection_failed',
  TRANSACTION_FAILED = 'transaction_failed',
  DATA_CORRUPTED = 'data_corrupted',
  QUOTA_EXCEEDED = 'quota_exceeded',
  VERSION_ERROR = 'version_error',
  UNKNOWN = 'unknown',
}

// カスタムデータベースエラー
export class DbError extends Error {
  constructor(
    public type: DbErrorType,
    message: string,
    public originalError?: unknown,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'DbError';
  }
}

// パフォーマンス監視付きの操作実行ヘルパー
async function trackDbOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  recordCount?: number
): Promise<T> {
  const operationId = `${operationName}-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  performanceMonitor.trackDatabase.start(operationId, operationName);

  try {
    const result = await operation();
    const duration = performanceMonitor.trackDatabase.end(
      operationId,
      operationName,
      recordCount
    );

    // 開発環境での詳細ログ
    if (isDev) {
      const formattedDuration = duration.toFixed(2);
      const recordInfo = recordCount ? ` (${recordCount} records)` : '';
      console.log(
        `💾 DB ${operationName}: ${formattedDuration}ms${recordInfo}`
      );

      // 遅い操作の警告
      if (duration > 100) {
        console.warn(
          `🐌 Slow DB operation: ${operationName} took ${formattedDuration}ms${recordInfo}`
        );
      }
    }

    return result;
  } catch (error) {
    performanceMonitor.trackDatabase.end(
      operationId,
      operationName,
      recordCount
    );

    // エラー統計の更新
    if (isDev) {
      console.error(`❌ DB ${operationName} failed:`, error);
    }

    throw error;
  }
}

// エラー分類関数
function classifyDbError(error: unknown): DbError {
  if (error instanceof DbError) {
    return error;
  }

  if (error instanceof DOMException) {
    switch (error.name) {
      case 'QuotaExceededError':
        return new DbError(
          DbErrorType.QUOTA_EXCEEDED,
          'ストレージ容量が不足しています',
          error,
          false
        );
      case 'VersionError':
        return new DbError(
          DbErrorType.VERSION_ERROR,
          'データベースのバージョンが競合しています',
          error,
          false
        );
      case 'InvalidStateError':
      case 'TransactionInactiveError':
        return new DbError(
          DbErrorType.TRANSACTION_FAILED,
          'データベーストランザクションが失敗しました',
          error
        );
      case 'DataError':
      case 'ConstraintError':
        return new DbError(
          DbErrorType.DATA_CORRUPTED,
          'データが破損しているか、制約違反です',
          error,
          false
        );
      default:
        return new DbError(
          DbErrorType.UNKNOWN,
          `データベースエラー: ${error.message}`,
          error
        );
    }
  }

  return new DbError(
    DbErrorType.CONNECTION_FAILED,
    'データベース接続に失敗しました',
    error
  );
}

// リトライ機能付きの非同期実行
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: DbError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = classifyDbError(error);

      // リトライ不可能なエラーの場合は即座に失敗
      if (!lastError.retryable) {
        throw lastError;
      }

      // 最後の試行の場合はエラーを投げる
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // リトライ前の待機
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

// 型ガード関数
function isRecordItem(obj: unknown): obj is RecordItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as RecordItem).id === 'string' &&
    typeof (obj as RecordItem).date === 'string' &&
    typeof (obj as RecordItem).time === 'string' &&
    typeof (obj as RecordItem).datetime === 'string' &&
    typeof (obj as RecordItem).fieldId === 'string' &&
    (obj as RecordItem).value !== undefined
  );
}

function isField(obj: unknown): obj is Field {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Field).fieldId === 'string' &&
    typeof (obj as Field).name === 'string' &&
    ['number', 'string', 'boolean'].includes((obj as Field).type)
  );
}

function validateRecords(data: unknown[]): RecordItem[] {
  const validRecords: RecordItem[] = [];
  for (const item of data) {
    if (isRecordItem(item)) {
      validRecords.push(item);
    } else {
      console.warn('Invalid record item found:', item);
    }
  }
  return validRecords;
}

function validateFields(data: unknown[]): Field[] {
  const validFields: Field[] = [];
  for (const item of data) {
    if (isField(item)) {
      validFields.push(item);
    } else {
      console.warn('Invalid field item found:', item);
    }
  }
  return validFields;
}

// データベース接続（リトライ機能付き）
export function openDb(): Promise<IDBDatabase> {
  return withRetry(() => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(RECORDS_STORE)) {
            const recordStore = db.createObjectStore(RECORDS_STORE, {
              keyPath: 'id',
            });
            // インデックスを追加（検索性能向上のため）
            recordStore.createIndex('dateIndex', 'date', { unique: false });
            recordStore.createIndex('fieldIdIndex', 'fieldId', {
              unique: false,
            });
          }
          if (!db.objectStoreNames.contains(FIELDS_STORE)) {
            const fieldStore = db.createObjectStore(FIELDS_STORE, {
              keyPath: 'fieldId',
            });
            fieldStore.createIndex('orderIndex', 'order', { unique: false });
          }
        };

        request.onsuccess = () => {
          const db = request.result;

          // データベースエラーイベントを監視
          db.onerror = event => {
            console.error('Database error:', event);
          };

          // 予期しない終了を監視
          db.onclose = () => {
            console.warn('Database connection closed unexpectedly');
          };

          resolve(db);
        };

        request.onerror = () => {
          reject(
            new DbError(
              DbErrorType.CONNECTION_FAILED,
              'データベースを開けませんでした',
              request.error
            )
          );
        };

        request.onblocked = () => {
          reject(
            new DbError(
              DbErrorType.CONNECTION_FAILED,
              'データベースが他のタブによってブロックされています',
              undefined,
              false
            )
          );
        };
      } catch (error) {
        reject(classifyDbError(error));
      }
    });
  });
}

// トランザクション実行ヘルパー
async function executeTransaction<T>(
  storeName: string | string[],
  mode: IDBTransactionMode,
  operation: (
    transaction: IDBTransaction,
    stores: IDBObjectStore | IDBObjectStore[]
  ) => Promise<T>
): Promise<T> {
  return withRetry(async () => {
    const db = await openDb();

    return new Promise<T>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, mode);

        // タイムアウト設定
        const timeoutId = setTimeout(() => {
          transaction.abort();
          reject(
            new DbError(
              DbErrorType.TRANSACTION_FAILED,
              'トランザクションがタイムアウトしました'
            )
          );
        }, 30000); // 30秒でタイムアウト

        transaction.oncomplete = () => {
          clearTimeout(timeoutId);
          // resolve は operation 内で呼ばれる
        };

        transaction.onerror = () => {
          clearTimeout(timeoutId);
          reject(classifyDbError(transaction.error));
        };

        transaction.onabort = () => {
          clearTimeout(timeoutId);
          reject(
            new DbError(
              DbErrorType.TRANSACTION_FAILED,
              'トランザクションが中断されました'
            )
          );
        };

        // ストア取得
        const stores = Array.isArray(storeName)
          ? storeName.map(name => transaction.objectStore(name))
          : transaction.objectStore(storeName);

        // 操作実行
        operation(transaction, stores).then(resolve).catch(reject);
      } catch (error) {
        reject(classifyDbError(error));
      }
    });
  });
}

// 記録データの追加（既存の場合は更新）
export async function addRecord(record: RecordItem): Promise<void> {
  return trackDbOperation(
    'add-record',
    async () => {
      return executeTransaction(
        RECORDS_STORE,
        'readwrite',
        async (_transaction, store) => {
          const objectStore = store as IDBObjectStore;
          return new Promise<void>((resolve, reject) => {
            const request = objectStore.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(classifyDbError(request.error));
          });
        }
      );
    },
    1
  );
}

// 記録データの全件取得
export async function getAllRecords(): Promise<RecordItem[]> {
  return trackDbOperation('get-all-records', async () => {
    return executeTransaction(
      RECORDS_STORE,
      'readonly',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<RecordItem[]>((resolve, reject) => {
          const request = objectStore.getAll();
          request.onsuccess = () => {
            const data = request.result;
            if (Array.isArray(data)) {
              const validRecords = validateRecords(data);
              resolve(validRecords);
            } else {
              resolve([]);
            }
          };
          request.onerror = () => reject(classifyDbError(request.error));
        });
      }
    );
  });
}

// 記録項目の追加
export async function addField(field: Field): Promise<void> {
  return trackDbOperation(
    'add-field',
    async () => {
      return executeTransaction(
        FIELDS_STORE,
        'readwrite',
        async (_transaction, store) => {
          const objectStore = store as IDBObjectStore;
          return new Promise<void>((resolve, reject) => {
            const request = objectStore.put(field); // addをputに変更
            request.onsuccess = () => resolve();
            request.onerror = () => reject(classifyDbError(request.error));
          });
        }
      );
    },
    1
  );
}

// 記録項目の全件取得
export async function getAllFields(): Promise<Field[]> {
  return trackDbOperation('get-all-fields', async () => {
    return executeTransaction(
      FIELDS_STORE,
      'readonly',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<Field[]>((resolve, reject) => {
          const request = objectStore.getAll();
          request.onsuccess = () => {
            const data = request.result;
            if (Array.isArray(data)) {
              const validFields = validateFields(data);
              resolve(validFields);
            } else {
              resolve([]);
            }
          };
          request.onerror = () => reject(classifyDbError(request.error));
        });
      }
    );
  });
}

// 記録項目の更新
export async function updateField(field: Field): Promise<void> {
  return trackDbOperation(
    'update-field',
    async () => {
      return executeTransaction(
        FIELDS_STORE,
        'readwrite',
        async (_transaction, store) => {
          const objectStore = store as IDBObjectStore;
          return new Promise<void>((resolve, reject) => {
            const request = objectStore.put(field);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(classifyDbError(request.error));
          });
        }
      );
    },
    1
  );
}

// 記録データの更新
export async function updateRecord(record: RecordItem): Promise<void> {
  return trackDbOperation(
    'update-record',
    async () => {
      return executeTransaction(
        RECORDS_STORE,
        'readwrite',
        async (_transaction, store) => {
          const objectStore = store as IDBObjectStore;
          return new Promise<void>((resolve, reject) => {
            const request = objectStore.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(classifyDbError(request.error));
          });
        }
      );
    },
    1
  );
}

// 記録データの削除
export async function deleteRecord(id: string): Promise<void> {
  return trackDbOperation(
    'delete-record',
    async () => {
      return executeTransaction(
        RECORDS_STORE,
        'readwrite',
        async (_transaction, store) => {
          const objectStore = store as IDBObjectStore;
          return new Promise<void>((resolve, reject) => {
            const request = objectStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(classifyDbError(request.error));
          });
        }
      );
    },
    1
  );
}

// フィールド（項目）の削除
export async function deleteField(fieldId: string): Promise<void> {
  return trackDbOperation(
    'delete-field',
    async () => {
      return executeTransaction(
        FIELDS_STORE,
        'readwrite',
        async (_transaction, store) => {
          const objectStore = store as IDBObjectStore;
          return new Promise<void>((resolve, reject) => {
            const request = objectStore.delete(fieldId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(classifyDbError(request.error));
          });
        }
      );
    },
    1
  );
}

// 全記録データの削除
export async function deleteAllRecords(): Promise<void> {
  return trackDbOperation('delete-all-records', async () => {
    return executeTransaction(
      RECORDS_STORE,
      'readwrite',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<void>((resolve, reject) => {
          const request = objectStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(classifyDbError(request.error));
        });
      }
    );
  });
}

// 全項目データの削除
export async function deleteAllFields(): Promise<void> {
  return trackDbOperation('delete-all-fields', async () => {
    return executeTransaction(
      FIELDS_STORE,
      'readwrite',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<void>((resolve, reject) => {
          const request = objectStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(classifyDbError(request.error));
        });
      }
    );
  });
}

// 全データ削除（記録と項目の両方）
export async function deleteAllData(): Promise<void> {
  return trackDbOperation('delete-all-data', async () => {
    return executeTransaction(
      [RECORDS_STORE, FIELDS_STORE],
      'readwrite',
      async (_transaction, stores) => {
        const [recordStore, fieldStore] = stores as IDBObjectStore[];

        return new Promise<void>((resolve, reject) => {
          let completedOperations = 0;
          const totalOperations = 2;

          const checkCompletion = () => {
            completedOperations++;
            if (completedOperations === totalOperations) {
              resolve();
            }
          };

          const recordRequest = recordStore.clear();
          recordRequest.onsuccess = checkCompletion;
          recordRequest.onerror = () =>
            reject(classifyDbError(recordRequest.error));

          const fieldRequest = fieldStore.clear();
          fieldRequest.onsuccess = checkCompletion;
          fieldRequest.onerror = () =>
            reject(classifyDbError(fieldRequest.error));
        });
      }
    );
  });
}

// バッチ操作：複数のレコードを一度に追加/更新
export async function batchUpdateRecords(records: RecordItem[]): Promise<void> {
  return trackDbOperation(
    'batch-update-records',
    async () => {
      return executeTransaction(
        RECORDS_STORE,
        'readwrite',
        async (_transaction, store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<void>((resolve, reject) => {
            let completedOperations = 0;
            const totalOperations = records.length;

            if (totalOperations === 0) {
              resolve();
              return;
            }

            const checkCompletion = () => {
              completedOperations++;
              if (completedOperations === totalOperations) {
                resolve();
              }
            };

            for (const record of records) {
              const request = objectStore.put(record);
              request.onsuccess = checkCompletion;
              request.onerror = () => reject(classifyDbError(request.error));
            }
          });
        }
      );
    },
    records.length
  );
}

// バッチ操作：複数のフィールドを一度に追加/更新
export async function batchUpdateFields(fields: Field[]): Promise<void> {
  return trackDbOperation(
    'batch-update-fields',
    async () => {
      return executeTransaction(
        FIELDS_STORE,
        'readwrite',
        async (_transaction, store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<void>((resolve, reject) => {
            let completedOperations = 0;
            const totalOperations = fields.length;

            if (totalOperations === 0) {
              resolve();
              return;
            }

            const checkCompletion = () => {
              completedOperations++;
              if (completedOperations === totalOperations) {
                resolve();
              }
            };

            for (const field of fields) {
              const request = objectStore.put(field);
              request.onsuccess = checkCompletion;
              request.onerror = () => reject(classifyDbError(request.error));
            }
          });
        }
      );
    },
    fields.length
  );
}
