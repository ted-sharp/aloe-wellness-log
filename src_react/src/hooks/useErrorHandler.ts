import { useCallback } from 'react';
import { useToastStore } from '../store/toast';
import { classifyError, getDisplayMessage, logError } from '../utils/errorHandler';
import type { AppError } from '../utils/errorHandler';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  context?: string;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const { showError, showWarning } = useToastStore();

  const handleError = useCallback(
    (
      error: unknown,
      options: ErrorHandlerOptions = {}
    ): AppError => {
      const {
        showToast = true,
        logToConsole = true,
        context,
        fallbackMessage
      } = options;

      // エラーを分類
      const appError = classifyError(error);

      // コンソールログ出力
      if (logToConsole) {
        logError(appError, context);
      }

      // ユーザーに表示するメッセージを決定
      const displayMessage = fallbackMessage || getDisplayMessage(appError);

      // トースト表示
      if (showToast) {
        if (appError.type === 'validation') {
          showWarning(displayMessage);
        } else {
          showError(displayMessage);
        }
      }

      return appError;
    },
    [showError, showWarning]
  );

  // 非同期関数のエラーハンドリング用ヘルパー
  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, options);
        return null;
      }
    },
    [handleError]
  );

  // 複数のエラーを処理するヘルパー
  const handleBatchErrors = useCallback(
    (
      errors: Array<{ error: unknown; context?: string }>,
      options: ErrorHandlerOptions = {}
    ): AppError[] => {
      return errors.map(({ error, context }) =>
        handleError(error, { ...options, context })
      );
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
    handleBatchErrors
  };
}
