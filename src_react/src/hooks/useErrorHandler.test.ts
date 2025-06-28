import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from './useErrorHandler';
import { useToastStore } from '../store/toast';

// Zustand storeのモック
vi.mock('../store/toast', () => ({
  useToastStore: vi.fn(),
}));

describe('useErrorHandler', () => {
  const mockShowError = vi.fn();
  const mockShowWarning = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // useToastStoreのモック実装
    vi.mocked(useToastStore).mockReturnValue({
      showError: mockShowError,
      showWarning: mockShowWarning,
      showSuccess: vi.fn(),
      showInfo: vi.fn(),
      showToast: vi.fn(),
      toasts: [],
      removeToast: vi.fn(),
      clearAll: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAsyncError', () => {
    it('成功時に結果を返す', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testFunction = vi.fn().mockResolvedValue('success result');

      const response = await act(async () => {
        return result.current.handleAsyncError(testFunction, {
          context: 'テスト操作',
          fallbackMessage: 'フォールバック'
        });
      });

      expect(response).toBe('success result');
      expect(testFunction).toHaveBeenCalledOnce();
      expect(mockShowError).not.toHaveBeenCalled();
      expect(mockShowWarning).not.toHaveBeenCalled();
    });

    it('エラー時にtoastを表示してnullを返す', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testError = new Error('テストエラー');
      const testFunction = vi.fn().mockRejectedValue(testError);

      const response = await act(async () => {
        return result.current.handleAsyncError(testFunction, {
          context: 'テスト操作',
          fallbackMessage: 'フォールバックメッセージ'
        });
      });

      expect(response).toBeNull();
      expect(testFunction).toHaveBeenCalledOnce();
      expect(mockShowError).toHaveBeenCalledWith('フォールバックメッセージ');
    });

    it('バリデーションエラー時に警告toast表示', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const validationError = new Error('項目名は必須です');
      const testFunction = vi.fn().mockRejectedValue(validationError);

      await act(async () => {
        return result.current.handleAsyncError(testFunction, {
          context: 'バリデーション'
        });
      });

      expect(mockShowWarning).toHaveBeenCalledWith('項目名は必須です');
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('データベースエラー時にエラーtoast表示', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const dbError = new Error('IndexedDB error occurred');
      const testFunction = vi.fn().mockRejectedValue(dbError);

      await act(async () => {
        return result.current.handleAsyncError(testFunction, {
          context: 'データベース操作'
        });
      });

      expect(mockShowError).toHaveBeenCalledWith('データの保存・読み込みに失敗いたしました。もう一度お試しくださいませ。');
    });

    it('コンテキストなしでも動作する', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const testError = new Error('テストエラー');
      const testFunction = vi.fn().mockRejectedValue(testError);

      await act(async () => {
        return result.current.handleAsyncError(testFunction);
      });

      expect(mockShowError).toHaveBeenCalledWith('テストエラー');
    });

    it('フォールバックメッセージが優先される', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const unknownError = new Error('Unknown error');
      const testFunction = vi.fn().mockRejectedValue(unknownError);

      await act(async () => {
        return result.current.handleAsyncError(testFunction, {
          context: 'テスト',
          fallbackMessage: 'カスタムフォールバック'
        });
      });

      expect(mockShowError).toHaveBeenCalledWith('カスタムフォールバック');
    });

    it('非同期関数のtry-catch処理', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('非同期エラー');
      };

      const response = await act(async () => {
        return result.current.handleAsyncError(asyncFunction, {
          context: '非同期処理',
          fallbackMessage: '非同期エラーが発生'
        });
      });

      expect(response).toBeNull();
      expect(mockShowError).toHaveBeenCalledWith('非同期エラーが発生');
    });

    it('複数の連続エラーを処理', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const error1 = new Error('エラー1');
      const error2 = new Error('バリデーションエラー');

      const function1 = vi.fn().mockRejectedValue(error1);
      const function2 = vi.fn().mockRejectedValue(error2);

      await act(async () => {
        await result.current.handleAsyncError(function1, { fallbackMessage: 'エラー1発生' });
        await result.current.handleAsyncError(function2, { fallbackMessage: 'エラー2発生' });
      });

      expect(mockShowError).toHaveBeenCalledWith('エラー1発生');
      expect(mockShowError).toHaveBeenCalledWith('エラー2発生');
      expect(mockShowError).toHaveBeenCalledTimes(2);
    });
  });
});
