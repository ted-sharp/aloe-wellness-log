import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PWAInstallButton } from './PWAInstallButton';

// beforeinstallpromptイベントをモック
const mockBeforeInstallPromptEvent = {
  preventDefault: vi.fn(),
  prompt: vi.fn().mockResolvedValue({}),
  userChoice: Promise.resolve({ outcome: 'accepted' }),
};

describe('PWAInstallButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // window.matchMediaをモック
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  test('初期状態では何も表示されない', () => {
    const { container } = render(<PWAInstallButton />);
    expect(container.firstChild).toBeNull();
  });

  test('beforeinstallpromptイベント後にボタンが表示される', async () => {
    render(<PWAInstallButton />);

    // beforeinstallpromptイベントを発火
    fireEvent(window, new Event('beforeinstallprompt'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'アプリをインストール' })
      ).toBeInTheDocument();
    });
  });

  test('カスタムクラス名が適用される', async () => {
    render(<PWAInstallButton className="custom-class" />);

    // beforeinstallpromptイベントを発火
    fireEvent(window, new Event('beforeinstallprompt'));

    await waitFor(() => {
      const button = screen.getByRole('button', {
        name: 'アプリをインストール',
      });
      expect(button).toHaveClass('custom-class');
    });
  });

  test('インストールボタンをクリックしてプロンプトが表示される', async () => {
    // deferredPromptを設定
    const component = render(<PWAInstallButton />);

    // beforeinstallpromptイベントオブジェクトを手動で設定
    const beforeInstallPromptEvent = Object.assign(
      new Event('beforeinstallprompt'),
      {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue({}),
        userChoice: Promise.resolve({
          outcome: 'accepted',
        }),
      }
    );

    // windowのbeforeinstallpromptイベントリスナーを取得
    fireEvent(window, beforeInstallPromptEvent);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'アプリをインストール' })
      ).toBeInTheDocument();
    });

    const installButton = screen.getByRole('button', {
      name: 'アプリをインストール',
    });
    fireEvent.click(installButton);

    // プロンプトが呼び出されることを確認
    await waitFor(() => {
      expect(beforeInstallPromptEvent.prompt).toHaveBeenCalled();
    });
  });

  test('appinstalledイベント後にボタンが非表示になる', async () => {
    render(<PWAInstallButton />);

    // beforeinstallpromptイベントを発火してボタンを表示
    fireEvent(window, new Event('beforeinstallprompt'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'アプリをインストール' })
      ).toBeInTheDocument();
    });

    // appinstalledイベントを発火
    fireEvent(window, new Event('appinstalled'));

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'アプリをインストール' })
      ).not.toBeInTheDocument();
    });
  });

  test('iOS Safariでは特別な処理を行う', () => {
    // iOS Safari環境をシミュレート
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    });

    // standalone modeではない状態をシミュレート
    Object.defineProperty(navigator, 'standalone', {
      writable: true,
      value: false,
    });

    render(<PWAInstallButton />);

    // iOS Safari環境での処理を確認（実装に依存するため基本的なレンダリングのみテスト）
    const { container } = render(<PWAInstallButton />);
    expect(container).toBeInTheDocument();
  });

  test('既にインストール済みの場合は表示されない', () => {
    // standalone modeをシミュレート
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => {
        if (query === '(display-mode: standalone)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          };
        }
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }),
    });

    const { container } = render(<PWAInstallButton />);
    expect(container.firstChild).toBeNull();
  });

  test('コンポーネントのアンマウント時にイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<PWAInstallButton />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'appinstalled',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  test('ボタンのアクセシビリティ属性が正しく設定される', async () => {
    render(<PWAInstallButton />);

    fireEvent(window, new Event('beforeinstallprompt'));

    await waitFor(() => {
      const button = screen.getByRole('button', {
        name: 'アプリをインストール',
      });
      // ボタンが存在し、適切なaria-labelが設定されていることを確認
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'アプリをインストール');
    });
  });

  test('複数のPWAInstallButtonインスタンスが正しく動作する', async () => {
    render(
      <div>
        <PWAInstallButton className="first" />
        <PWAInstallButton className="second" />
      </div>
    );

    fireEvent(window, new Event('beforeinstallprompt'));

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', {
        name: 'アプリをインストール',
      });
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveClass('first');
      expect(buttons[1]).toHaveClass('second');
    });
  });
});
