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

  /**
   * エラー情報を含むオブジェクトを返す
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      retryable: this.retryable,
      originalError: this.originalError,
    };
  }

  /**
   * ユーザー向けのフレンドリーなエラーメッセージを取得
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case DbErrorType.CONNECTION_FAILED:
        return 'データベースへの接続に失敗しました。ページを再読み込みしてください。';
      case DbErrorType.QUOTA_EXCEEDED:
        return 'ストレージ容量が不足しています。不要なデータを削除してください。';
      case DbErrorType.VERSION_ERROR:
        return 'データベースのバージョンが競合しています。他のタブを閉じて再試行してください。';
      case DbErrorType.DATA_CORRUPTED:
        return 'データが破損しています。サポートにお問い合わせください。';
      case DbErrorType.TRANSACTION_FAILED:
        return 'データベース操作が失敗しました。しばらく待ってから再試行してください。';
      default:
        return 'データベースエラーが発生しました。しばらく待ってから再試行してください。';
    }
  }
}

/**
 * ネイティブエラーをDbErrorに分類する
 */
export function classifyDbError(error: unknown): DbError {
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

  if (error instanceof Error) {
    return new DbError(
      DbErrorType.CONNECTION_FAILED,
      `データベース接続に失敗しました: ${error.message}`,
      error
    );
  }

  return new DbError(
    DbErrorType.UNKNOWN,
    '予期しないエラーが発生しました',
    error
  );
}

/**
 * エラーがリトライ可能かどうかを判定
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof DbError) {
    return error.retryable;
  }
  
  if (error instanceof DOMException) {
    // リトライ不可能なエラーの場合
    if (['QuotaExceededError', 'VersionError', 'DataError', 'ConstraintError'].includes(error.name)) {
      return false;
    }
  }
  
  return true;
}

/**
 * エラーの重要度を取得
 */
export function getErrorSeverity(error: DbError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.type) {
    case DbErrorType.DATA_CORRUPTED:
    case DbErrorType.QUOTA_EXCEEDED:
      return 'critical';
    case DbErrorType.CONNECTION_FAILED:
    case DbErrorType.VERSION_ERROR:
      return 'high';
    case DbErrorType.TRANSACTION_FAILED:
      return 'medium';
    default:
      return 'low';
  }
}