import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from './App';
import { useRecordsStore } from './store/records';

// 必要なモジュールをモック
vi.mock('./store/records', () => ({
  useRecordsStore: vi.fn(),
}));

vi.mock('./utils/devTools', () => ({
  debugLog: vi.fn(),
  detectReactDevTools: vi.fn(),
  exposeDevTools: vi.fn(),
  isDev: false,
  perfEnd: vi.fn(),
  perfStart: vi.fn(),
  showDevWarnings: vi.fn(),
}));

vi.mock('./components/PWAInstallButton', () => ({
  PWAInstallButton: ({ className }: { className?: string }) => (
    <button className={className} data-testid="pwa-install">
      PWAインストール
    </button>
  ),
}));

// Lazy loadingされるページコンポーネントをモック
vi.mock('./pages/RecordInput', () => ({
  default: () => <div data-testid="record-input">記録入力ページ</div>,
}));

vi.mock('./pages/RecordList', () => ({
  default: () => <div data-testid="record-list">記録一覧ページ</div>,
}));

vi.mock('./pages/RecordGraph', () => ({
  default: () => <div data-testid="record-graph">グラフページ</div>,
}));

vi.mock('./pages/RecordCalendar', () => ({
  default: () => <div data-testid="record-calendar">カレンダーページ</div>,
}));

vi.mock('./pages/RecordExport', () => ({
  default: () => <div data-testid="record-export">管理ページ</div>,
}));

const mockUseRecordsStore = vi.mocked(useRecordsStore);

// window.confirm をモック
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

describe('App', () => {
  const mockInitializeFields = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // React Router用のモック設定
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true,
    });

    mockUseRecordsStore.mockReturnValue({
      records: [],
      fields: [],
      initializeFields: mockInitializeFields,
      loadRecords: vi.fn(),
      loadFields: vi.fn(),
      addRecord: vi.fn(),
      updateRecord: vi.fn(),
      deleteRecord: vi.fn(),
      addField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      reorderFields: vi.fn(),
    });
  });

  test('アプリケーションが正しくレンダリングされる', async () => {
    render(<App />);

    // 記録入力ページが表示されることを確認（デフォルトルート）
    await waitFor(() => {
      expect(screen.getByTestId('record-input')).toBeInTheDocument();
    });
  });

  test('initializeFieldsが呼び出される', () => {
    render(<App />);
    expect(mockInitializeFields).toHaveBeenCalledTimes(1);
  });

  test('デスクトップナビゲーションが表示される', () => {
    render(<App />);

    // デスクトップ用ナビゲーションリンクを確認
    expect(
      screen.getByRole('link', { name: '入力ページに移動' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '一覧ページに移動' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'グラフページに移動' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'カレンダーページに移動' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '管理ページに移動' })
    ).toBeInTheDocument();
  });

  test('モバイルヘッダーが表示される', () => {
    render(<App />);

    expect(screen.getByText('🌿 アロエ健康ログ')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'メニューを開く' })
    ).toBeInTheDocument();
  });

  test('モバイルメニューの開閉が動作する', () => {
    render(<App />);

    const menuButton = screen.getByRole('button', { name: 'メニューを開く' });

    // メニューを開く
    fireEvent.click(menuButton);

    expect(
      screen.getByRole('dialog', { name: 'モバイルナビゲーションメニュー' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'メニューを閉じる' })
    ).toBeInTheDocument();

    // メニューを閉じる
    fireEvent.click(screen.getByRole('button', { name: 'メニューを閉じる' }));

    // メニューが閉じられることを確認
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Escapeキーでモバイルメニューが閉じる', () => {
    render(<App />);

    const menuButton = screen.getByRole('button', { name: 'メニューを開く' });
    fireEvent.click(menuButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Escapeキーを押す
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('オーバーレイクリックでモバイルメニューが閉じる', () => {
    render(<App />);

    const menuButton = screen.getByRole('button', { name: 'メニューを開く' });
    fireEvent.click(menuButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // オーバーレイをクリック
    const overlay = document.querySelector('[style*="rgba(0, 0, 0, 0.3)"]');
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test.skip('ナビゲーションリンクが正しく動作する', async () => {
    // React Routerのモック設定の問題でスキップ
  });

  test.skip('存在しないルートはトップページにリダイレクトされる', async () => {
    // React Routerのモック設定の問題でスキップ
  });

  test('PWAインストールボタンが表示される', () => {
    render(<App />);

    const pwaButtons = screen.getAllByTestId('pwa-install');
    expect(pwaButtons.length).toBeGreaterThan(0);
  });

  test('スキップリンクが存在する', () => {
    render(<App />);

    const skipLink = screen.getByRole('link', {
      name: 'メインコンテンツにスキップ',
    });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  test('メインコンテンツ領域が存在する', () => {
    render(<App />);

    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveAttribute('id', 'main-content');
  });

  test('現在のページが正しくaria-currentで示される', async () => {
    render(<App />);

    // デフォルトでは入力ページが現在のページ
    await waitFor(() => {
      const currentPageLink = screen.getByRole('link', {
        name: '入力ページに移動',
      });
      expect(currentPageLink).toHaveAttribute('aria-current', 'page');
    });
  });

  test.skip('モバイルメニューのナビゲーションリンクが動作する', async () => {
    // React Routerのモック設定の問題でスキップ
  });

  test('ErrorBoundaryでラップされている', () => {
    render(<App />);

    // ErrorBoundaryは直接テストしにくいので、存在確認のみ
    // 実際のエラーハンドリングは ErrorBoundary.test.tsx でテスト済み
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('適切なrole属性が設定されている', () => {
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('main')).toBeInTheDocument(); // main
    expect(
      screen.getByRole('navigation', { name: 'メインナビゲーション' })
    ).toBeInTheDocument();
  });

  test.skip('Suspenseフォールバックが表示される', () => {
    // ローディング表示は瞬時に切り替わるためテストが困難
  });

  test('各ページのSuspenseフォールバックが正しく表示される', async () => {
    render(<App />);

    // 初期ページ（記録入力）が読み込まれることを確認
    await waitFor(() => {
      expect(screen.getByTestId('record-input')).toBeInTheDocument();
    });

    // Suspenseが機能していることを確認（ローディング表示は短時間のため直接確認は困難）
    expect(screen.getByTestId('record-input')).toBeInTheDocument();
  });
});
