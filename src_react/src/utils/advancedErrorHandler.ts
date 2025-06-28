import { debugError, debugLog, debugWarn, isDev } from './devTools';

// エラーの重要度レベル
export enum ErrorSeverity {
  LOW = 'low', // 軽微なエラー（警告レベル）
  MEDIUM = 'medium', // 通常のエラー
  HIGH = 'high', // 重要なエラー
  CRITICAL = 'critical', // 致命的なエラー
}

// エラーカテゴリ
export enum ErrorCategory {
  USER_INPUT = 'user_input',
  DATA_PROCESSING = 'data_processing',
  NETWORK = 'network',
  STORAGE = 'storage',
  RENDERING = 'rendering',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  UNKNOWN = 'unknown',
}

// 拡張エラー情報
export interface AdvancedError {
  id: string;
  timestamp: Date;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  stack?: string;
  context: Record<string, unknown>;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  componentStack?: string;
  retryable: boolean;
  errorBoundary?: boolean;
}

// エラー統計情報
export interface ErrorStats {
  totalCount: number;
  categoryCounts: Record<ErrorCategory, number>;
  severityCounts: Record<ErrorSeverity, number>;
  recentErrors: AdvancedError[];
  mostFrequentErrors: Array<{
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
}

// エラーストレージ（開発環境でのみ使用）
class ErrorStorage {
  private errors: AdvancedError[] = [];
  private maxErrors = 1000; // 最大保持エラー数
  private errorCounts = new Map<string, number>();

  addError(error: AdvancedError): void {
    this.errors.push(error);

    // エラー数を制限
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // エラー頻度を記録
    const key = `${error.category}:${error.message.substring(0, 100)}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // 開発環境でのみローカルストレージに保存
    if (isDev) {
      try {
        localStorage.setItem(
          '__aloe_dev_errors',
          JSON.stringify(this.errors.slice(-100))
        );
      } catch (e) {
        // ストレージエラーは無視
      }
    }
  }

  getErrors(): AdvancedError[] {
    return [...this.errors];
  }

  getStats(): ErrorStats {
    const categoryCounts = {} as Record<ErrorCategory, number>;
    const severityCounts = {} as Record<ErrorSeverity, number>;

    // カウントを初期化
    Object.values(ErrorCategory).forEach(cat => (categoryCounts[cat] = 0));
    Object.values(ErrorSeverity).forEach(sev => (severityCounts[sev] = 0));

    // エラーを集計
    this.errors.forEach(error => {
      categoryCounts[error.category]++;
      severityCounts[error.severity]++;
    });

    // 最も頻繁なエラーを計算
    const mostFrequentErrors = Array.from(this.errorCounts.entries())
      .map(([key, count]) => {
        const [category, message] = key.split(':');
        const relevantErrors = this.errors.filter(
          e => e.category === category && e.message.includes(message)
        );
        const lastOccurred =
          relevantErrors.length > 0
            ? relevantErrors[relevantErrors.length - 1].timestamp
            : new Date();

        return { message, count, lastOccurred };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCount: this.errors.length,
      categoryCounts,
      severityCounts,
      recentErrors: this.errors.slice(-20),
      mostFrequentErrors,
    };
  }

  clearErrors(): void {
    this.errors = [];
    this.errorCounts.clear();
    if (isDev) {
      localStorage.removeItem('__aloe_dev_errors');
    }
  }
}

// グローバルエラーストレージインスタンス
const errorStorage = new ErrorStorage();

// エラー分類ロジック
export function categorizeError(
  error: Error,
  context?: Record<string, unknown>
): ErrorCategory {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  // ネットワークエラー
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout')
  ) {
    return ErrorCategory.NETWORK;
  }

  // ストレージエラー
  if (
    message.includes('indexeddb') ||
    message.includes('localstorage') ||
    message.includes('quota')
  ) {
    return ErrorCategory.STORAGE;
  }

  // レンダリングエラー
  if (
    stack.includes('react') ||
    message.includes('render') ||
    message.includes('component')
  ) {
    return ErrorCategory.RENDERING;
  }

  // データ処理エラー
  if (
    message.includes('parse') ||
    message.includes('json') ||
    message.includes('csv') ||
    message.includes('validation')
  ) {
    return ErrorCategory.DATA_PROCESSING;
  }

  // ユーザー入力エラー
  if (
    context?.source === 'user_input' ||
    message.includes('必須') ||
    message.includes('形式')
  ) {
    return ErrorCategory.USER_INPUT;
  }

  // セキュリティエラー
  if (
    message.includes('security') ||
    message.includes('permission') ||
    message.includes('cors')
  ) {
    return ErrorCategory.SECURITY;
  }

  // パフォーマンスエラー
  if (
    message.includes('memory') ||
    message.includes('performance') ||
    message.includes('timeout')
  ) {
    return ErrorCategory.PERFORMANCE;
  }

  return ErrorCategory.UNKNOWN;
}

// 重要度判定ロジック
export function determineSeverity(
  error: Error,
  category: ErrorCategory
): ErrorSeverity {
  const message = error.message.toLowerCase();

  // 致命的エラー
  if (
    message.includes('critical') ||
    message.includes('fatal') ||
    category === ErrorCategory.SECURITY
  ) {
    return ErrorSeverity.CRITICAL;
  }

  // 重要なエラー
  if (
    category === ErrorCategory.STORAGE ||
    category === ErrorCategory.DATA_PROCESSING ||
    message.includes('corruption')
  ) {
    return ErrorSeverity.HIGH;
  }

  // 通常のエラー
  if (
    category === ErrorCategory.NETWORK ||
    category === ErrorCategory.RENDERING
  ) {
    return ErrorSeverity.MEDIUM;
  }

  // 軽微なエラー
  if (
    category === ErrorCategory.USER_INPUT ||
    category === ErrorCategory.PERFORMANCE
  ) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}

// リトライ可能性判定
export function isRetryable(category: ErrorCategory, error: Error): boolean {
  const message = error.message.toLowerCase();

  switch (category) {
    case ErrorCategory.NETWORK:
      return (
        !message.includes('404') &&
        !message.includes('403') &&
        !message.includes('401')
      );
    case ErrorCategory.STORAGE:
      return message.includes('timeout') || message.includes('lock');
    case ErrorCategory.DATA_PROCESSING:
      return false; // データエラーは通常リトライ不可
    case ErrorCategory.USER_INPUT:
      return false; // ユーザー入力エラーはリトライ不可
    case ErrorCategory.RENDERING:
      return true; // レンダリングエラーはリトライ可能
    case ErrorCategory.SECURITY:
      return false; // セキュリティエラーはリトライ不可
    case ErrorCategory.PERFORMANCE:
      return true; // パフォーマンスエラーはリトライ可能
    default:
      return false;
  }
}

// 高度なエラーハンドラー
export class AdvancedErrorHandler {
  private sessionId: string;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 開発環境でのグローバルエラーハンドラー設定
    if (isDev) {
      this.setupGlobalHandlers();
    }
  }

  private setupGlobalHandlers(): void {
    // 未処理のエラーをキャッチ
    window.addEventListener('error', event => {
      this.handleError(event.error, {
        source: 'global_error_handler',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // 未処理のPromise rejectionをキャッチ
    window.addEventListener('unhandledrejection', event => {
      this.handleError(new Error(String(event.reason)), {
        source: 'unhandled_promise_rejection',
        reason: event.reason,
      });
    });
  }

  handleError(
    error: Error,
    context: Record<string, unknown> = {}
  ): AdvancedError {
    const category = categorizeError(error, context);
    const severity = determineSeverity(error, category);
    const retryable = isRetryable(category, error);

    const advancedError: AdvancedError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message: error.message,
      severity,
      category,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
      retryable,
      errorBoundary: (context.errorBoundary as boolean) || false,
    };

    // エラーを保存
    errorStorage.addError(advancedError);

    // コンソールに詳細ログを出力
    this.logError(advancedError);

    // 開発環境での詳細分析
    if (isDev) {
      this.analyzeError(advancedError);
    }

    return advancedError;
  }

  private logError(error: AdvancedError): void {
    const logData = {
      id: error.id,
      severity: error.severity,
      category: error.category,
      message: error.message,
      context: error.context,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString(),
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        debugError('🚨 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        debugError('❌ HIGH SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        debugWarn('⚠️ MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        debugLog('⚡ LOW SEVERITY ERROR:', logData);
        break;
    }

    // スタックトレース分析
    if (error.stack && isDev) {
      this.analyzeStackTrace(error.stack);
    }
  }

  private analyzeError(error: AdvancedError): void {
    debugLog('🔍 Error Analysis:', {
      frequency: this.getErrorFrequency(error.message),
      suggestedActions: this.getSuggestedActions(error),
      relatedErrors: this.getRelatedErrors(error),
    });
  }

  private analyzeStackTrace(stack: string): void {
    const lines = stack.split('\n');
    const appLines = lines.filter(
      line => line.includes('/src/') && !line.includes('node_modules')
    );

    if (appLines.length > 0) {
      debugLog('📍 App Stack Trace:', appLines);
    }
  }

  private getErrorFrequency(message: string): number {
    const errors = errorStorage.getErrors();
    return errors.filter(e => e.message === message).length;
  }

  private getSuggestedActions(error: AdvancedError): string[] {
    const actions: string[] = [];

    switch (error.category) {
      case ErrorCategory.STORAGE:
        actions.push('Check browser storage quota');
        actions.push('Clear old data if necessary');
        break;
      case ErrorCategory.NETWORK:
        actions.push('Check network connectivity');
        actions.push('Verify API endpoints');
        break;
      case ErrorCategory.DATA_PROCESSING:
        actions.push('Validate input data format');
        actions.push('Add data sanitization');
        break;
      case ErrorCategory.RENDERING:
        actions.push('Check component props');
        actions.push('Verify state updates');
        break;
    }

    if (error.retryable) {
      actions.push('Consider implementing retry logic');
    }

    return actions;
  }

  private getRelatedErrors(error: AdvancedError): AdvancedError[] {
    const errors = errorStorage.getErrors();
    return errors
      .filter(
        e =>
          e.id !== error.id &&
          (e.category === error.category ||
            e.message.includes(error.message.substring(0, 20)))
      )
      .slice(-5);
  }

  // 統計情報取得
  getErrorStats(): ErrorStats {
    return errorStorage.getStats();
  }

  // エラーログクリア
  clearErrors(): void {
    errorStorage.clearErrors();
    debugLog('🧹 Error logs cleared');
  }

  // エラーエクスポート（開発用）
  exportErrors(): string {
    const stats = this.getErrorStats();
    return JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        sessionId: this.sessionId,
        ...stats,
      },
      null,
      2
    );
  }
}

// グローバルインスタンス
export const advancedErrorHandler = new AdvancedErrorHandler();

// 便利な関数
export function reportError(
  error: Error,
  context?: Record<string, unknown>
): AdvancedError {
  return advancedErrorHandler.handleError(error, context);
}

export function getErrorStats(): ErrorStats {
  return advancedErrorHandler.getErrorStats();
}

export function clearErrorLogs(): void {
  advancedErrorHandler.clearErrors();
}

export function exportErrorLogs(): string {
  return advancedErrorHandler.exportErrors();
}
