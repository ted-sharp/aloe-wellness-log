import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useToastStore } from '../store/toast';
import ToastContainer from './ToastContainer';

// zustandストアをモック
vi.mock('../store/toast', () => ({
  useToastStore: vi.fn(),
}));

const mockUseToastStore = vi.mocked(useToastStore);

describe('ToastContainer', () => {
  const mockRemoveToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseToastStore.mockReturnValue({
      toasts: [],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });
  });

  test('トーストがない場合は何も表示されない', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  test('成功トーストが正しく表示される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: '1',
          type: 'success',
          message: '保存に成功しました',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    expect(screen.getByText('保存に成功しました')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    // 成功アイコンが表示されているかチェック
    const successIcon = screen.getByRole('status').querySelector('svg');
    expect(successIcon).toBeInTheDocument();
  });

  test('エラートーストが正しく表示される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: '2',
          type: 'error',
          message: 'エラーが発生しました',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // エラーアイコンが表示されているかチェック
    const errorIcon = screen.getByRole('alert').querySelector('svg');
    expect(errorIcon).toBeInTheDocument();
  });

  test('警告トーストが正しく表示される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: '3',
          type: 'warning',
          message: '注意が必要です',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    expect(screen.getByText('注意が必要です')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // 警告アイコンが表示されているかチェック
    const warningIcon = screen.getByRole('alert').querySelector('svg');
    expect(warningIcon).toBeInTheDocument();
  });

  test('情報トーストが正しく表示される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: '4',
          type: 'info',
          message: 'お知らせです',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    expect(screen.getByText('お知らせです')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    // 情報アイコンが表示されているかチェック
    const infoIcon = screen.getByRole('status').querySelector('svg');
    expect(infoIcon).toBeInTheDocument();
  });

  test('複数のトーストが同時に表示される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: '1',
          type: 'success',
          message: '成功メッセージ',
        },
        {
          id: '2',
          type: 'error',
          message: 'エラーメッセージ',
        },
        {
          id: '3',
          type: 'info',
          message: '情報メッセージ',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    expect(screen.getByText('成功メッセージ')).toBeInTheDocument();
    expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
    expect(screen.getByText('情報メッセージ')).toBeInTheDocument();
  });

  test('閉じるボタンクリックでトーストが削除される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: 'test-toast',
          type: 'success',
          message: 'テストメッセージ',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    const closeButton = screen.getByRole('button', {
      name: '成功通知を閉じる',
    });
    fireEvent.click(closeButton);

    expect(mockRemoveToast).toHaveBeenCalledWith('test-toast');
  });

  test('エラートーストがフォーカス可能である', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: 'error-toast',
          type: 'error',
          message: 'エラーメッセージ',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('tabIndex', '0');
  });

  test('警告トーストがフォーカス可能である', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: 'warning-toast',
          type: 'warning',
          message: '警告メッセージ',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('tabIndex', '0');
  });

  test('成功・情報トーストはフォーカス不可である', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: 'success-toast',
          type: 'success',
          message: '成功メッセージ',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('tabIndex', '-1');
  });

  test('適切なaria属性が設定される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: 'test-toast',
          type: 'error',
          message: 'テストエラー',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    const container = screen.getByRole('region');
    expect(container).toHaveAttribute('aria-label', '通知メッセージ');
    expect(container).toHaveAttribute('aria-live', 'polite');
    expect(container).toHaveAttribute('aria-atomic', 'false');

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-label', 'エラー: テストエラー');
  });

  test('スクリーンリーダー用のラベルが含まれる', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: 'test-toast',
          type: 'warning',
          message: 'テスト警告',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    expect(screen.getByText('警告:', { exact: false })).toBeInTheDocument();
  });

  test('閉じるボタンのアクセシビリティラベルが正しい', () => {
    const toastTypes = [
      { type: 'success', label: '成功通知を閉じる' },
      { type: 'error', label: 'エラー通知を閉じる' },
      { type: 'warning', label: '警告通知を閉じる' },
      { type: 'info', label: '情報通知を閉じる' },
    ] as const;

    toastTypes.forEach(({ type, label }) => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: `${type}-toast`,
            type,
            message: `${type}メッセージ`,
          },
        ],
        addToast: vi.fn(),
        removeToast: mockRemoveToast,
        clearToasts: vi.fn(),
      });

      const { unmount } = render(<ToastContainer />);

      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();

      unmount();
    });
  });

  test('トーストのdata属性が正しく設定される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: 'unique-toast',
          type: 'info',
          message: 'ユニークトースト',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('data-toast-id', 'unique-toast');
  });

  test('アイコンにaria-hiddenが設定される', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        {
          id: 'icon-test',
          type: 'success',
          message: 'アイコンテスト',
        },
      ],
      addToast: vi.fn(),
      removeToast: mockRemoveToast,
      clearToasts: vi.fn(),
    });

    render(<ToastContainer />);

    const toast = screen.getByRole('status');
    const icon = toast.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
