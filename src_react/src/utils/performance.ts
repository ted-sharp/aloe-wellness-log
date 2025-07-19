// パフォーマンス最適化ユーティリティ

import React, { useCallback, useMemo, useRef } from 'react';

/**
 * デバウンス機能付きコールバックフック
 * 高頻度で発生するイベント（検索入力など）を最適化
 */
export const useDebounce = <T extends readonly unknown[]>(
  callback: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * スロットリング機能付きコールバックフック
 * 高頻度で発生するイベント（スクロールなど）を最適化
 */
export const useThrottle = <T extends readonly unknown[]>(
  callback: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: T) => {
    const now = Date.now();
    
    if (now - lastExecuted.current >= delay) {
      lastExecuted.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastExecuted.current = Date.now();
        callback(...args);
      }, delay - (now - lastExecuted.current));
    }
  }, [callback, delay]);
};

/**
 * 重い計算を含むメモ化フック
 * 依存関係が変更された時のみ再計算
 */
export const useExpensiveComputation = <T, D extends readonly unknown[]>(
  computeFn: () => T,
  deps: D
): T => {
  return useMemo(() => {
    const start = performance.now();
    const result = computeFn();
    const end = performance.now();
    
    if (end - start > 100) {
      console.warn(`Expensive computation took ${(end - start).toFixed(2)}ms`, {
        deps,
        duration: end - start,
      });
    }
    
    return result;
  }, deps);
};

/**
 * バーチャルスクロール用のアイテム計算
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const useVirtualScroll = <T>(
  items: T[],
  scrollTop: number,
  options: VirtualScrollOptions
) => {
  return useMemo(() => {
    const { itemHeight, containerHeight, overscan = 5 } = options;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    const visibleItems = items.slice(startIndex, endIndex + 1);
    
    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, scrollTop, options.itemHeight, options.containerHeight, options.overscan]);
};

/**
 * 大量データのチャンク処理フック
 */
export const useChunkedProcessing = <T, R>(
  data: T[],
  processor: (chunk: T[]) => R[],
  chunkSize: number = 100
): R[] => {
  return useMemo(() => {
    if (data.length === 0) return [];
    
    const results: R[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = processor(chunk);
      results.push(...chunkResults);
    }
    
    return results;
  }, [data, processor, chunkSize]);
};

/**
 * メモリ使用量監視フック
 */
export const useMemoryMonitor = (threshold: number = 50 * 1024 * 1024) => { // 50MB
  const checkMemory = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as Performance & {
        memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        }
      }).memory;
      const used = memInfo.usedJSHeapSize;
      const total = memInfo.totalJSHeapSize;
      const limit = memInfo.jsHeapSizeLimit;
      
      if (used > threshold) {
        console.warn('High memory usage detected:', {
          used: `${(used / 1024 / 1024).toFixed(2)}MB`,
          total: `${(total / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(limit / 1024 / 1024).toFixed(2)}MB`,
          usage: `${((used / limit) * 100).toFixed(2)}%`,
        });
      }
      
      return { used, total, limit, usagePercent: (used / limit) * 100 };
    }
    
    return null;
  }, [threshold]);

  return { checkMemory };
};

/**
 * レンダリング回数追跡フック（開発用）
 */
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${componentName} rendered ${renderCount.current} times`);
  }
  
  return renderCount.current;
};

/**
 * 前回の値を保持するフック
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  
  const previous = ref.current;
  ref.current = value;
  
  return previous;
};

/**
 * 配列の差分計算フック
 */
export const useArrayDiff = <T>(
  current: T[],
  getId: (item: T, index: number) => string | number = (_item: T, index: number) => index
) => {
  const previous = usePrevious(current);
  
  return useMemo(() => {
    if (!previous) {
      return {
        added: current,
        removed: [],
        changed: [],
        unchanged: [],
      };
    }
    
    const previousIds = new Set(previous.map((item, index) => getId(item, index)));
    const currentIds = new Set(current.map((item, index) => getId(item, index)));
    
    const added = current.filter((item, index) => !previousIds.has(getId(item, index)));
    const removed = previous.filter((item, index) => !currentIds.has(getId(item, index)));
    
    const unchanged = current.filter((item, index) => {
      const id = getId(item, index);
      if (!previousIds.has(id)) return false;
      
      const prevItem = previous.find((p, pIndex) => getId(p, pIndex) === id);
      return JSON.stringify(item) === JSON.stringify(prevItem);
    });
    
    const changed = current.filter((item, index) => {
      const id = getId(item, index);
      if (!previousIds.has(id)) return false;
      
      const prevItem = previous.find((p, pIndex) => getId(p, pIndex) === id);
      return JSON.stringify(item) !== JSON.stringify(prevItem);
    });
    
    return { added, removed, changed, unchanged };
  }, [current, previous, getId]);
};

/**
 * レンダリングパフォーマンス測定フック
 */
export const useRenderPerformance = (componentName: string) => {
  const startTime = useRef<number>();
  
  // レンダリング開始時間を記録
  if (!startTime.current) {
    startTime.current = performance.now();
  }
  
  // レンダリング完了後に時間を計測
  useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      
      if (duration > 16) { // 16ms以上（60FPSを下回る）
        console.warn(`${componentName} render took ${duration.toFixed(2)}ms`);
      }
      
      startTime.current = undefined;
    }
  }, [componentName])();
};

/**
 * コンポーネントのメモ化ヘルパー
 */
export const withMemo = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, propsAreEqual);
};

/**
 * 重い処理を Web Worker で実行するフック
 */
export const useWebWorker = <T, R>(
  workerFunction: (data: T) => R,
  dependencies: readonly unknown[] = []
) => {
  const workerRef = useRef<Worker>();
  
  const execute = useCallback((data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      
      const workerCode = `
        self.onmessage = function(e) {
          const result = (${workerFunction.toString()})(e.data);
          self.postMessage(result);
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      workerRef.current = worker;
      
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      
      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
      
      worker.postMessage(data);
    });
  }, dependencies);
  
  // クリーンアップ
  useCallback(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [])();
  
  return { execute };
};