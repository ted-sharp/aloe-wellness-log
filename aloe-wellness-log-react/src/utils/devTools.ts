// 開発者用デバッグツール
// 本番環境では全て無効化される

export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;

// デバッグログ関数
export const debugLog = (...args: unknown[]) => {
  if (isDev) {
    console.log('🐛 [DEBUG]', ...args);
  }
};

export const debugWarn = (...args: unknown[]) => {
  if (isDev) {
    console.warn('⚠️ [WARN]', ...args);
  }
};

export const debugError = (...args: unknown[]) => {
  if (isDev) {
    console.error('❌ [ERROR]', ...args);
  }
};

// パフォーマンス測定
export const perfStart = (label: string) => {
  if (isDev) {
    try {
      if (performance && performance.mark) {
        performance.mark(`${label}-start`);
      }
    } catch (error) {
      console.warn('⚠️ Performance start failed:', error);
    }
  }
};

export const perfEnd = (label: string) => {
  if (isDev) {
    try {
      if (performance && performance.mark && performance.measure) {
        performance.mark(`${label}-end`);
        performance.measure(label, `${label}-start`, `${label}-end`);

        const entries = performance.getEntriesByName(label);
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          debugLog(`⏱️ ${label}: ${lastEntry.duration.toFixed(2)}ms`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Performance end failed:', error);
    }
  }
};

// Store状態のデバッグ
export const debugStore = (storeName: string, state: unknown) => {
  if (isDev) {
    debugLog(`📦 Store [${storeName}]:`, state);
  }
};

// API レスポンスのデバッグ
export const debugAPI = (
  endpoint: string,
  method: string,
  data?: unknown,
  response?: unknown
) => {
  if (isDev) {
    debugLog(`🌐 API [${method.toUpperCase()}] ${endpoint}:`, {
      request: data,
      response: response,
    });
  }
};

// IndexedDB操作のデバッグ
export const debugDB = (operation: string, data?: unknown) => {
  if (isDev) {
    debugLog(`💾 IndexedDB [${operation}]:`, data);
  }
};

// エラーレポート（開発用）
export const debugErrorReport = (error: Error, context?: string) => {
  if (isDev) {
    debugError(`🚨 Error ${context ? `in ${context}` : ''}:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

// コンポーネントのレンダリングデバッグ
export const debugRender = (
  componentName: string,
  props?: Record<string, unknown>
) => {
  if (isDev) {
    debugLog(`🎨 Render [${componentName}]:`, props);
  }
};

// 開発用のグローバルヘルパー
export const exposeDevTools = () => {
  if (isDev && typeof window !== 'undefined') {
    try {
      (window as WindowWithDevTools).__ALOE_DEV__ = {
        debugLog,
        debugWarn,
        debugError,
        debugStore,
        debugAPI,
        debugDB,
        perfStart,
        perfEnd,
        // RecordsStore の直接操作（開発用）
        getRecords: () => {
          try {
            const event = new CustomEvent('__GET_RECORDS__');
            window.dispatchEvent(event);
          } catch (error) {
            console.warn('⚠️ Get records failed:', error);
          }
        },
        clearRecords: () => {
          try {
            const event = new CustomEvent('__CLEAR_RECORDS__');
            window.dispatchEvent(event);
          } catch (error) {
            console.warn('⚠️ Clear records failed:', error);
          }
        },
        // テストデータ生成
        generateTestData: (count: number = 10) => {
          try {
            const event = new CustomEvent('__GENERATE_TEST_DATA__', {
              detail: { count },
            });
            window.dispatchEvent(event);
          } catch (error) {
            console.warn('⚠️ Generate test data failed:', error);
          }
        },
      };

      debugLog('🛠️ Development tools exposed to window.__ALOE_DEV__');
      const devTools = (window as WindowWithDevTools).__ALOE_DEV__;
      if (devTools) {
        debugLog('Available commands:', Object.keys(devTools));
      }
    } catch (error) {
      console.warn('⚠️ Failed to expose development tools:', error);
    }
  }
};

// Window型拡張
interface WindowWithDevTools extends Window {
  __ALOE_DEV__?: {
    debugLog: typeof debugLog;
    debugWarn: typeof debugWarn;
    debugError: typeof debugError;
    debugStore: typeof debugStore;
    debugAPI: typeof debugAPI;
    debugDB: typeof debugDB;
    perfStart: typeof perfStart;
    perfEnd: typeof perfEnd;
    getRecords: () => void;
    clearRecords: () => void;
    generateTestData: (count?: number) => void;
  };
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: object;
}

// React DevTools検出
export const detectReactDevTools = () => {
  if (isDev && typeof window !== 'undefined') {
    try {
      const hasReactDevTools = !!(window as WindowWithDevTools)
        .__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hasReactDevTools) {
        debugLog('⚛️ React DevTools detected');
      } else {
        debugWarn(
          '⚛️ React DevTools not found. Install React DevTools extension for better debugging.'
        );
      }
    } catch (error) {
      console.warn('⚠️ React DevTools detection failed:', error);
    }
  }
};

// 開発環境での警告表示
export const showDevWarnings = () => {
  if (isDev) {
    try {
      debugLog('🚧 Development Mode Active');
      debugLog('📝 Debug logs are enabled');
      debugLog('🔍 Performance monitoring is active');

      // Service Worker の警告
      if ('serviceWorker' in navigator) {
        debugWarn(
          '🔧 Service Worker is active in development. Clear cache if needed.'
        );
      }
    } catch (error) {
      console.warn('⚠️ Failed to show development warnings:', error);
    }
  }
};

// 型安全なローカルストレージヘルパー
export const devStorage = {
  set: <T>(key: string, value: T): void => {
    if (isDev) {
      try {
        localStorage.setItem(`__ALOE_DEV_${key}`, JSON.stringify(value));
        debugLog(`💾 DevStorage SET [${key}]:`, value);
      } catch (error) {
        debugError('Failed to save to devStorage:', error);
      }
    }
  },

  get: <T>(key: string, defaultValue?: T): T | undefined => {
    if (isDev) {
      try {
        const item = localStorage.getItem(`__ALOE_DEV_${key}`);
        if (item) {
          const value = JSON.parse(item) as T;
          debugLog(`💾 DevStorage GET [${key}]:`, value);
          return value;
        }
        return defaultValue;
      } catch (error) {
        debugError('Failed to read from devStorage:', error);
        return defaultValue;
      }
    }
    return defaultValue;
  },

  remove: (key: string): void => {
    if (isDev) {
      localStorage.removeItem(`__ALOE_DEV_${key}`);
      debugLog(`💾 DevStorage REMOVE [${key}]`);
    }
  },

  clear: (): void => {
    if (isDev) {
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith('__ALOE_DEV_')
      );
      keys.forEach(key => localStorage.removeItem(key));
      debugLog(`💾 DevStorage CLEAR: ${keys.length} items removed`);
    }
  },
};
