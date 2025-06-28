import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  useAccessibilitySettings,
  useFocusManager,
  useFormAccessibility,
  useKeyboardNavigation,
  useLiveRegion,
  useScreenReader,
} from './useAccessibility';

// DOM環境のモック
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('useAccessibility hooks', () => {
  beforeEach(() => {
    // DOM要素をクリア
    document.body.innerHTML = '';

    // matchMediaのモック
    window.matchMedia = vi.fn().mockImplementation(query => {
      if (query.includes('prefers-reduced-motion')) {
        return mockMatchMedia(false);
      }
      if (query.includes('prefers-contrast')) {
        return mockMatchMedia(false);
      }
      if (query.includes('prefers-color-scheme')) {
        return mockMatchMedia(false);
      }
      return mockMatchMedia(false);
    });
  });

  afterEach(() => {
    // クリーンアップ
    document.body.innerHTML = '';
  });

  describe('useFocusManager', () => {
    test('フォーカス管理の基本機能', () => {
      const { result } = renderHook(() => useFocusManager());

      expect(result.current.saveFocus).toBeDefined();
      expect(result.current.restoreFocus).toBeDefined();
      expect(result.current.moveFocus).toBeDefined();
      expect(result.current.trapFocus).toBeDefined();
      expect(result.current.getFocusableElements).toBeDefined();
    });

    test('フォーカス可能要素の取得', () => {
      // テスト用のDOM要素を作成
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button 1</button>
        <input type="text" />
        <button disabled>Disabled Button</button>
        <a href="#">Link</a>
      `;
      document.body.appendChild(container);

      const { result } = renderHook(() => useFocusManager());

      act(() => {
        const focusableElements =
          result.current.getFocusableElements(container);
        // disabled要素は除外されるはず
        expect(focusableElements).toHaveLength(3);
      });
    });
  });

  describe('useKeyboardNavigation', () => {
    test('キーボードハンドラーの設定', () => {
      const onEnter = vi.fn();
      const onEscape = vi.fn();

      const { result } = renderHook(() =>
        useKeyboardNavigation({ onEnter, onEscape })
      );

      expect(result.current.handleKeyDown).toBeDefined();
      expect(typeof result.current.handleKeyDown).toBe('function');
    });

    test('Enterキーのハンドリング', () => {
      const onEnter = vi.fn();

      const { result } = renderHook(() => useKeyboardNavigation({ onEnter }));

      const mockEvent = {
        key: 'Enter',
        preventDefault: vi.fn(),
        nativeEvent: new KeyboardEvent('keydown', { key: 'Enter' }),
      } as any;

      act(() => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onEnter).toHaveBeenCalled();
    });
  });

  describe('useLiveRegion', () => {
    test('ライブリージョンアナウンサーの初期化', () => {
      const { result } = renderHook(() => useLiveRegion());

      expect(result.current.announcePolite).toBeDefined();
      expect(result.current.announceAssertive).toBeDefined();
    });

    test('politeアナウンスの実行', () => {
      const { result } = renderHook(() => useLiveRegion());

      act(() => {
        result.current.announcePolite('テストメッセージ');
      });

      // ライブリージョンが作成されているかチェック
      const politeRegions = document.querySelectorAll('[aria-live="polite"]');
      expect(politeRegions.length).toBeGreaterThan(0);
    });
  });

  describe('useScreenReader', () => {
    test('スクリーンリーダー用フォーマット関数', () => {
      const { result } = renderHook(() => useScreenReader());

      expect(result.current.formatDate).toBeDefined();
      expect(result.current.formatTime).toBeDefined();
      expect(result.current.formatNumber).toBeDefined();
      expect(result.current.formatButtonState).toBeDefined();
    });

    test('日付フォーマットの動作', () => {
      const { result } = renderHook(() => useScreenReader());

      act(() => {
        const formatted = result.current.formatDate('2024-03-21');
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      });
    });

    test('時刻フォーマットの動作', () => {
      const { result } = renderHook(() => useScreenReader());

      act(() => {
        const formatted = result.current.formatTime('14:30');
        expect(formatted).toBe('14時30分');
      });
    });

    test('数値フォーマットの動作', () => {
      const { result } = renderHook(() => useScreenReader());

      act(() => {
        const formatted = result.current.formatNumber(70, 'kg');
        expect(formatted).toBe('70kg');
      });
    });

    test('ボタン状態フォーマットの動作', () => {
      const { result } = renderHook(() => useScreenReader());

      act(() => {
        const formatted = result.current.formatButtonState('保存', 'selected');
        expect(formatted).toBe('保存, 選択済み');
      });
    });
  });

  describe('useFormAccessibility', () => {
    test('フォームフィールドプロパティの生成', () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        const fieldProps = result.current.getFieldProps({
          label: 'テストフィールド',
          description: 'フィールドの説明',
          error: 'エラーメッセージ',
          required: true,
        });

        expect(fieldProps.fieldId).toBeDefined();
        expect(fieldProps.labelProps.htmlFor).toBe(fieldProps.fieldId);
        expect(fieldProps.inputProps.id).toBe(fieldProps.fieldId);
        expect(fieldProps.inputProps['aria-required']).toBe(true);
        expect(fieldProps.inputProps['aria-invalid']).toBe(true);
        expect(fieldProps.inputProps['aria-describedby']).toContain(
          fieldProps.fieldId
        );
        expect(fieldProps.descriptionProps).toBeDefined();
        expect(fieldProps.errorProps).toBeDefined();
      });
    });

    test('エラーなしフィールドのプロパティ生成', () => {
      const { result } = renderHook(() => useFormAccessibility());

      act(() => {
        const fieldProps = result.current.getFieldProps({
          label: 'テストフィールド',
          required: false,
        });

        expect(fieldProps.inputProps['aria-required']).toBe(false);
        expect(fieldProps.inputProps['aria-invalid']).toBe(false);
        expect(fieldProps.errorProps).toBeUndefined();
      });
    });
  });

  describe('useAccessibilitySettings', () => {
    test('アクセシビリティ設定の初期化', () => {
      const { result } = renderHook(() => useAccessibilitySettings());

      expect(result.current.prefersReducedMotion).toBeDefined();
      expect(result.current.prefersHighContrast).toBeDefined();
      expect(result.current.prefersDarkMode).toBeDefined();
    });

    // test('reduced motionの検出', async () => {
    //   // reduced motionを有効にしたモック
    //   const originalMatchMedia = window.matchMedia;
    //   window.matchMedia = vi.fn().mockImplementation(query => {
    //     if (query.includes('prefers-reduced-motion')) {
    //       return mockMatchMedia(true);
    //     }
    //     if (query.includes('prefers-contrast')) {
    //       return mockMatchMedia(false);
    //     }
    //     if (query.includes('prefers-color-scheme')) {
    //       return mockMatchMedia(false);
    //     }
    //     return mockMatchMedia(false);
    //   });
    //
    //   const { result } = renderHook(() => useAccessibilitySettings());
    //   await waitFor(() => {
    //     expect(result.current.prefersReducedMotion).toBe(true);
    //   });
    //
    //   // 元に戻す
    //   window.matchMedia = originalMatchMedia;
    // });
  });
});
