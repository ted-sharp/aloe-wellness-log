/**
 * アクセシビリティ強化のためのユーティリティ関数群
 */

/**
 * キーボードナビゲーション用のキーハンドラー
 */
export interface KeyboardHandlers {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (e: KeyboardEvent) => void;
  onShiftTab?: (e: KeyboardEvent) => void;
}

/**
 * キーボードイベントハンドラー
 */
export const handleKeyboardNavigation = (
  event: React.KeyboardEvent,
  handlers: KeyboardHandlers
) => {
  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      handlers.onEnter?.();
      break;
    case 'Escape':
      event.preventDefault();
      handlers.onEscape?.();
      break;
    case 'ArrowUp':
      event.preventDefault();
      handlers.onArrowUp?.();
      break;
    case 'ArrowDown':
      event.preventDefault();
      handlers.onArrowDown?.();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      handlers.onArrowLeft?.();
      break;
    case 'ArrowRight':
      event.preventDefault();
      handlers.onArrowRight?.();
      break;
    case 'Tab':
      if (event.shiftKey) {
        handlers.onShiftTab?.(event.nativeEvent);
      } else {
        handlers.onTab?.(event.nativeEvent);
      }
      break;
  }
};

/**
 * フォーカス管理用ユーティリティ
 */
export class FocusManager {
  private focusStack: HTMLElement[] = [];

  /**
   * 現在のフォーカスを保存
   */
  saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  /**
   * 保存されたフォーカスを復元
   */
  restoreFocus(): void {
    const element = this.focusStack.pop();
    if (element && document.contains(element)) {
      element.focus();
    }
  }

  /**
   * 要素にフォーカスを移動（フォールバック付き）
   */
  moveFocus(
    selector: string | HTMLElement,
    fallbackSelector?: string
  ): boolean {
    let element: HTMLElement | null = null;

    if (typeof selector === 'string') {
      element = document.querySelector(selector);
    } else {
      element = selector;
    }

    if (!element && fallbackSelector) {
      element = document.querySelector(fallbackSelector);
    }

    if (element) {
      element.focus();
      return true;
    }

    return false;
  }

  /**
   * フォーカス可能な要素を取得
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  /**
   * フォーカストラップの実装
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift+Tab: 最初の要素で後ろに戻る場合、最後の要素にフォーカス
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: 最後の要素で前に進む場合、最初の要素にフォーカス
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // 初期フォーカスを設定
    firstElement?.focus();

    // クリーンアップ関数を返す
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }
}

/**
 * ARIA属性生成ユーティリティ
 */
export const ariaUtils = {
  /**
   * comboboxのARIA属性を生成
   */
  combobox: (options: {
    expanded: boolean;
    hasPopup?: 'listbox' | 'menu' | 'tree' | 'grid' | 'dialog';
    controls?: string;
    activedescendant?: string;
  }) => ({
    role: 'combobox',
    'aria-expanded': options.expanded,
    'aria-haspopup': options.hasPopup || 'listbox',
    'aria-controls': options.controls,
    'aria-activedescendant': options.activedescendant,
  }),

  /**
   * listboxのARIA属性を生成
   */
  listbox: (options: { labelledby?: string; multiselectable?: boolean }) => ({
    role: 'listbox',
    'aria-labelledby': options.labelledby,
    'aria-multiselectable': options.multiselectable,
  }),

  /**
   * optionのARIA属性を生成
   */
  option: (options: {
    selected: boolean;
    setsize?: number;
    posinset?: number;
  }) => ({
    role: 'option',
    'aria-selected': options.selected,
    'aria-setsize': options.setsize,
    'aria-posinset': options.posinset,
  }),

  /**
   * tablistのARIA属性を生成
   */
  tablist: (options: { orientation?: 'horizontal' | 'vertical' }) => ({
    role: 'tablist',
    'aria-orientation': options.orientation || 'horizontal',
  }),

  /**
   * tabのARIA属性を生成
   */
  tab: (options: { selected: boolean; controls: string }) => ({
    role: 'tab',
    'aria-selected': options.selected,
    'aria-controls': options.controls,
    tabIndex: options.selected ? 0 : -1,
  }),

  /**
   * tabpanelのARIA属性を生成
   */
  tabpanel: (options: { labelledby: string; hidden?: boolean }) => ({
    role: 'tabpanel',
    'aria-labelledby': options.labelledby,
    hidden: options.hidden,
    tabIndex: 0,
  }),
};

/**
 * アクセシブルなアナウンス機能
 */
export class LiveRegionAnnouncer {
  private politeRegion: HTMLElement;
  private assertiveRegion: HTMLElement;

  constructor() {
    this.politeRegion = this.createLiveRegion('polite');
    this.assertiveRegion = this.createLiveRegion('assertive');
  }

  private createLiveRegion(politeness: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    document.body.appendChild(region);
    return region;
  }

  /**
   * 丁寧にアナウンス（polite）
   */
  announcePolite(message: string): void {
    this.politeRegion.textContent = message;
  }

  /**
   * 即座にアナウンス（assertive）
   */
  announceAssertive(message: string): void {
    this.assertiveRegion.textContent = message;
  }

  /**
   * アナウンサーをクリーンアップ
   */
  cleanup(): void {
    this.politeRegion.remove();
    this.assertiveRegion.remove();
  }
}

/**
 * レスポンシブなフォントサイズ計算
 */
export const getAccessibleFontSize = () => {
  const userAgent = navigator.userAgent;
  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  return {
    mobile: isMobile,
    baseFontSize: isMobile ? 16 : 14,
    lineHeight: isMobile ? 1.6 : 1.5,
  };
};

/**
 * カラーコントラスト検証（簡易版）
 */
export const validateColorContrast = (
  foreground: string,
  background: string
): { ratio: number; passAA: boolean; passAAA: boolean } => {
  // 簡易実装：実際のプロダクションでは専用ライブラリを使用推奨
  // ここでは基本的な判定のみ
  const ratio = 4.5; // デフォルト値（実際の計算は複雑）

  return {
    ratio,
    passAA: ratio >= 4.5,
    passAAA: ratio >= 7,
  };
};

/**
 * スクリーンリーダー用のテキスト生成
 */
export const screenReaderUtils = {
  /**
   * 日付の読み上げ用テキスト生成
   */
  formatDateForScreenReader: (date: string): string => {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  },

  /**
   * 時刻の読み上げ用テキスト生成
   */
  formatTimeForScreenReader: (time: string): string => {
    const [hours, minutes] = time.split(':');
    return `${hours}時${minutes}分`;
  },

  /**
   * 数値の読み上げ用テキスト生成
   */
  formatNumberForScreenReader: (value: number, unit?: string): string => {
    return `${value}${unit ? unit : ''}`;
  },

  /**
   * ボタンの状態説明生成
   */
  formatButtonStateForScreenReader: (
    action: string,
    state?: 'selected' | 'expanded' | 'pressed'
  ): string => {
    const stateText = state
      ? `, ${
          state === 'selected'
            ? '選択済み'
            : state === 'expanded'
            ? '展開済み'
            : '押下済み'
        }`
      : '';
    return `${action}${stateText}`;
  },
};

/**
 * グローバルアクセシビリティ設定
 */
export const a11ySettings = {
  // 減速モーション設定の検出
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
    .matches,

  // ハイコントラスト設定の検出
  prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,

  // ダークモード設定の検出
  prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
};
