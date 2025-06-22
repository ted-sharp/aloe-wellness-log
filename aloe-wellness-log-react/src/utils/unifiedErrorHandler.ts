import { isDev } from './devTools';

// 統合エラー種別
export enum UnifiedErrorType {
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  STORAGE_QUOTA = 'storage_quota',
  RENDERING = 'rendering',
  PERFORMANCE = 'performance',
  USER_INPUT = 'user_input',
  SECURITY = 'security',
  UNKNOWN = 'unknown',
}

// エラー重要度
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 回復アクション種別
export enum RecoveryAction {
  RETRY = 'retry',
  RELOAD_PAGE = 'reload_page',
  CLEAR_CACHE = 'clear_cache',
  USER_ACTION_REQUIRED = 'user_action_required',
  NAVIGATE_BACK = 'navigate_back',
  NONE = 'none',
}

// 統合エラーオブジェクト
export interface UnifiedError {
  id: string;
  type: UnifiedErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  originalError?: Error;
  stack?: string;
  retryable: boolean;
  maxRetries?: number;
  currentRetries?: number;
  recoveryActions: RecoveryAction[];
  handled: boolean;
  resolved: boolean;
}

// エラーハンドリング設定
export interface ErrorHandlingConfig {
  showToast: boolean;
  logToConsole: boolean;
  reportToService: boolean;
  autoRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  userFriendlyMessages: boolean;
}

// デフォルト設定
const DEFAULT_CONFIG: ErrorHandlingConfig = {
  showToast: true,
  logToConsole: true,
  reportToService: false,
  autoRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  userFriendlyMessages: true,
};

/**
 * エラー分類ロジック（統一版）
 */
export function classifyUnifiedError(
  error: unknown,
  context?: Record<string, unknown>
): UnifiedErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // データベースエラー
    if (
      message.includes('indexeddb') ||
      message.includes('database') ||
      message.includes('store') ||
      message.includes('transaction') ||
      context?.source === 'database'
    ) {
      return UnifiedErrorType.DATABASE;
    }

    // ストレージ容量エラー
    if (
      message.includes('quota') ||
      message.includes('storage') ||
      message.includes('disk')
    ) {
      return UnifiedErrorType.STORAGE_QUOTA;
    }

    // バリデーションエラー
    if (
      message.includes('validation') ||
      message.includes('必須') ||
      message.includes('形式') ||
      message.includes('入力') ||
      context?.source === 'validation'
    ) {
      return UnifiedErrorType.VALIDATION;
    }

    // ネットワークエラー
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('cors') ||
      context?.source === 'network'
    ) {
      return UnifiedErrorType.NETWORK;
    }

    // レンダリングエラー
    if (
      stack.includes('react') ||
      message.includes('render') ||
      message.includes('component') ||
      context?.source === 'rendering'
    ) {
      return UnifiedErrorType.RENDERING;
    }

    // パフォーマンスエラー
    if (
      message.includes('memory') ||
      message.includes('performance') ||
      message.includes('slow') ||
      context?.source === 'performance'
    ) {
      return UnifiedErrorType.PERFORMANCE;
    }

    // セキュリティエラー
    if (
      message.includes('security') ||
      message.includes('csrf') ||
      message.includes('xss') ||
      context?.source === 'security'
    ) {
      return UnifiedErrorType.SECURITY;
    }

    // 認証エラー
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      context?.source === 'auth'
    ) {
      return UnifiedErrorType.AUTHENTICATION;
    }

    // 権限エラー
    if (
      message.includes('forbidden') ||
      message.includes('permission') ||
      context?.source === 'permission'
    ) {
      return UnifiedErrorType.PERMISSION;
    }
  }

  return UnifiedErrorType.UNKNOWN;
}

/**
 * エラー重要度判定
 */
export function determineSeverity(
  type: UnifiedErrorType,
  error: Error | unknown
): ErrorSeverity {
  switch (type) {
    case UnifiedErrorType.SECURITY:
    case UnifiedErrorType.AUTHENTICATION:
      return ErrorSeverity.CRITICAL;

    case UnifiedErrorType.DATABASE:
    case UnifiedErrorType.STORAGE_QUOTA:
      return ErrorSeverity.HIGH;

    case UnifiedErrorType.NETWORK:
    case UnifiedErrorType.RENDERING:
    case UnifiedErrorType.PERMISSION:
      return ErrorSeverity.MEDIUM;

    case UnifiedErrorType.VALIDATION:
    case UnifiedErrorType.USER_INPUT:
    case UnifiedErrorType.PERFORMANCE:
      return ErrorSeverity.LOW;

    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * リトライ可能性判定
 */
export function isRetryableError(
  type: UnifiedErrorType,
  error?: Error
): boolean {
  if (error) {
    const message = error.message.toLowerCase();
    // 特定のエラーメッセージでリトライ不可判定
    if (
      message.includes('404') ||
      message.includes('403') ||
      message.includes('401') ||
      message.includes('validation') ||
      message.includes('quota')
    ) {
      return false;
    }
  }

  switch (type) {
    case UnifiedErrorType.NETWORK:
    case UnifiedErrorType.DATABASE:
    case UnifiedErrorType.RENDERING:
    case UnifiedErrorType.PERFORMANCE:
      return true;

    case UnifiedErrorType.VALIDATION:
    case UnifiedErrorType.USER_INPUT:
    case UnifiedErrorType.SECURITY:
    case UnifiedErrorType.AUTHENTICATION:
    case UnifiedErrorType.PERMISSION:
    case UnifiedErrorType.STORAGE_QUOTA:
      return false;

    default:
      return false;
  }
}

/**
 * 回復アクション決定
 */
export function determineRecoveryActions(
  type: UnifiedErrorType,
  severity: ErrorSeverity
): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  switch (type) {
    case UnifiedErrorType.NETWORK:
      actions.push(RecoveryAction.RETRY);
      if (severity >= ErrorSeverity.HIGH) {
        actions.push(RecoveryAction.RELOAD_PAGE);
      }
      break;

    case UnifiedErrorType.DATABASE:
      actions.push(RecoveryAction.RETRY);
      if (severity >= ErrorSeverity.HIGH) {
        actions.push(RecoveryAction.CLEAR_CACHE, RecoveryAction.RELOAD_PAGE);
      }
      break;

    case UnifiedErrorType.RENDERING:
      actions.push(RecoveryAction.RETRY, RecoveryAction.RELOAD_PAGE);
      break;

    case UnifiedErrorType.STORAGE_QUOTA:
      actions.push(
        RecoveryAction.CLEAR_CACHE,
        RecoveryAction.USER_ACTION_REQUIRED
      );
      break;

    case UnifiedErrorType.VALIDATION:
    case UnifiedErrorType.USER_INPUT:
      actions.push(RecoveryAction.USER_ACTION_REQUIRED);
      break;

    case UnifiedErrorType.SECURITY:
    case UnifiedErrorType.AUTHENTICATION:
      actions.push(RecoveryAction.RELOAD_PAGE);
      break;

    case UnifiedErrorType.PERMISSION:
      actions.push(
        RecoveryAction.NAVIGATE_BACK,
        RecoveryAction.USER_ACTION_REQUIRED
      );
      break;

    default:
      actions.push(RecoveryAction.RETRY, RecoveryAction.RELOAD_PAGE);
      break;
  }

  return actions.length > 0 ? actions : [RecoveryAction.NONE];
}

/**
 * ユーザーフレンドリーメッセージ生成
 */
export function generateUserMessage(
  type: UnifiedErrorType,
  originalMessage: string,
  context?: Record<string, unknown>
): string {
  const fieldName = context?.fieldName as string;
  const operation = context?.operation as string;

  switch (type) {
    case UnifiedErrorType.VALIDATION:
      if (fieldName) {
        return `${fieldName}の入力内容をご確認くださいませ。${originalMessage}`;
      }
      return `入力内容に問題がございます。${originalMessage}`;

    case UnifiedErrorType.DATABASE:
      if (operation === 'save') {
        return 'データの保存に失敗いたしました。もう一度お試しくださいませ。';
      } else if (operation === 'load') {
        return 'データの読み込みに失敗いたしました。ページを再読み込みしてお試しくださいませ。';
      }
      return 'データベース操作でエラーが発生いたしました。しばらく待ってからお試しくださいませ。';

    case UnifiedErrorType.NETWORK:
      return 'ネットワーク接続に問題がございます。インターネット接続をご確認くださいませ。';

    case UnifiedErrorType.STORAGE_QUOTA:
      return 'ストレージ容量が不足しております。不要なデータを削除してからお試しくださいませ。';

    case UnifiedErrorType.RENDERING:
      return '画面の表示に問題が発生いたしました。ページを再読み込みしてお試しくださいませ。';

    case UnifiedErrorType.PERFORMANCE:
      return 'システムの応答が遅くなっております。しばらく待ってからお試しくださいませ。';

    case UnifiedErrorType.SECURITY:
      return 'セキュリティ上の問題が検出されました。ページを再読み込みしてお試しくださいませ。';

    case UnifiedErrorType.AUTHENTICATION:
      return '認証に問題がございます。ページを再読み込みしてお試しくださいませ。';

    case UnifiedErrorType.PERMISSION:
      return 'この操作を実行する権限がございません。';

    default:
      return '予期しないエラーが発生いたしました。お困りの場合は再度お試しくださいませ。';
  }
}

/**
 * 統合エラーオブジェクト作成
 */
export function createUnifiedError(
  error: unknown,
  context?: Record<string, unknown>,
  config: Partial<ErrorHandlingConfig> = {}
): UnifiedError {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const type = classifyUnifiedError(error, context);
  const severity = determineSeverity(type, errorObj);
  const retryable = isRetryableError(type, errorObj);
  const recoveryActions = determineRecoveryActions(type, severity);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const unifiedError: UnifiedError = {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    message: errorObj.message,
    userMessage: mergedConfig.userFriendlyMessages
      ? generateUserMessage(type, errorObj.message, context)
      : errorObj.message,
    timestamp: new Date(),
    context,
    originalError: errorObj,
    stack: errorObj.stack,
    retryable,
    maxRetries: mergedConfig.maxRetries,
    currentRetries: 0,
    recoveryActions,
    handled: false,
    resolved: false,
  };

  return unifiedError;
}

/**
 * エラーログ出力（統一版）
 */
export function logUnifiedError(
  unifiedError: UnifiedError,
  contextInfo?: string
): void {
  const logLevel =
    unifiedError.severity === ErrorSeverity.CRITICAL
      ? 'error'
      : unifiedError.severity === ErrorSeverity.HIGH
      ? 'error'
      : unifiedError.severity === ErrorSeverity.MEDIUM
      ? 'warn'
      : 'info';

  const logMessage = contextInfo
    ? `[${contextInfo}] ${unifiedError.userMessage}`
    : unifiedError.userMessage;

  const logData = {
    id: unifiedError.id,
    type: unifiedError.type,
    severity: unifiedError.severity,
    timestamp: unifiedError.timestamp,
    context: unifiedError.context,
    retryable: unifiedError.retryable,
    recoveryActions: unifiedError.recoveryActions,
  };

  console[logLevel](logMessage, logData);

  if (unifiedError.originalError && isDev) {
    console.error('Original Error:', unifiedError.originalError);
  }
}
