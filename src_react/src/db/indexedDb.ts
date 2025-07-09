import type { GoalData } from '../types/goal';
import type { WeightRecordV2 } from '../types/record';
import { isDev } from '../utils/devTools';
import { performanceMonitor } from '../utils/performanceMonitor';


const DB_NAME = 'aloe-wellness-log';
const DB_VERSION = 4;

const GOAL_STORE = 'goal';
const WEIGHT_RECORDS_STORE = 'weight_records';
const BP_RECORDS_STORE = 'bp_records';
const DAILY_RECORDS_STORE = 'daily_records';
const DAILY_FIELDS_STORE = 'daily_fields';
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



// データベース接続（リトライ機能付き）
export function openDb(): Promise<IDBDatabase> {
  return withRetry(() => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(GOAL_STORE)) {
            db.createObjectStore(GOAL_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(WEIGHT_RECORDS_STORE)) {
            const weightStore = db.createObjectStore(WEIGHT_RECORDS_STORE, {
              keyPath: 'id',
            });
            weightStore.createIndex('dateIndex', 'date', { unique: false });
            weightStore.createIndex(
              'excludeFromGraphIndex',
              'excludeFromGraph',
              { unique: false }
            );
          }
          if (!db.objectStoreNames.contains(BP_RECORDS_STORE)) {
            const bpStore = db.createObjectStore(BP_RECORDS_STORE, {
              keyPath: 'id',
            });
            bpStore.createIndex('dateIndex', 'date', { unique: false });
            bpStore.createIndex('fieldIdIndex', 'fieldId', { unique: false });
          }
          if (!db.objectStoreNames.contains(DAILY_RECORDS_STORE)) {
            db.createObjectStore(DAILY_RECORDS_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(DAILY_FIELDS_STORE)) {
            db.createObjectStore(DAILY_FIELDS_STORE, { keyPath: 'fieldId' });
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

// トランザクション実行ヘルパー（型安全性向上）
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

        // ストア取得（型安全性向上）
        const stores: IDBObjectStore | IDBObjectStore[] = Array.isArray(
          storeName
        )
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

// 目標データの保存
export async function setGoalData(goal: GoalData): Promise<void> {
  return trackDbOperation('set-goal', async () => {
    return executeTransaction(
      GOAL_STORE,
      'readwrite',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<void>((resolve, reject) => {
          const request = objectStore.put({ ...goal, id: 'singleton' });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(classifyDbError(request.error));
        });
      }
    );
  });
}

// 目標データの取得
export async function getGoalData(): Promise<GoalData | null> {
  return trackDbOperation('get-goal', async () => {
    return executeTransaction(
      GOAL_STORE,
      'readonly',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<GoalData | null>((resolve, reject) => {
          const request = objectStore.get('singleton');
          request.onsuccess = () => {
            const data = request.result;
            if (data && typeof data === 'object') {
              // idを除外して返す
              const { id: _id, ...goal } = data;
              resolve(goal as GoalData);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => reject(classifyDbError(request.error));
        });
      }
    );
  });
}

// 目標データの削除
export async function clearGoalData(): Promise<void> {
  return trackDbOperation('clear-goal', async () => {
    return executeTransaction(
      GOAL_STORE,
      'readwrite',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<void>((resolve, reject) => {
          const request = objectStore.delete('singleton');
          request.onsuccess = () => resolve();
          request.onerror = () => reject(classifyDbError(request.error));
        });
      }
    );
  });
}

// 新しい体重記録（V2）の追加
export async function addWeightRecord(record: WeightRecordV2): Promise<void> {
  return trackDbOperation(
    'add-weight-record',
    async () => {
      return executeTransaction(
        WEIGHT_RECORDS_STORE,
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

// 新しい体重記録（V2）の全件取得
export async function getAllWeightRecords(): Promise<WeightRecordV2[]> {
  return trackDbOperation('get-all-weight-records', async () => {
    return executeTransaction(
      WEIGHT_RECORDS_STORE,
      'readonly',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<WeightRecordV2[]>((resolve, reject) => {
          const request = objectStore.getAll();
          request.onsuccess = () => {
            const data = request.result;
            if (Array.isArray(data)) {
              resolve(data as WeightRecordV2[]);
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

// 新しい体重記録（V2）の更新
export async function updateWeightRecord(
  record: WeightRecordV2
): Promise<void> {
  return trackDbOperation(
    'update-weight-record',
    async () => {
      return executeTransaction(
        WEIGHT_RECORDS_STORE,
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

// 新しい体重記録（V2）の削除
export async function deleteWeightRecord(id: string): Promise<void> {
  return trackDbOperation(
    'delete-weight-record',
    async () => {
      return executeTransaction(
        WEIGHT_RECORDS_STORE,
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



// 新しい血圧記録（V2）の追加
export async function addBpRecord(
  record: import('../types/record').BpRecordV2
): Promise<void> {
  return trackDbOperation(
    'add-bp-record',
    async () => {
      return executeTransaction(
        BP_RECORDS_STORE,
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

// 新しい血圧記録（V2）の全件取得
export async function getAllBpRecords(): Promise<
  import('../types/record').BpRecordV2[]
> {
  return trackDbOperation('get-all-bp-records', async () => {
    return executeTransaction(
      BP_RECORDS_STORE,
      'readonly',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<import('../types/record').BpRecordV2[]>(
          (resolve, reject) => {
            const request = objectStore.getAll();
            request.onsuccess = () => {
              const data = request.result;
              if (Array.isArray(data)) {
                resolve(data as import('../types/record').BpRecordV2[]);
              } else {
                resolve([]);
              }
            };
            request.onerror = () => reject(classifyDbError(request.error));
          }
        );
      }
    );
  });
}

// 新しい血圧記録（V2）の更新
export async function updateBpRecord(
  record: import('../types/record').BpRecordV2
): Promise<void> {
  return trackDbOperation(
    'update-bp-record',
    async () => {
      return executeTransaction(
        BP_RECORDS_STORE,
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

// 新しい血圧記録（V2）の削除
export async function deleteBpRecord(id: string): Promise<void> {
  return trackDbOperation(
    'delete-bp-record',
    async () => {
      return executeTransaction(
        BP_RECORDS_STORE,
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

// 新しい日課レコードの追加
export async function addDailyRecord(
  record: import('../types/record').DailyRecordV2
): Promise<void> {
  return trackDbOperation(
    'add-daily-record',
    async () => {
      return executeTransaction(
        DAILY_RECORDS_STORE,
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

// 新しい日課レコードの全件取得
export async function getAllDailyRecords(): Promise<
  import('../types/record').DailyRecordV2[]
> {
  return trackDbOperation('get-all-daily-records', async () => {
    return executeTransaction(
      DAILY_RECORDS_STORE,
      'readonly',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<import('../types/record').DailyRecordV2[]>(
          (resolve, reject) => {
            const request = objectStore.getAll();
            request.onsuccess = () => {
              const data = request.result;
              if (Array.isArray(data)) {
                resolve(data as import('../types/record').DailyRecordV2[]);
              } else {
                resolve([]);
              }
            };
            request.onerror = () => reject(classifyDbError(request.error));
          }
        );
      }
    );
  });
}

// 新しい日課レコードの更新
export async function updateDailyRecord(
  record: import('../types/record').DailyRecordV2
): Promise<void> {
  return trackDbOperation(
    'update-daily-record',
    async () => {
      return executeTransaction(
        DAILY_RECORDS_STORE,
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

// 新しい日課レコードの削除
export async function deleteDailyRecord(id: string): Promise<void> {
  return trackDbOperation(
    'delete-daily-record',
    async () => {
      return executeTransaction(
        DAILY_RECORDS_STORE,
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

// 新しい日課フィールドの追加
export async function addDailyField(
  field: import('../types/record').DailyFieldV2
): Promise<void> {
  return trackDbOperation(
    'add-daily-field',
    async () => {
      return executeTransaction(
        DAILY_FIELDS_STORE,
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

// 新しい日課フィールドの全件取得
export async function getAllDailyFields(): Promise<
  import('../types/record').DailyFieldV2[]
> {
  return trackDbOperation('get-all-daily-fields', async () => {
    return executeTransaction(
      DAILY_FIELDS_STORE,
      'readonly',
      async (_transaction, store) => {
        const objectStore = store as IDBObjectStore;
        return new Promise<import('../types/record').DailyFieldV2[]>(
          (resolve, reject) => {
            const request = objectStore.getAll();
            request.onsuccess = () => {
              const data = request.result;
              if (Array.isArray(data)) {
                resolve(data as import('../types/record').DailyFieldV2[]);
              } else {
                resolve([]);
              }
            };
            request.onerror = () => reject(classifyDbError(request.error));
          }
        );
      }
    );
  });
}

// 新しい日課フィールドの更新
export async function updateDailyField(
  field: import('../types/record').DailyFieldV2
): Promise<void> {
  return trackDbOperation(
    'update-daily-field',
    async () => {
      return executeTransaction(
        DAILY_FIELDS_STORE,
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

// 新しい日課フィールドの削除
export async function deleteDailyField(fieldId: string): Promise<void> {
  return trackDbOperation(
    'delete-daily-field',
    async () => {
      return executeTransaction(
        DAILY_FIELDS_STORE,
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

// 全データ削除（記録と項目の両方）
export async function deleteAllData(): Promise<void> {
  return trackDbOperation('delete-all-data', async () => {
    return executeTransaction(
      [
        GOAL_STORE,
        WEIGHT_RECORDS_STORE,
        BP_RECORDS_STORE,
        DAILY_RECORDS_STORE,
        DAILY_FIELDS_STORE,
      ],
      'readwrite',
      async (_transaction, stores) => {
        const [
          goalStore,
          weightStore,
          bpStore,
          dailyRecordStore,
          dailyFieldStore,
        ] = stores as IDBObjectStore[];
        return new Promise<void>((resolve, reject) => {
          let completedOperations = 0;
          const totalOperations = 5;
          const checkCompletion = () => {
            completedOperations++;
            if (completedOperations === totalOperations) {
              resolve();
            }
          };
          const goalRequest = goalStore.clear();
          goalRequest.onsuccess = checkCompletion;
          goalRequest.onerror = () =>
            reject(classifyDbError(goalRequest.error));
          const weightRequest = weightStore.clear();
          weightRequest.onsuccess = checkCompletion;
          weightRequest.onerror = () =>
            reject(classifyDbError(weightRequest.error));
          const bpRequest = bpStore.clear();
          bpRequest.onsuccess = checkCompletion;
          bpRequest.onerror = () => reject(classifyDbError(bpRequest.error));
          const dailyRecordRequest = dailyRecordStore.clear();
          dailyRecordRequest.onsuccess = checkCompletion;
          dailyRecordRequest.onerror = () =>
            reject(classifyDbError(dailyRecordRequest.error));
          const dailyFieldRequest = dailyFieldStore.clear();
          dailyFieldRequest.onsuccess = checkCompletion;
          dailyFieldRequest.onerror = () =>
            reject(classifyDbError(dailyFieldRequest.error));
        });
      }
    );
  });
}


