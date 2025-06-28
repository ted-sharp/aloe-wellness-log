import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FocusManager,
  LiveRegionAnnouncer,
  a11ySettings,
  handleKeyboardNavigation,
  screenReaderUtils,
  type KeyboardHandlers,
} from '../utils/accessibility';

/**
 * フォーカス管理フック
 */
export function useFocusManager() {
  const focusManagerRef = useRef<FocusManager>(new FocusManager());

  const saveFocus = useCallback(() => {
    focusManagerRef.current.saveFocus();
  }, []);

  const restoreFocus = useCallback(() => {
    focusManagerRef.current.restoreFocus();
  }, []);

  const moveFocus = useCallback(
    (selector: string | HTMLElement, fallbackSelector?: string) => {
      return focusManagerRef.current.moveFocus(selector, fallbackSelector);
    },
    []
  );

  const trapFocus = useCallback((container: HTMLElement) => {
    return focusManagerRef.current.trapFocus(container);
  }, []);

  const getFocusableElements = useCallback((container: HTMLElement) => {
    return focusManagerRef.current.getFocusableElements(container);
  }, []);

  return {
    saveFocus,
    restoreFocus,
    moveFocus,
    trapFocus,
    getFocusableElements,
  };
}

/**
 * キーボードナビゲーションフック
 */
export function useKeyboardNavigation(handlers: KeyboardHandlers) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      handleKeyboardNavigation(event, handlers);
    },
    [handlers]
  );

  return { handleKeyDown };
}

/**
 * ライブリージョンアナウンサーフック
 */
export function useLiveRegion() {
  const announcerRef = useRef<LiveRegionAnnouncer | null>(null);

  useEffect(() => {
    announcerRef.current = new LiveRegionAnnouncer();
    return () => {
      announcerRef.current?.cleanup();
    };
  }, []);

  const announcePolite = useCallback((message: string) => {
    announcerRef.current?.announcePolite(message);
  }, []);

  const announceAssertive = useCallback((message: string) => {
    announcerRef.current?.announceAssertive(message);
  }, []);

  return { announcePolite, announceAssertive };
}

/**
 * スクリーンリーダーユーティリティフック
 */
export function useScreenReader() {
  const formatDate = useCallback((date: string) => {
    return screenReaderUtils.formatDateForScreenReader(date);
  }, []);

  const formatTime = useCallback((time: string) => {
    return screenReaderUtils.formatTimeForScreenReader(time);
  }, []);

  const formatNumber = useCallback((value: number, unit?: string) => {
    return screenReaderUtils.formatNumberForScreenReader(value, unit);
  }, []);

  const formatButtonState = useCallback(
    (action: string, state?: 'selected' | 'expanded' | 'pressed') => {
      return screenReaderUtils.formatButtonStateForScreenReader(action, state);
    },
    []
  );

  return {
    formatDate,
    formatTime,
    formatNumber,
    formatButtonState,
  };
}

/**
 * モーダル/ダイアログのアクセシビリティフック
 */
export function useModalAccessibility(isOpen: boolean) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { saveFocus, restoreFocus, trapFocus } = useFocusManager();
  const cleanupFocusTrapRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isOpen) {
      // モーダルが開いた時
      saveFocus();

      // 背景のスクロールを無効化
      document.body.style.overflow = 'hidden';

      // フォーカストラップを設定
      if (modalRef.current) {
        cleanupFocusTrapRef.current = trapFocus(modalRef.current);
      }
    } else {
      // モーダルが閉じた時
      restoreFocus();

      // 背景のスクロールを復元
      document.body.style.overflow = '';

      // フォーカストラップをクリーンアップ
      cleanupFocusTrapRef.current?.();
      cleanupFocusTrapRef.current = null;
    }

    return () => {
      // クリーンアップ
      document.body.style.overflow = '';
      cleanupFocusTrapRef.current?.();
    };
  }, [isOpen, saveFocus, restoreFocus, trapFocus]);

  const modalProps = {
    ref: modalRef,
    role: 'dialog',
    'aria-modal': true,
    tabIndex: -1,
  };

  return { modalProps };
}

/**
 * ドロップダウン/コンボボックスのアクセシビリティフック
 */
export function useDropdownAccessibility<T>({
  items,
  isOpen,
  selectedIndex,
  onSelectionChange,
  onToggle,
  onClose,
}: {
  items: T[];
  isOpen: boolean;
  selectedIndex: number;
  onSelectionChange: (index: number) => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const listboxId = `listbox-${Math.random().toString(36).substr(2, 9)}`;
  const comboboxId = `combobox-${Math.random().toString(36).substr(2, 9)}`;

  // ハイライトを選択に同期
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex);
    }
  }, [isOpen, selectedIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            onToggle();
          } else {
            setHighlightedIndex(prev =>
              prev < items.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen) {
            onToggle();
          } else {
            setHighlightedIndex(prev =>
              prev > 0 ? prev - 1 : items.length - 1
            );
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (isOpen) {
            onSelectionChange(highlightedIndex);
            onClose();
          } else {
            onToggle();
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (isOpen) {
            onClose();
          }
          break;
        case 'Home':
          event.preventDefault();
          if (isOpen) {
            setHighlightedIndex(0);
          }
          break;
        case 'End':
          event.preventDefault();
          if (isOpen) {
            setHighlightedIndex(items.length - 1);
          }
          break;
      }
    },
    [
      isOpen,
      items.length,
      highlightedIndex,
      onToggle,
      onSelectionChange,
      onClose,
    ]
  );

  const comboboxProps = {
    id: comboboxId,
    role: 'combobox',
    'aria-expanded': isOpen,
    'aria-haspopup': 'listbox' as const,
    'aria-controls': listboxId,
    'aria-activedescendant': isOpen
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined,
    onKeyDown: handleKeyDown,
    tabIndex: 0,
  };

  const listboxProps = {
    id: listboxId,
    role: 'listbox',
    'aria-labelledby': comboboxId,
  };

  const getOptionProps = (index: number) => ({
    id: `${listboxId}-option-${index}`,
    role: 'option',
    'aria-selected': index === selectedIndex,
    'aria-setsize': items.length,
    'aria-posinset': index + 1,
    className: index === highlightedIndex ? 'highlighted' : '',
  });

  return {
    highlightedIndex,
    comboboxProps,
    listboxProps,
    getOptionProps,
  };
}

/**
 * タブナビゲーションのアクセシビリティフック
 */
export function useTabAccessibility({
  tabs,
  activeTabIndex,
  onTabChange,
}: {
  tabs: string[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
}) {
  const tablistId = `tablist-${Math.random().toString(36).substr(2, 9)}`;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, tabIndex: number) => {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          onTabChange((tabIndex + 1) % tabs.length);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onTabChange(tabIndex === 0 ? tabs.length - 1 : tabIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          onTabChange(0);
          break;
        case 'End':
          event.preventDefault();
          onTabChange(tabs.length - 1);
          break;
      }
    },
    [tabs.length, onTabChange]
  );

  const tablistProps = {
    id: tablistId,
    role: 'tablist',
    'aria-orientation': 'horizontal' as const,
  };

  const getTabProps = (index: number) => ({
    id: `${tablistId}-tab-${index}`,
    role: 'tab',
    'aria-selected': index === activeTabIndex,
    'aria-controls': `${tablistId}-panel-${index}`,
    tabIndex: index === activeTabIndex ? 0 : -1,
    onKeyDown: (event: React.KeyboardEvent) => handleKeyDown(event, index),
  });

  const getTabPanelProps = (index: number) => ({
    id: `${tablistId}-panel-${index}`,
    role: 'tabpanel',
    'aria-labelledby': `${tablistId}-tab-${index}`,
    hidden: index !== activeTabIndex,
    tabIndex: 0,
  });

  return {
    tablistProps,
    getTabProps,
    getTabPanelProps,
  };
}

/**
 * フォーム要素のアクセシビリティフック
 */
export function useFormAccessibility() {
  const generateId = useCallback(() => {
    return `form-element-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const getFieldProps = useCallback(
    (options: {
      label: string;
      description?: string;
      error?: string;
      required?: boolean;
    }) => {
      const fieldId = generateId();
      const descriptionId = options.description ? `${fieldId}-desc` : undefined;
      const errorId = options.error ? `${fieldId}-error` : undefined;

      const describedBy =
        [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

      return {
        fieldId,
        labelProps: {
          htmlFor: fieldId,
        },
        inputProps: {
          id: fieldId,
          'aria-describedby': describedBy,
          'aria-invalid': !!options.error,
          'aria-required': options.required,
        },
        descriptionProps: descriptionId
          ? {
              id: descriptionId,
            }
          : undefined,
        errorProps: errorId
          ? {
              id: errorId,
              role: 'alert',
              'aria-live': 'polite',
            }
          : undefined,
      };
    },
    [generateId]
  );

  return { getFieldProps };
}

/**
 * ユーザー設定対応フック
 */
export function useAccessibilitySettings() {
  const [settings, setSettings] = useState(a11ySettings);

  useEffect(() => {
    const updateSettings = () => {
      setSettings({
        prefersReducedMotion: window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches,
        prefersHighContrast: window.matchMedia('(prefers-contrast: high)')
          .matches,
        prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)')
          .matches,
      });
    };

    // メディアクエリの変更を監視
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const colorQuery = window.matchMedia('(prefers-color-scheme: dark)');

    motionQuery.addEventListener('change', updateSettings);
    contrastQuery.addEventListener('change', updateSettings);
    colorQuery.addEventListener('change', updateSettings);

    return () => {
      motionQuery.removeEventListener('change', updateSettings);
      contrastQuery.removeEventListener('change', updateSettings);
      colorQuery.removeEventListener('change', updateSettings);
    };
  }, []);

  return settings;
}
