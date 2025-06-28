// エラーの種類を定義
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  PARSE = 'parse',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

// データベース固有のエラータイプを追加
export enum DbErrorType {
  CONNECTION_FAILED = 'connection_failed',
  TRANSACTION_FAILED = 'transaction_failed',
  DATA_CORRUPTED = 'data_corrupted',
  QUOTA_EXCEEDED = 'quota_exceeded',
  VERSION_ERROR = 'version_error',
  UNKNOWN = 'unknown',
}

// エラー情報の型定義
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, unknown>;
}

// データベースエラー情報の型定義
export interface DbError {
  type: DbErrorType;
  message: string;
  originalError?: unknown;
  retryable: boolean;
}

// エラー分類機能
export function classifyError(error: unknown): AppError {
  // DbErrorをAppErrorに変換
  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'retryable' in error &&
    'message' in error
  ) {
    const errorObj = error as Record<string, unknown>;
    if (Object.values(DbErrorType).includes(errorObj.type as DbErrorType)) {
      const dbError = error as DbError;
      return {
        type: ErrorType.DATABASE,
        message: dbError.message,
        originalError: dbError.originalError as Error,
        context: {
          dbErrorType: dbError.type,
          retryable: dbError.retryable,
        },
      };
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // データベース関連エラー
    if (
      message.includes('indexeddb') ||
      message.includes('database') ||
      message.includes('store')
    ) {
      return {
        type: ErrorType.DATABASE,
        message: 'データベース操作でエラーが発生しました',
        originalError: error,
      };
    }

    // パース関連エラー
    if (
      message.includes('parse') ||
      message.includes('json') ||
      message.includes('csv')
    ) {
      return {
        type: ErrorType.PARSE,
        message: 'データの解析でエラーが発生しました',
        originalError: error,
      };
    }

    // バリデーション関連エラー
    if (
      message.includes('validation') ||
      message.includes('必須') ||
      message.includes('形式')
    ) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        originalError: error,
      };
    }

    // ネットワーク関連エラー
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('request')
    ) {
      return {
        type: ErrorType.NETWORK,
        message: 'ネットワークエラーが発生しました',
        originalError: error,
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: '予期しないエラーが発生しました',
    context: { originalError: error },
  };
}

// ユーザーフレンドリーなエラーメッセージを生成
export function getDisplayMessage(appError: AppError): string {
  switch (appError.type) {
    case ErrorType.VALIDATION:
      return appError.message;

    case ErrorType.DATABASE:
      // データベース固有のエラーメッセージをカスタマイズ
      if (appError.context?.dbErrorType) {
        const dbErrorType = appError.context.dbErrorType as DbErrorType;
        const isRetryable = appError.context.retryable as boolean;

        switch (dbErrorType) {
          case DbErrorType.QUOTA_EXCEEDED:
            return 'ストレージ容量が不足しています。不要なデータを削除してから再度お試しくださいませ。';
          case DbErrorType.CONNECTION_FAILED:
            return isRetryable
              ? 'データベース接続に失敗しました。しばらく待ってから再度お試しくださいませ。'
              : 'データベース接続に問題があります。ページを再読み込みしてお試しくださいませ。';
          case DbErrorType.TRANSACTION_FAILED:
            return 'データベース処理中にエラーが発生しました。もう一度お試しくださいませ。';
          case DbErrorType.DATA_CORRUPTED:
            return 'データが破損している可能性があります。管理画面からデータの確認をお勧めいたします。';
          case DbErrorType.VERSION_ERROR:
            return 'データベースの更新中です。ページを再読み込みしてお試しくださいませ。';
          default:
            return (
              appError.message || 'データベース操作でエラーが発生いたしました。'
            );
        }
      }
      return 'データの保存・読み込みに失敗いたしました。もう一度お試しくださいませ。';

    case ErrorType.PARSE:
      return 'ファイルの形式が正しくありません。ファイルの内容をご確認くださいませ。';

    case ErrorType.NETWORK:
      return 'ネットワーク接続に問題があります。接続状況をご確認くださいませ。';

    case ErrorType.PERMISSION:
      return 'この操作を実行する権限がありません。';

    default:
      return appError.message || '予期しないエラーが発生いたしました。';
  }
}

// リトライ可能かどうかを判定
export function isRetryableError(appError: AppError): boolean {
  if (
    appError.type === ErrorType.DATABASE &&
    appError.context?.retryable !== undefined
  ) {
    return appError.context.retryable as boolean;
  }

  // その他のエラータイプの場合のデフォルト値
  switch (appError.type) {
    case ErrorType.NETWORK:
      return true;
    case ErrorType.DATABASE:
      return true;
    case ErrorType.VALIDATION:
    case ErrorType.PARSE:
    case ErrorType.PERMISSION:
      return false;
    default:
      return false;
  }
}

// エラーログ出力（データベースエラーの詳細情報を含む）
export function logError(appError: AppError, context?: string): void {
  const logMessage = context
    ? `[${context}] ${appError.message}`
    : appError.message;

  if (appError.originalError) {
    console.error(logMessage, appError.originalError);
  } else {
    console.error(logMessage, appError.context);
  }

  // データベースエラーの詳細情報をログ出力
  if (appError.type === ErrorType.DATABASE && appError.context?.dbErrorType) {
    console.error('Database Error Details:', {
      dbErrorType: appError.context.dbErrorType,
      retryable: appError.context.retryable,
      context: context,
    });
  }
}
