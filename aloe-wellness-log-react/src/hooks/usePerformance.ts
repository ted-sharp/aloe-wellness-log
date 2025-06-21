import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isDev } from '../utils/devTools';
import {
  performanceMonitor,
  trackDatabaseOperation,
  trackUserInteraction,
} from '../utils/performanceMonitor';

// パフォーマンス監視用のReactフック
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>(0);

  // コンポーネントのマウント時間を記録
  useEffect(() => {
    mountTimeRef.current = performance.now();
    performanceMonitor.trackRender.start(componentName);

    return () => {
      const mountDuration = performance.now() - mountTimeRef.current;
      if (isDev && mountDuration > 1000) {
        console.warn(
          `⚠️ ${componentName}: Long mount duration ${mountDuration.toFixed(
            2
          )}ms`
        );
      }
      performanceMonitor.trackRender.end(componentName);
    };
  }, [componentName]);

  // レンダリング回数をカウント
  useEffect(() => {
    renderCountRef.current += 1;
    if (renderCountRef.current > 1) {
      performanceMonitor.trackRender.reRender(
        componentName,
        `Render #${renderCountRef.current}`
      );
    }
  });

  // ユーザーインタラクション追跡
  const trackInteraction = useCallback((interactionType: string) => {
    return trackUserInteraction(interactionType, () => {
      // この関数内でユーザーのインタラクション処理を実行
    });
  }, []);

  // データベース操作追跡
  const trackDatabaseOp = useCallback(
    <T>(
      operation: string,
      operationFn: () => Promise<T>,
      recordCount?: number
    ) => {
      return trackDatabaseOperation(
        `${componentName}-${operation}`,
        async () => await operationFn(),
        recordCount
      );
    },
    [componentName]
  );

  return {
    trackInteraction,
    trackDatabaseOp,
    renderCount: renderCountRef.current,
  };
}

// レンダリング最適化のためのメモ化フック
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T {
  return useMemo(() => {
    const startTime = performance.now();
    const result = factory();
    const duration = performance.now() - startTime;

    if (isDev && duration > 10) {
      console.warn(
        `🐌 Slow memo computation: ${
          debugName || 'Anonymous'
        } took ${duration.toFixed(2)}ms`
      );
    }

    return result;
  }, deps);
}

// 大量データの仮想化支援フック
export function useVirtualization<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useOptimizedMemo(
    () => {
      const startIndex = Math.max(
        0,
        Math.floor(scrollTop / itemHeight) - overscan
      );
      const endIndex = Math.min(
        items.length,
        startIndex + visibleCount + overscan * 2
      );

      return items.slice(startIndex, endIndex).map((item, index) => ({
        item,
        index: startIndex + index,
        top: (startIndex + index) * itemHeight,
      }));
    },
    [items, scrollTop, itemHeight, visibleCount, overscan],
    'virtualization'
  );

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const startTime = performance.now();
    setScrollTop(event.currentTarget.scrollTop);
    const duration = performance.now() - startTime;

    if (isDev && duration > 16) {
      console.warn(
        `🐌 Slow scroll handler: virtual-scroll took ${duration.toFixed(2)}ms`
      );
    }
  }, []);

  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    handleScroll,
  };
}

// メモリ使用量監視フック
export function useMemoryMonitor(
  componentName: string,
  threshold: number = 70
) {
  const [memoryWarning, setMemoryWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!isDev) return;

    const checkMemory = () => {
      try {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
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
            const usagePercentage =
              (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

            if (usagePercentage > threshold) {
              const warning = `${componentName}: High memory usage ${usagePercentage.toFixed(
                1
              )}%`;
              setMemoryWarning(warning);
              console.warn(`🧠 ${warning}`);
            } else {
              setMemoryWarning(null);
            }
          }
        }
      } catch (error) {
        console.error('Memory monitoring error:', error);
      }
    };

    const interval = setInterval(checkMemory, 5000);
    checkMemory(); // 初回チェック

    return () => clearInterval(interval);
  }, [componentName, threshold]);

  return { memoryWarning };
}

// バンドルサイズ分析フック
export function useBundleAnalysis() {
  const [bundleStats, setBundleStats] = useState<{
    loadTime: number;
    resourceCount: number;
    totalSize: number;
  } | null>(null);

  useEffect(() => {
    if (!isDev) return;

    const analyzeBundle = async () => {
      try {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType(
          'resource'
        ) as PerformanceResourceTiming[];

        const totalSize = resources.reduce((sum, resource) => {
          return sum + (resource.transferSize || 0);
        }, 0);

        setBundleStats({
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          resourceCount: resources.length,
          totalSize: Math.round(totalSize / 1024), // KB
        });
      } catch (error) {
        console.error('Bundle analysis error:', error);
      }
    };

    // ページロード完了後に分析
    if (document.readyState === 'complete') {
      analyzeBundle();
    } else {
      window.addEventListener('load', analyzeBundle);
      return () => window.removeEventListener('load', analyzeBundle);
    }
  }, []);

  return bundleStats;
}

// パフォーマンス問題の自動検出フック
export function usePerformanceDetector(componentName: string) {
  const [issues, setIssues] = useState<string[]>([]);
  const lastRenderTime = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    const now = performance.now();

    if (lastRenderTime.current > 0) {
      const renderDuration = now - lastRenderTime.current;
      renderTimes.current.push(renderDuration);

      // 最新10回のレンダリング時間のみ保持
      if (renderTimes.current.length > 10) {
        renderTimes.current = renderTimes.current.slice(-10);
      }

      // パフォーマンス問題の検出
      const newIssues: string[] = [];

      // 頻繁な再レンダリング
      if (renderTimes.current.length >= 5) {
        const recentRenders = renderTimes.current.slice(-5);
        const avgTime =
          recentRenders.reduce((a, b) => a + b, 0) / recentRenders.length;

        if (avgTime > 16) {
          // 60fps基準
          newIssues.push(
            `[${componentName}] Slow rendering detected: ${avgTime.toFixed(
              2
            )}ms average`
          );
        }

        if (
          recentRenders.every(time => time < 50) &&
          recentRenders.length === 5
        ) {
          newIssues.push(
            `[${componentName}] Frequent re-renders detected (5 renders in quick succession)`
          );
        }
      }

      setIssues(newIssues);

      // 開発環境でのログ出力
      if (isDev && newIssues.length > 0) {
        console.warn(`⚠️ Performance issues in ${componentName}:`, newIssues);
      }
    }

    lastRenderTime.current = now;
  });

  // 改善提案を生成
  const suggestions = useOptimizedMemo(
    () => {
      const suggestions: string[] = [];

      issues.forEach(issue => {
        if (issue.includes('Slow rendering')) {
          suggestions.push(
            `Consider using React.memo for ${componentName} or optimizing render logic`
          );
        }
        if (issue.includes('Frequent re-renders')) {
          suggestions.push(
            `Check dependency arrays in ${componentName} hooks and consider useCallback/useMemo`
          );
        }
      });

      return suggestions;
    },
    [issues, componentName],
    `performance-suggestions-${componentName}`
  );

  return { issues, suggestions };
}

// 開発環境でのパフォーマンス情報表示フック
export function useDevPerformanceInfo(componentName: string) {
  const bundleStats = useBundleAnalysis();
  const { memoryWarning } = useMemoryMonitor(componentName);
  const { issues, suggestions } = usePerformanceDetector(componentName);

  useEffect(() => {
    if (!isDev) return;

    const logPerformanceInfo = () => {
      console.group(`🔍 Performance Info: ${componentName}`);

      if (bundleStats) {
        console.log('📦 Bundle Stats:', bundleStats);
      }

      if (memoryWarning) {
        console.warn('🧠 Memory Warning:', memoryWarning);
      }

      if (issues.length > 0) {
        console.warn('⚠️ Performance Issues:', issues);
        console.info('💡 Suggestions:', suggestions);
      }

      console.groupEnd();
    };

    // 10秒後に一度だけ表示（初期化が完了してから）
    const timeout = setTimeout(logPerformanceInfo, 10000);
    return () => clearTimeout(timeout);
  }, [componentName, bundleStats, memoryWarning, issues, suggestions]);

  return {
    bundleStats,
    memoryWarning,
    issues,
    suggestions,
  };
}
