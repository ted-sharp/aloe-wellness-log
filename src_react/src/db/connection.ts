import { DATABASE_CONFIG, STORE_CONFIGS, type StoreName } from './config';
import {
  DbError,
  DbErrorType,
  classifyDbError,
  isRetryableError,
} from './errors';

/**
 * データベース接続の管理を行うクラス
 */
export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private dbInstance: IDBDatabase | null = null;
  private connectionPromise: Promise<IDBDatabase> | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  /**
   * データベース接続の取得（リトライ機能付き）
   */
  async getConnection(): Promise<IDBDatabase> {
    // 既存の接続がある場合はそれを返す
    if (this.dbInstance && this.dbInstance.objectStoreNames.length > 0) {
      return this.dbInstance;
    }

    // 接続中の場合は既存のPromiseを返す
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // 新しい接続を作成
    this.connectionPromise = this.createConnection();

    try {
      this.dbInstance = await this.connectionPromise;
      return this.dbInstance;
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * データベース接続の作成（リトライ機能付き）
   */
  private async createConnection(): Promise<IDBDatabase> {
    return this.withRetry(async () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        try {
          const request = indexedDB.open(
            DATABASE_CONFIG.NAME,
            DATABASE_CONFIG.VERSION
          );

          request.onupgradeneeded = event => {
            const db = (event.target as IDBOpenDBRequest).result;
            this.upgradeDatabase(
              db,
              event.oldVersion,
              event.newVersion || DATABASE_CONFIG.VERSION
            );
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
              this.dbInstance = null;
              this.connectionPromise = null;
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

  /**
   * データベースのアップグレード処理
   */
  private upgradeDatabase(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number
  ): void {
    console.log(
      `Upgrading database from version ${oldVersion} to ${newVersion}`
    );

    // 全ストアの作成と設定
    STORE_CONFIGS.forEach(config => {
      let store: IDBObjectStore;

      if (!db.objectStoreNames.contains(config.name)) {
        // 新しいストアの作成
        console.log(`Creating new object store: ${config.name}`);
        store = db.createObjectStore(config.name, {
          keyPath: config.keyPath,
          autoIncrement: config.autoIncrement || false,
        });

        // インデックスの作成（新規ストアのみ）
        if (config.indexes) {
          config.indexes.forEach(indexConfig => {
            console.log(
              `Creating index: ${indexConfig.name} on ${config.name}`
            );
            store.createIndex(
              indexConfig.name,
              indexConfig.keyPath,
              indexConfig.options
            );
          });
        }
      }
      // 既存ストアの場合は何もしない（インデックスは既に作成済み）
    });
  }

  /**
   * トランザクションの実行（型安全性とタイムアウト機能付き）
   */
  async executeTransaction<T>(
    storeNames: StoreName | StoreName[],
    mode: IDBTransactionMode,
    operation: (
      transaction: IDBTransaction,
      stores: IDBObjectStore | IDBObjectStore[]
    ) => Promise<T>
  ): Promise<T> {
    return this.withRetry(async () => {
      const db = await this.getConnection();

      return new Promise<T>((resolve, reject) => {
        try {
          const transaction = db.transaction(storeNames, mode);

          // タイムアウト設定
          const timeoutId = setTimeout(() => {
            transaction.abort();
            reject(
              new DbError(
                DbErrorType.TRANSACTION_FAILED,
                'トランザクションがタイムアウトしました'
              )
            );
          }, DATABASE_CONFIG.TRANSACTION_TIMEOUT);

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
            storeNames
          )
            ? storeNames.map(name => transaction.objectStore(name))
            : transaction.objectStore(storeNames);

          // 操作実行
          operation(transaction, stores).then(resolve).catch(reject);
        } catch (error) {
          reject(classifyDbError(error));
        }
      });
    });
  }

  /**
   * リトライ機能付きの非同期実行
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = DATABASE_CONFIG.RETRY_ATTEMPTS,
    delay: number = DATABASE_CONFIG.RETRY_DELAY
  ): Promise<T> {
    let lastError: DbError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = classifyDbError(error);

        // リトライ不可能なエラーの場合は即座に失敗
        if (!isRetryableError(lastError)) {
          throw lastError;
        }

        // 最後の試行の場合はエラーを投げる
        if (attempt === maxAttempts) {
          throw lastError;
        }

        // リトライ前の待機（指数バックオフ）
        await new Promise(resolve =>
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }

    throw lastError!;
  }

  /**
   * 接続をクローズ
   */
  close(): void {
    if (this.dbInstance) {
      this.dbInstance.close();
      this.dbInstance = null;
    }
    this.connectionPromise = null;
  }

  /**
   * 接続状態の確認
   */
  isConnected(): boolean {
    return (
      this.dbInstance !== null && this.dbInstance.objectStoreNames.length > 0
    );
  }

  /**
   * データベース情報の取得
   */
  getDatabaseInfo(): {
    name: string;
    version: number;
    stores: string[];
    connected: boolean;
  } | null {
    if (!this.dbInstance) {
      return null;
    }

    return {
      name: this.dbInstance.name,
      version: this.dbInstance.version,
      stores: Array.from(this.dbInstance.objectStoreNames),
      connected: this.isConnected(),
    };
  }
}

// シングルトンインスタンスのエクスポート
export const dbConnection = DatabaseConnectionManager.getInstance();

// 便利な関数のエクスポート
export const openDb = () => dbConnection.getConnection();
export const executeTransaction = (
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  operation: (
    transaction: IDBTransaction,
    stores: IDBObjectStore | IDBObjectStore[]
  ) => Promise<any>
) => dbConnection.executeTransaction(storeNames, mode, operation);
