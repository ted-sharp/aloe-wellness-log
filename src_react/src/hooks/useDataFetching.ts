import { useCallback, useEffect, useState } from 'react';

interface UseDataFetchingOptions<T> {
  fetchFunction: () => Promise<T>;
  dependencies?: any[];
  enableAutoRefetch?: boolean;
  initialData?: T;
}

interface UseDataFetchingReturn<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: (data: T) => void;
  clearError: () => void;
}

/**
 * 汎用データフェッチングフック
 * @param options フェッチ設定
 * @returns データ、ローディング状態、エラー状態、再フェッチ関数
 */
export function useDataFetching<T>({
  fetchFunction,
  dependencies = [],
  enableAutoRefetch = true,
  initialData,
}: UseDataFetchingOptions<T>): UseDataFetchingReturn<T> {
  const [data, setData] = useState<T>(initialData as T);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 初回およびdependencies変更時の自動フェッチ
  useEffect(() => {
    if (enableAutoRefetch) {
      refetch();
    }
  }, [refetch, enableAutoRefetch, ...dependencies]);

  return {
    data,
    isLoading,
    error,
    refetch,
    setData,
    clearError,
  };
}