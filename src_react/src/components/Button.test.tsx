import { fireEvent, render, screen } from '@testing-library/react';
import { HiHeart, HiStar } from 'react-icons/hi2';
import { describe, expect, test, vi } from 'vitest';
import Button from './Button';

describe('Button', () => {
  test('基本的なレンダリング', () => {
    render(<Button>テストボタン</Button>);

    const button = screen.getByRole('button', { name: 'テストボタン' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('テストボタン');
  });

  test('クリックイベントが正しく動作する', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>クリック</Button>);

    const button = screen.getByRole('button', { name: 'クリック' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('各バリアントが正しいスタイルを適用する', () => {
    const variants = [
      'primary',
      'success',
      'warning',
      'danger',
      'secondary',
      'purple',
      'teal',
      'sky',
    ] as const;

    variants.forEach(variant => {
      const { unmount } = render(
        <Button variant={variant}>{variant}ボタン</Button>
      );
      const button = screen.getByRole('button', { name: `${variant}ボタン` });

      // バリアント別のクラスが適用されているかチェック
      expect(button).toHaveClass('rounded-lg', 'font-medium');

      unmount();
    });
  });

  test('各サイズが正しいスタイルを適用する', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach(size => {
      const { unmount } = render(<Button size={size}>{size}ボタン</Button>);
      const button = screen.getByRole('button', { name: `${size}ボタン` });

      expect(button).toHaveClass('rounded-lg');

      unmount();
    });
  });

  test('アイコンが正しく表示される（左側）', () => {
    render(
      <Button icon={HiHeart} iconPosition="left">
        ハートボタン
      </Button>
    );

    const button = screen.getByRole('button', { name: 'ハートボタン' });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  test('アイコンが正しく表示される（右側）', () => {
    render(
      <Button icon={HiStar} iconPosition="right">
        スターボタン
      </Button>
    );

    const button = screen.getByRole('button', { name: 'スターボタン' });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  test('ローディング状態が正しく表示される', () => {
    render(<Button loading>ローディング</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('読み込み中...');
    expect(button).toBeDisabled();

    // ローディングスピナーが表示されているかチェック
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('disabled状態が正しく動作する', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        無効ボタン
      </Button>
    );

    const button = screen.getByRole('button', { name: '無効ボタン' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('fullWidth propが正しく動作する', () => {
    render(<Button fullWidth>全幅ボタン</Button>);

    const button = screen.getByRole('button', { name: '全幅ボタン' });
    expect(button).toHaveClass('w-full');
  });

  test('カスタムclassNameが適用される', () => {
    render(<Button className="custom-class">カスタム</Button>);

    const button = screen.getByRole('button', { name: 'カスタム' });
    expect(button).toHaveClass('custom-class');
  });

  test('HTMLボタン属性が正しく渡される', () => {
    render(
      <Button type="submit" form="test-form" data-testid="submit-btn">
        送信
      </Button>
    );

    const button = screen.getByTestId('submit-btn');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('form', 'test-form');
  });

  test('loadingとdisabledの両方が設定された場合', () => {
    render(
      <Button loading disabled>
        テスト
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('読み込み中...');
  });

  test('アイコンのサイズがボタンサイズに応じて変わる', () => {
    const { unmount: unmountSm } = render(
      <Button size="sm" icon={HiHeart}>
        小
      </Button>
    );
    let button = screen.getByRole('button', { name: '小' });
    let icon = button.querySelector('svg');
    expect(icon).toHaveClass('w-4', 'h-4');
    unmountSm();

    const { unmount: unmountMd } = render(
      <Button size="md" icon={HiHeart}>
        中
      </Button>
    );
    button = screen.getByRole('button', { name: '中' });
    icon = button.querySelector('svg');
    expect(icon).toHaveClass('w-5', 'h-5');
    unmountMd();

    render(
      <Button size="lg" icon={HiHeart}>
        大
      </Button>
    );
    button = screen.getByRole('button', { name: '大' });
    icon = button.querySelector('svg');
    expect(icon).toHaveClass('w-6', 'h-6');
  });

  test('アイコンにaria-hiddenが設定される', () => {
    render(<Button icon={HiHeart}>アイコン付き</Button>);

    const button = screen.getByRole('button', { name: 'アイコン付き' });
    const icon = button.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
