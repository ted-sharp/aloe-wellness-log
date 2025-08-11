// 型安全なデータベースリポジトリパターンの実装

// 注意: ここではベースクラスと共通型のみを定義します
// 具体的な各Repository実装は `src/db/repositories/` 配下に集約します

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
        reject(
          new Error(`Database connection failed: ${request.error?.message}`)
        );
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.upgradeDatabase(
          db,
          event.oldVersion,
          event.newVersion || this.dbVersion
        );
      };
    });
  }

  protected abstract upgradeDatabase(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number
  ): void;

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

// 具体的なRepository実装は `src/db/repositories/*` を参照してください
