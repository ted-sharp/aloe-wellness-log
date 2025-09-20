/**
 * 構造化ログユーティリティ
 *
 * 開発環境では詳細なログを出力し、
 * 本番環境では必要最小限のログのみ出力します。
 */

// 環境判定
const isDev = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test';

// ログレベル定義
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ログコンテキスト型定義
export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

// ログエントリ型定義
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: number;
  source: string;
}

// パフォーマンス測定用
export interface PerformanceLog {
  operation: string;
  duration: number;
  context?: LogContext;
}

class Logger {
  private sessionId: string;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000; // メモリ制限

  constructor() {
    this.sessionId = this.generateSessionId();

    // 初期化ログ
    if (isDev) {
      console.info('🌿 Logger initialized', { sessionId: this.sessionId });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      context: {
        ...context,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      source: 'aloe-wellness-log',
    };

    // メモリ制限管理
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    // テスト環境では静かに
    if (isTest) return false;

    // 本番環境では warn と error のみ
    if (!isDev) {
      return level === 'warn' || level === 'error';
    }

    return true;
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return '📘';
      case 'warn': return '⚠️';
      case 'error': return '🚨';
      default: return '📝';
    }
  }

  /**
   * デバッグレベルのログ出力
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.formatMessage('debug', message, context);
    console.debug(`${this.getEmoji('debug')} ${message}`, entry.context);
  }

  /**
   * 情報レベルのログ出力
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;

    const entry = this.formatMessage('info', message, context);
    console.info(`${this.getEmoji('info')} ${message}`, entry.context);
  }

  /**
   * 警告レベルのログ出力
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.formatMessage('warn', message, context);
    console.warn(`${this.getEmoji('warn')} ${message}`, entry.context);
  }

  /**
   * エラーレベルのログ出力
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return;

    const entry = this.formatMessage('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: isDev ? error.stack : undefined,
      } : undefined,
    });

    console.error(`${this.getEmoji('error')} ${message}`, entry.context);
  }

  /**
   * パフォーマンス測定用ログ
   */
  performance(log: PerformanceLog): void {
    if (!this.shouldLog('info')) return;

    this.info(`Performance: ${log.operation}`, {
      ...log.context,
      duration: log.duration,
      operation: log.operation,
      performanceType: 'timing',
    });
  }

  /**
   * ユーザーアクション記録
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, {
      ...context,
      action,
      actionType: 'user-interaction',
    });
  }

  /**
   * データベース操作記録
   */
  dbOperation(operation: string, success: boolean, context?: LogContext): void {
    const level = success ? 'info' : 'warn';
    const message = `DB ${operation}: ${success ? 'success' : 'failed'}`;

    if (level === 'info') {
      this.info(message, { ...context, dbOperation: operation, success });
    } else {
      this.warn(message, { ...context, dbOperation: operation, success });
    }
  }

  /**
   * コンポーネントライフサイクル記録
   */
  componentLifecycle(component: string, lifecycle: string, context?: LogContext): void {
    this.debug(`Component ${component}: ${lifecycle}`, {
      ...context,
      component,
      lifecycle,
      lifecycleType: 'component',
    });
  }

  /**
   * ログ履歴の取得
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * ログのクリア
   */
  clearLogs(): void {
    this.logs = [];
    if (isDev) {
      console.info('🧹 Logs cleared');
    }
  }

  /**
   * ログの統計情報
   */
  getStats(): { total: number; byLevel: Record<LogLevel, number> } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
      } as Record<LogLevel, number>,
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
    });

    return stats;
  }

  /**
   * エラー報告用のサマリー
   */
  getErrorSummary(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error');
  }
}

// シングルトンインスタンス
const logger = new Logger();

// パフォーマンス測定用ヘルパー
export function measurePerformance<T>(
  operation: string,
  fn: () => T,
  context?: LogContext
): T {
  const start = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - start;

    logger.performance({
      operation,
      duration,
      context: { ...context, success: true },
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    logger.performance({
      operation,
      duration,
      context: { ...context, success: false },
    });

    logger.error(`Performance measurement failed for ${operation}`, error as Error, context);
    throw error;
  }
}

// 非同期パフォーマンス測定用ヘルパー
export async function measurePerformanceAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    logger.performance({
      operation,
      duration,
      context: { ...context, success: true },
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    logger.performance({
      operation,
      duration,
      context: { ...context, success: false },
    });

    logger.error(`Async performance measurement failed for ${operation}`, error as Error, context);
    throw error;
  }
}

// エクスポート
export { logger };
export default logger;