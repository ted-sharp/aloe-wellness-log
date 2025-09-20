import { useCallback, useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'success' | 'error';

export interface UseSaveStateOptions {
  successDuration?: number; // 成功状態の表示時間（ms）
  onSuccess?: () => void; // 成功時のコールバック
  onError?: (error: Error) => void; // エラー時のコールバック
}

export interface UseSaveStateReturn {
  saveState: SaveState;
  isSaving: boolean;
  isSuccess: boolean;
  isError: boolean;
  executeSave: <T>(operation: () => Promise<T>) => Promise<T>;
  resetState: () => void;
}

/**
 * 保存操作の状態管理フック
 * ローディング、成功、エラー状態を統一的に管理
 */
export function useSaveState(
  options: UseSaveStateOptions = {}
): UseSaveStateReturn {
  const { successDuration = 2000, onSuccess, onError } = options;

  const [saveState, setSaveState] = useState<SaveState>('idle');

  const executeSave = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      setSaveState('saving');

      try {
        const result = await operation();
        setSaveState('success');

        // 成功コールバック実行
        if (onSuccess) {
          onSuccess();
        }

        // 指定時間後に状態をリセット
        setTimeout(() => {
          setSaveState('idle');
        }, successDuration);

        return result;
      } catch (error) {
        setSaveState('error');

        // エラーコールバック実行
        if (onError && error instanceof Error) {
          onError(error);
        }

        // エラー状態も一定時間後にリセット
        setTimeout(() => {
          setSaveState('idle');
        }, 3000);

        throw error;
      }
    },
    [successDuration, onSuccess, onError]
  );

  const resetState = useCallback(() => {
    setSaveState('idle');
  }, []);

  return {
    saveState,
    isSaving: saveState === 'saving',
    isSuccess: saveState === 'success',
    isError: saveState === 'error',
    executeSave,
    resetState,
  };
}

