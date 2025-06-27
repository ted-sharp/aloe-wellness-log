import { debugError, debugLog, debugWarn, isDev } from './devTools';

// パフォーマンスメトリクスの型定義
export interface PerformanceMetrics {
  // レンダリング関連
  renderTime: number;
  componentCount: number;
  reRenderCount: number;

  // メモリ関連
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
  } | null;

  // ネットワーク関連
  bundleSize: number;
  loadTime: number;

  // ユーザーインタラクション関連
  interactionToNext: number;
  inputDelay: number;

  // データベース関連
  dbOperationTime: number;
  recordCount: number;
}

// パフォーマンス監視設定
export interface PerformanceConfig {
  enableRenderTracking: boolean;
  enableMemoryTracking: boolean;
  enableInteractionTracking: boolean;
  enableDatabaseTracking: boolean;
  sampleRate: number; // 0-1の範囲でサンプリング率
  reportInterval: number; // レポート間隔（ミリ秒）
}

// デフォルト設定
const defaultConfig: PerformanceConfig = {
  enableRenderTracking: true,
  enableMemoryTracking: true,
  enableInteractionTracking: true,
  enableDatabaseTracking: true,
  sampleRate: isDev ? 1.0 : 0.1, // 開発環境では全て、本番では10%をサンプリング
  reportInterval: 30000, // 30秒間隔
};

// パフォーマンスデータストレージ
class PerformanceStorage {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig = defaultConfig) {
    this.config = config;
  }

  addMetric(metric: PerformanceMetrics): void {
    // サンプリング率に基づいて記録するかどうか決定
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    } as PerformanceMetrics & { timestamp: number });

    // メトリクス数を制限
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // 開発環境でのみローカルストレージに保存
    if (isDev) {
      try {
        localStorage.setItem(
          '__aloe_perf_metrics',
          JSON.stringify(this.metrics.slice(-100))
        );
      } catch (e) {
        // ストレージエラーは無視
      }
    }
  }

  getMetrics(): (PerformanceMetrics & { timestamp: number })[] {
    return [...this.metrics] as (PerformanceMetrics & { timestamp: number })[];
  }

  getAverageMetrics(timeWindow: number = 300000): Partial<PerformanceMetrics> {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      m =>
        (m as PerformanceMetrics & { timestamp: number }).timestamp >
        now - timeWindow
    );

    if (recentMetrics.length === 0) return {};

    const avg = recentMetrics.reduce(
      (acc, metric) => {
        return {
          renderTime: acc.renderTime + metric.renderTime,
          componentCount: acc.componentCount + metric.componentCount,
          reRenderCount: acc.reRenderCount + metric.reRenderCount,
          loadTime: acc.loadTime + metric.loadTime,
          interactionToNext: acc.interactionToNext + metric.interactionToNext,
          inputDelay: acc.inputDelay + metric.inputDelay,
          dbOperationTime: acc.dbOperationTime + metric.dbOperationTime,
          recordCount: acc.recordCount + metric.recordCount,
        };
      },
      {
        renderTime: 0,
        componentCount: 0,
        reRenderCount: 0,
        loadTime: 0,
        interactionToNext: 0,
        inputDelay: 0,
        dbOperationTime: 0,
        recordCount: 0,
      }
    );

    const count = recentMetrics.length;
    return {
      renderTime: avg.renderTime / count,
      componentCount: avg.componentCount / count,
      reRenderCount: avg.reRenderCount / count,
      loadTime: avg.loadTime / count,
      interactionToNext: avg.interactionToNext / count,
      inputDelay: avg.inputDelay / count,
      dbOperationTime: avg.dbOperationTime / count,
      recordCount: avg.recordCount / count,
    };
  }

  clearMetrics(): void {
    this.metrics = [];
    if (isDev) {
      localStorage.removeItem('__aloe_perf_metrics');
    }
  }
}

// グローバルストレージインスタンス
const performanceStorage = new PerformanceStorage();

// レンダリングパフォーマンス監視
export class RenderPerformanceTracker {
  private renderStartTimes = new Map<string, number>();
  private componentCounts = new Map<string, number>();
  private reRenderCounts = new Map<string, number>();

  startRender(componentName: string): void {
    if (!isDev) return;

    this.renderStartTimes.set(componentName, performance.now());
    this.componentCounts.set(
      componentName,
      (this.componentCounts.get(componentName) || 0) + 1
    );
  }

  endRender(componentName: string): void {
    if (!isDev) return;

    const startTime = this.renderStartTimes.get(componentName);
    if (startTime) {
      const renderTime = performance.now() - startTime;

      if (renderTime > 16) {
        // 60fps基準での警告
        debugWarn(
          `🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(
            2
          )}ms`
        );
      }

      this.renderStartTimes.delete(componentName);

      // 統計情報を更新
      debugLog(`🎨 Render [${componentName}]: ${renderTime.toFixed(2)}ms`);
    }
  }

  trackReRender(componentName: string, reason?: string): void {
    if (!isDev) return;

    const count = this.reRenderCounts.get(componentName) || 0;
    this.reRenderCounts.set(componentName, count + 1);

    if (count > 5) {
      // 頻繁な再レンダリングを警告
      debugWarn(
        `🔄 Frequent re-renders detected: ${componentName} (${
          count + 1
        } times)${reason ? ` - ${reason}` : ''}`
      );
    }
  }

  getStats(): Record<string, { count: number; reRenders: number }> {
    const stats: Record<string, { count: number; reRenders: number }> = {};

    for (const [component, count] of this.componentCounts) {
      stats[component] = {
        count,
        reRenders: this.reRenderCounts.get(component) || 0,
      };
    }

    return stats;
  }

  clearStats(): void {
    this.renderStartTimes.clear();
    this.componentCounts.clear();
    this.reRenderCounts.clear();
  }
}

// メモリ使用量監視
export class MemoryTracker {
  private lastMemoryCheck = 0;
  private memoryCheckInterval = 5000; // 5秒間隔

  getCurrentMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    try {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        // Chrome 限定の performance.memory API
        const memory = (
          performance as typeof performance & {
            memory?: {
              usedJSHeapSize: number;
              totalJSHeapSize: number;
              jsHeapSizeLimit: number;
            };
          }
        ).memory;
        if (memory) {
          return {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
          };
        }
      }
    } catch (error) {
      debugError('Failed to get memory usage:', error);
    }
    return null;
  }

  checkMemoryUsage(): void {
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }

    this.lastMemoryCheck = now;
    const memory = this.getCurrentMemoryUsage();

    if (memory) {
      const usagePercentage = (memory.used / memory.limit) * 100;

      if (usagePercentage > 80) {
        debugWarn(
          `🧠 High memory usage: ${memory.used}MB (${usagePercentage.toFixed(
            1
          )}%)`
        );
      }
    }
  }

  startMemoryMonitoring(): void {
    if (!isDev) return;

    setInterval(() => {
      this.checkMemoryUsage();
    }, this.memoryCheckInterval);
  }
}

// データベース操作パフォーマンス監視
export class DatabasePerformanceTracker {
  private operationStartTimes = new Map<string, number>();

  startOperation(operationId: string, operation: string): void {
    this.operationStartTimes.set(operationId, performance.now());
    debugLog(`💾 DB Operation Started: ${operation} [${operationId}]`);
  }

  endOperation(
    operationId: string,
    operation: string,
    recordCount?: number
  ): number {
    const startTime = this.operationStartTimes.get(operationId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.operationStartTimes.delete(operationId);

      if (duration > 100) {
        // 100ms以上で警告
        debugWarn(
          `🐌 Slow DB operation: ${operation} took ${duration.toFixed(2)}ms${
            recordCount ? ` (${recordCount} records)` : ''
          }`
        );
      }

      debugLog(
        `💾 DB Operation Complete: ${operation} [${operationId}] - ${duration.toFixed(
          2
        )}ms${recordCount ? ` (${recordCount} records)` : ''}`
      );

      return duration;
    }
    return 0;
  }
}

// ユーザーインタラクション監視
export class InteractionTracker {
  private interactionStartTimes = new Map<string, number>();

  startInteraction(interactionType: string): string {
    const id = `${interactionType}-${Date.now()}`;
    this.interactionStartTimes.set(id, performance.now());
    return id;
  }

  endInteraction(interactionId: string, interactionType: string): number {
    const startTime = this.interactionStartTimes.get(interactionId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.interactionStartTimes.delete(interactionId);

      if (duration > 100) {
        // 100ms以上で警告
        debugWarn(
          `⚡ Slow interaction: ${interactionType} took ${duration.toFixed(
            2
          )}ms`
        );
      }

      debugLog(`⚡ Interaction: ${interactionType} - ${duration.toFixed(2)}ms`);

      return duration;
    }
    return 0;
  }
}

// メインパフォーマンスモニター
export class PerformanceMonitor {
  private renderTracker = new RenderPerformanceTracker();
  private memoryTracker = new MemoryTracker();
  private dbTracker = new DatabasePerformanceTracker();
  private interactionTracker = new InteractionTracker();
  private config: PerformanceConfig;
  private reportingInterval?: NodeJS.Timeout;

  constructor(config: PerformanceConfig = defaultConfig) {
    this.config = config;

    if (isDev) {
      this.startMonitoring();
    }
  }

  private startMonitoring(): void {
    // メモリ監視開始
    if (this.config.enableMemoryTracking) {
      this.memoryTracker.startMemoryMonitoring();
    }

    // 定期レポート開始（generateReport削除のため無効化）
    // this.reportingInterval = setInterval(() => {
    //   this.generateReport();
    // }, this.config.reportInterval);

    debugLog('🔍 Performance monitoring started');
  }

  stopMonitoring(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = undefined;
    }
    debugLog('🔍 Performance monitoring stopped');
  }

  // レンダリング追跡
  trackRender = {
    start: (componentName: string) => {
      if (this.config.enableRenderTracking) {
        this.renderTracker.startRender(componentName);
      }
    },
    end: (componentName: string) => {
      if (this.config.enableRenderTracking) {
        this.renderTracker.endRender(componentName);
      }
    },
    reRender: (componentName: string, reason?: string) => {
      if (this.config.enableRenderTracking) {
        this.renderTracker.trackReRender(componentName, reason);
      }
    },
  };

  // データベース操作追跡
  trackDatabase = {
    start: (operationId: string, operation: string) => {
      if (this.config.enableDatabaseTracking) {
        this.dbTracker.startOperation(operationId, operation);
      }
    },
    end: (operationId: string, operation: string, recordCount?: number) => {
      if (this.config.enableDatabaseTracking) {
        return this.dbTracker.endOperation(operationId, operation, recordCount);
      }
      return 0;
    },
  };

  // ユーザーインタラクション追跡
  trackInteraction = {
    start: (interactionType: string) => {
      if (this.config.enableInteractionTracking) {
        return this.interactionTracker.startInteraction(interactionType);
      }
      return '';
    },
    end: (interactionId: string, interactionType: string) => {
      if (this.config.enableInteractionTracking) {
        return this.interactionTracker.endInteraction(
          interactionId,
          interactionType
        );
      }
      return 0;
    },
  };

  // メトリクス取得
  getMetrics(): (PerformanceMetrics & { timestamp: number })[] {
    return performanceStorage.getMetrics();
  }

  // メトリクスクリア
  clearMetrics(): void {
    performanceStorage.clearMetrics();
    this.renderTracker.clearStats();
  }

  // 設定更新
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// グローバルインスタンス
export const performanceMonitor = new PerformanceMonitor();

// 便利な関数
export function trackRenderTime<T>(
  componentName: string,
  renderFn: () => T
): T {
  performanceMonitor.trackRender.start(componentName);
  try {
    const result = renderFn();
    performanceMonitor.trackRender.end(componentName);
    return result;
  } catch (error) {
    performanceMonitor.trackRender.end(componentName);
    throw error;
  }
}

export function trackDatabaseOperation<T>(
  operation: string,
  operationFn: (operationId: string) => Promise<T>,
  recordCount?: number
): Promise<T> {
  const operationId = `${operation}-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  performanceMonitor.trackDatabase.start(operationId, operation);

  return operationFn(operationId)
    .then(result => {
      performanceMonitor.trackDatabase.end(operationId, operation, recordCount);
      return result;
    })
    .catch(error => {
      performanceMonitor.trackDatabase.end(operationId, operation, recordCount);
      throw error;
    });
}

export function trackUserInteraction<T>(
  interactionType: string,
  interactionFn: () => T
): T {
  const interactionId =
    performanceMonitor.trackInteraction.start(interactionType);
  try {
    const result = interactionFn();
    performanceMonitor.trackInteraction.end(interactionId, interactionType);
    return result;
  } catch (error) {
    performanceMonitor.trackInteraction.end(interactionId, interactionType);
    throw error;
  }
}

// 開発ツールへの統合
if (isDev && typeof window !== 'undefined') {
  (
    window as typeof window & {
      __ALOE_PERF__?: {
        monitor: PerformanceMonitor;
        // generateReport: () => ReturnType<PerformanceMonitor['generateReport']>; // 削除
        getMetrics: () => ReturnType<PerformanceMonitor['getMetrics']>;
        clearMetrics: () => void;
      };
    }
  ).__ALOE_PERF__ = {
    monitor: performanceMonitor,
    // generateReport: () => performanceMonitor.generateReport(), // 削除
    getMetrics: () => performanceMonitor.getMetrics(),
    clearMetrics: () => performanceMonitor.clearMetrics(),
  };
}
