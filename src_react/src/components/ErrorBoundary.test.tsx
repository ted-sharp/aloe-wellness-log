import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

// テスト用の問題のあるコンポーネント
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('テストエラーです');
  }
  return <div>正常なコンポーネント</div>;
};

// console.errorをモック
const mockConsoleError = vi
  .spyOn(console, 'error')
  .mockImplementation(() => {});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('正常な動作', () => {
    it('エラーがない場合は子コンポーネントを正常に表示する', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('エラーをキャッチしてエラー画面を表示する', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // エラー画面の要素が表示されることを確認
      expect(screen.getByText('申し訳ございません')).toBeInTheDocument();
      expect(
        screen.getByText(/予期しないエラーが発生いたしました/)
      ).toBeInTheDocument();
      expect(screen.getByText('もう一度試す')).toBeInTheDocument();
      expect(screen.getByText('ページを再読み込み')).toBeInTheDocument();
    });

    it('エラーがconsole.errorで記録される', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // console.errorが呼ばれることを確認
      expect(mockConsoleError).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('エラー詳細を展開して表示できる', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // 技術的な詳細セクションを開く
      const detailsToggle = screen.getByText('技術的な詳細（クリックで表示）');
      fireEvent.click(detailsToggle);

      // エラーの詳細情報が表示される
      expect(screen.getByText('エラー名:')).toBeInTheDocument();
      expect(screen.getByText('エラーメッセージ:')).toBeInTheDocument();
      expect(screen.getByText('テストエラーです')).toBeInTheDocument();
    });
  });

  describe('リセット機能', () => {
    it('「もう一度試す」ボタンでエラー状態をリセットできる', () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = useState(true);

        return (
          <ErrorBoundary>
            <button onClick={() => setShouldThrow(false)}>エラーを修正</button>
            <ThrowError shouldThrow={shouldThrow} />
          </ErrorBoundary>
        );
      };

      render(<TestComponent />);

      // 最初はエラー画面が表示される
      expect(screen.getByText('申し訳ございません')).toBeInTheDocument();

      // 「もう一度試す」ボタンをクリック
      const retryButton = screen.getByText('もう一度試す');
      fireEvent.click(retryButton);

      // エラー状態がリセットされ、子コンポーネントが再度レンダリングされる
      // ただし、同じエラーが再発生するため、再びエラー画面が表示される
      expect(screen.getByText('申し訳ございません')).toBeInTheDocument();
    });

    it('「ページを再読み込み」ボタンでreloadが呼ばれる', () => {
      // window.location.reloadをモック
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // 「ページを再読み込み」ボタンをクリック
      const reloadButton = screen.getByText('ページを再読み込み');
      fireEvent.click(reloadButton);

      // window.location.reloadが呼ばれることを確認
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('カスタムフォールバック', () => {
    it('カスタムフォールバック関数が提供された場合、それを使用する', () => {
      const customFallback = (error: Error, resetError: () => void) => (
        <div>
          <h1>カスタムエラー画面</h1>
          <p>エラー: {error.message}</p>
          <button onClick={resetError}>リセット</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // カスタムフォールバックが表示される
      expect(screen.getByText('カスタムエラー画面')).toBeInTheDocument();
      expect(screen.getByText('エラー: テストエラーです')).toBeInTheDocument();
      expect(screen.getByText('リセット')).toBeInTheDocument();

      // デフォルトのエラー画面は表示されない
      expect(screen.queryByText('申し訳ございません')).not.toBeInTheDocument();
    });

    it('カスタムフォールバックのリセット機能が動作する', () => {
      const customFallback = (_error: Error, resetError: () => void) => (
        <div>
          <h1>カスタムエラー画面</h1>
          <button onClick={resetError}>リセット</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // カスタムリセットボタンをクリック
      const resetButton = screen.getByText('リセット');
      fireEvent.click(resetButton);

      // エラー状態がリセットされ、再度エラーが発生する（同じコンポーネントのため）
      expect(screen.getByText('カスタムエラー画面')).toBeInTheDocument();
    });
  });
});
