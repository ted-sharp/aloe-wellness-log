// 後方互換性のための統一エラーハンドラーのエイリアス
// 既存のインポートを壊さないために、古いAPIを新しいAPIにマッピング

export {
  UnifiedErrorType as ErrorType,
  ErrorSeverity,
  RecoveryAction,
  type UnifiedError as AppError,
  type ErrorHandlingConfig,
  createUnifiedError as classifyError,
  generateUserMessage as getDisplayMessage,
  isRetryableError,
  logUnifiedError as logError,
} from './unifiedErrorHandler';

// データベース固有のエラータイプを統一システムでも提供
export enum DbErrorType {
  CONNECTION_FAILED = 'connection_failed',
  TRANSACTION_FAILED = 'transaction_failed',
  DATA_CORRUPTED = 'data_corrupted',
  QUOTA_EXCEEDED = 'quota_exceeded',
  VERSION_ERROR = 'version_error',
  UNKNOWN = 'unknown',
}

export interface DbError {
  type: DbErrorType;
  message: string;
  originalError?: unknown;
  retryable: boolean;
}