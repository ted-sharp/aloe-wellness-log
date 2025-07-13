import { isDev } from '../utils/devTools';
import { performanceMonitor } from '../utils/performanceMonitor';

// データベース操作のパフォーマンス情報
export interface DbOperationMetrics {
  operationId: string;
  operationName: string;
  duration: number;
  recordCount?: number;
  timestamp: number;
  success: boolean;
  errorType?: string;
}

// パフォーマンス警告の閾値
const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 100, // 100ms以上で警告
  VERY_SLOW_OPERATION: 500, // 500ms以上で厳重警告
  LARGE_RESULT_SET: 1000, // 1000件以上で警告
} as const;

/**
 * データベース操作のパフォーマンス追跡とログ記録
 */
export async function trackDbOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  recordCount?: number
): Promise<T> {
  const operationId = generateOperationId(operationName);
  const startTime = performance.now();

  // パフォーマンス監視開始
  performanceMonitor.trackDatabase.start(operationId, operationName);

  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    // 成功時のメトリクス記録
    recordMetrics({
      operationId,
      operationName,
      duration,
      recordCount,
      timestamp: Date.now(),
      success: true,
    });

    // パフォーマンス監視終了
    performanceMonitor.trackDatabase.end(operationId, operationName, recordCount);

    // 開発環境での詳細ログ出力
    logOperationDetails(operationName, duration, recordCount, true);

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // エラー時のメトリクス記録
    recordMetrics({
      operationId,
      operationName,
      duration,
      recordCount,
      timestamp: Date.now(),
      success: false,
      errorType: error instanceof Error ? error.name : 'Unknown',
    });

    // パフォーマンス監視終了（エラー）
    performanceMonitor.trackDatabase.end(operationId, operationName, recordCount);

    // エラーログ出力
    logOperationDetails(operationName, duration, recordCount, false, error);

    throw error;
  }
}

/**
 * 操作IDの生成
 */
function generateOperationId(operationName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${operationName}-${timestamp}-${random}`;
}

/**
 * メトリクスの記録
 */
function recordMetrics(metrics: DbOperationMetrics): void {
  // 開発環境でのみメトリクス詳細を記録
  if (isDev) {
    // メトリクスをセッションストレージに保存（デバッグ用）
    const existingMetrics = getStoredMetrics();
    existingMetrics.push(metrics);
    
    // 最新の100件のみ保持
    const recentMetrics = existingMetrics.slice(-100);
    
    try {
      sessionStorage.setItem('db-metrics', JSON.stringify(recentMetrics));
    } catch (error) {
      // ストレージエラーは無視
    }
  }
}

/**
 * 保存されたメトリクスの取得
 */
function getStoredMetrics(): DbOperationMetrics[] {
  try {
    const stored = sessionStorage.getItem('db-metrics');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * 操作詳細のログ出力
 */
function logOperationDetails(
  operationName: string,
  duration: number,
  recordCount?: number,
  success: boolean = true,
  error?: unknown
): void {
  if (!isDev) return;

  const formattedDuration = duration.toFixed(2);
  const recordInfo = recordCount ? ` (${recordCount} records)` : '';
  
  if (success) {
    console.log(`💾 DB ${operationName}: ${formattedDuration}ms${recordInfo}`);
    
    // パフォーマンス警告
    if (duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION) {
      console.warn(
        `🐌 Very slow DB operation: ${operationName} took ${formattedDuration}ms${recordInfo}`
      );
    } else if (duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION) {
      console.warn(
        `🐌 Slow DB operation: ${operationName} took ${formattedDuration}ms${recordInfo}`
      );
    }
    
    // 大量データ警告
    if (recordCount && recordCount > PERFORMANCE_THRESHOLDS.LARGE_RESULT_SET) {
      console.warn(
        `📊 Large result set: ${operationName} returned ${recordCount} records`
      );
    }
  } else {
    console.error(`❌ DB ${operationName} failed:`, error);
  }
}

/**
 * パフォーマンス統計の取得
 */
export function getPerformanceStats(): {
  totalOperations: number;
  averageDuration: number;
  slowOperations: number;
  errorRate: number;
  recentMetrics: DbOperationMetrics[];
} {
  const metrics = getStoredMetrics();
  
  if (metrics.length === 0) {
    return {
      totalOperations: 0,
      averageDuration: 0,
      slowOperations: 0,
      errorRate: 0,
      recentMetrics: [],
    };
  }
  
  const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
  const slowOperations = metrics.filter(m => m.duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION).length;
  const errorCount = metrics.filter(m => !m.success).length;
  
  return {
    totalOperations: metrics.length,
    averageDuration: totalDuration / metrics.length,
    slowOperations,
    errorRate: errorCount / metrics.length,
    recentMetrics: metrics.slice(-10), // 最新10件
  };
}

/**
 * パフォーマンスメトリクスのクリア
 */
export function clearPerformanceMetrics(): void {
  try {
    sessionStorage.removeItem('db-metrics');
  } catch {
    // エラーは無視
  }
}

/**
 * パフォーマンス レポートの生成
 */
export function generatePerformanceReport(): string {
  const stats = getPerformanceStats();
  
  if (stats.totalOperations === 0) {
    return 'パフォーマンスデータがありません';
  }
  
  return `
データベース パフォーマンス レポート:
総操作数: ${stats.totalOperations}
平均実行時間: ${stats.averageDuration.toFixed(2)}ms
遅い操作数: ${stats.slowOperations}
エラー率: ${(stats.errorRate * 100).toFixed(2)}%

最近の操作:
${stats.recentMetrics.map(m => 
  `- ${m.operationName}: ${m.duration.toFixed(2)}ms ${m.success ? '✓' : '✗'}`
).join('\n')}
`.trim();
}