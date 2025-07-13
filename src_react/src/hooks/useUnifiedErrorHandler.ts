import { useCallback, useRef, useState } from 'react';
import { useToastStore } from '../store/toast';
import type {
  ErrorHandlingConfig,
  UnifiedError,
} from '../utils/unifiedErrorHandler';
import {
  ErrorSeverity,
  RecoveryAction,
  UnifiedErrorType,
  createUnifiedError,
  logUnifiedError,
} from '../utils/unifiedErrorHandler';

// 後方互換性のため、古いAPIをエクスポート
export { useUnifiedErrorHandler as useErrorHandler };

// Hookオプション
interface UseUnifiedErrorHandlerOptions extends Partial<ErrorHandlingConfig> {
  onError?: (error: UnifiedError) => void;
  onRecovery?: (error: UnifiedError, action: RecoveryAction) => void;
}

// 回復アクション実行結果
interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  error?: string;
}

export function useUnifiedErrorHandler(
  options: UseUnifiedErrorHandlerOptions = {}
) {
  const { showError, showWarning, showInfo, showSuccess } = useToastStore();
  const [activeErrors, setActiveErrors] = useState<UnifiedError[]>([]);
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // エラー処理のメイン関数
  const handleError = useCallback(
    (
      error: unknown,
      context?: Record<string, unknown>,
      config?: Partial<ErrorHandlingConfig>
    ): UnifiedError => {
      const mergedConfig = { ...options, ...config };
      const unifiedError = createUnifiedError(error, context, mergedConfig);

      // アクティブエラーリストに追加
      setActiveErrors(prev => [...prev, unifiedError]);

      // ログ出力
      if (mergedConfig.logToConsole !== false) {
        logUnifiedError(unifiedError, context?.operation as string);
      }

      // トースト表示
      if (mergedConfig.showToast !== false) {
        showErrorToast(unifiedError);
      }

      // 自動リトライ開始
      if (mergedConfig.autoRetry !== false && unifiedError.retryable) {
        scheduleRetry(unifiedError, mergedConfig);
      }

      // カスタムエラーハンドラー実行
      options.onError?.(unifiedError);

      return unifiedError;
    },
    [options, showError, showWarning, showInfo]
  );

  // 非同期関数のエラーハンドリング（自動リトライ機能付き）
  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context?: Record<string, unknown>,
      config?: Partial<ErrorHandlingConfig>
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        const unifiedError = handleError(error, context, config);

        // リトライ可能でない場合はnullを返す
        if (!unifiedError.retryable) {
          return null;
        }

        // リトライ処理は scheduleRetry で処理される
        return null;
      }
    },
    [handleError]
  );

  // トースト表示制御
  const showErrorToast = useCallback(
    (unifiedError: UnifiedError) => {
      const message = unifiedError.userMessage;

      switch (unifiedError.severity) {
        case ErrorSeverity.CRITICAL:
        case ErrorSeverity.HIGH:
          showError(message);
          break;
        case ErrorSeverity.MEDIUM:
          showWarning(message);
          break;
        case ErrorSeverity.LOW:
          if (unifiedError.type === UnifiedErrorType.VALIDATION) {
            showWarning(message);
          } else {
            showInfo(message);
          }
          break;
      }
    },
    [showError, showWarning, showInfo]
  );

  // 自動リトライのスケジュール
  const scheduleRetry = useCallback(
    (unifiedError: UnifiedError, config: Partial<ErrorHandlingConfig>) => {
      if (
        !unifiedError.retryable ||
        (unifiedError.currentRetries ?? 0) >=
          (unifiedError.maxRetries ?? config.maxRetries ?? 3)
      ) {
        return;
      }

      const delay =
        (config.retryDelay ?? 1000) *
        Math.pow(2, unifiedError.currentRetries ?? 0);

      const timeoutId = setTimeout(() => {
        // リトライ実行
        executeRetry(unifiedError);
        retryTimeouts.current.delete(unifiedError.id);
      }, delay);

      retryTimeouts.current.set(unifiedError.id, timeoutId);
    },
    []
  );

  // リトライ実行
  const executeRetry = useCallback(async (unifiedError: UnifiedError) => {
    const updatedError = {
      ...unifiedError,
      currentRetries: (unifiedError.currentRetries ?? 0) + 1,
    };

    setActiveErrors(prev =>
      prev.map(e => (e.id === unifiedError.id ? updatedError : e))
    );

    // リトライロジックは呼び出し元で再実行される必要があります
    // ここでは回復アクションの提案を行います
    if (updatedError.currentRetries >= (updatedError.maxRetries ?? 3)) {
      showRecoveryOptions(updatedError);
    }
  }, []);

  // 回復オプションの表示
  const showRecoveryOptions = useCallback((unifiedError: UnifiedError) => {
    const actions = unifiedError.recoveryActions;

    if (actions.length === 0 || actions[0] === RecoveryAction.NONE) {
      return;
    }

    // 最も適切な回復アクションを自動実行
    const primaryAction = actions[0];
    executeRecoveryAction(unifiedError, primaryAction);
  }, []);

  // 回復アクション実行
  const executeRecoveryAction = useCallback(
    async (
      unifiedError: UnifiedError,
      action: RecoveryAction
    ): Promise<RecoveryResult> => {
      try {
        switch (action) {
          case RecoveryAction.RETRY:
            // 手動リトライ（これは呼び出し元で処理する必要がある）
            showInfo('操作を再試行しています...');
            return { success: true, action };

          case RecoveryAction.RELOAD_PAGE:
            showInfo('ページを再読み込みします...');
            setTimeout(() => window.location.reload(), 1000);
            return { success: true, action };

          case RecoveryAction.CLEAR_CACHE:
            try {
              // IndexedDBキャッシュクリア
              const databases = await indexedDB.databases();
              await Promise.all(
                databases.map(db => {
                  if (db.name) {
                    return new Promise<void>((resolve, reject) => {
                      const deleteReq = indexedDB.deleteDatabase(db.name!);
                      deleteReq.onsuccess = () => resolve();
                      deleteReq.onerror = () => reject(deleteReq.error);
                    });
                  }
                  return Promise.resolve();
                })
              );

              // LocalStorageクリア
              localStorage.clear();

              showSuccess(
                'キャッシュを削除しました。ページを再読み込みします...'
              );
              setTimeout(() => window.location.reload(), 1000);
              return { success: true, action };
            } catch (error) {
              return {
                success: false,
                action,
                error: 'キャッシュの削除に失敗しました',
              };
            }

          case RecoveryAction.NAVIGATE_BACK:
            showInfo('前のページに戻ります...');
            setTimeout(() => window.history.back(), 500);
            return { success: true, action };

          case RecoveryAction.USER_ACTION_REQUIRED:
            // ユーザーアクションが必要な場合は何もしない
            return { success: true, action };

          default:
            return {
              success: false,
              action,
              error: '未知の回復アクションです',
            };
        }
      } catch (error) {
        return {
          success: false,
          action,
          error:
            error instanceof Error
              ? error.message
              : '回復アクションの実行に失敗しました',
        };
      } finally {
        // 回復アクション実行後にコールバックを呼び出し
        options.onRecovery?.(unifiedError, action);
      }
    },
    [showInfo, showSuccess, options.onRecovery]
  );

  // エラー解決
  const resolveError = useCallback((errorId: string) => {
    setActiveErrors(prev =>
      prev.map(error =>
        error.id === errorId ? { ...error, resolved: true } : error
      )
    );

    // リトライタイマーをクリア
    const timeoutId = retryTimeouts.current.get(errorId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      retryTimeouts.current.delete(errorId);
    }
  }, []);

  // エラークリア
  const clearErrors = useCallback(() => {
    // 全てのリトライタイマーをクリア
    retryTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    retryTimeouts.current.clear();

    setActiveErrors([]);
  }, []);

  // アクティブエラー取得
  const getActiveErrors = useCallback(() => {
    return activeErrors.filter(error => !error.resolved);
  }, [activeErrors]);

  // 特定タイプのエラー取得
  const getErrorsByType = useCallback(
    (type: UnifiedErrorType) => {
      return activeErrors.filter(
        error => error.type === type && !error.resolved
      );
    },
    [activeErrors]
  );

  // 複数エラーの一括処理
  const handleBatchErrors = useCallback(
    (
      errors: Array<{ error: unknown; context?: Record<string, unknown> }>,
      config?: Partial<ErrorHandlingConfig>
    ): UnifiedError[] => {
      return errors.map(({ error, context }) =>
        handleError(error, context, config)
      );
    },
    [handleError]
  );

  return {
    // 基本エラーハンドリング
    handleError,
    handleAsyncError,
    handleBatchErrors,

    // 回復機能
    executeRecoveryAction,
    resolveError,
    clearErrors,

    // エラー状態取得
    activeErrors: getActiveErrors(),
    getErrorsByType,

    // 設定
    config: options,
  };
}
