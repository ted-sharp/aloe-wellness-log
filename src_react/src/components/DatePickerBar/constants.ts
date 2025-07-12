// DatePickerBar関連の定数定義
export const DATE_PICKER_CONFIG = {
  // レイアウト設定
  BUTTON_WIDTH: 56,
  BUTTON_HEIGHT: 48,
  MONTH_INDICATOR_WIDTH: 56,
  
  // スクロール設定
  EXTRA_SCROLL_DAYS: 90,
  SCROLL_EXPAND_CHUNK: 30,
  EDGE_THRESHOLD: 60,
  
  // タッチ操作設定
  TOUCH_THRESHOLD: 30,
  DAY_PIXEL_SPACING: 8, // BUTTON_WIDTH + gap
  
  // アニメーション設定
  SCROLL_RETRY_MAX: 10,
  SCROLL_RETRY_DELAY: 30,
  
  // スタイル設定
  SCROLL_SNAP_TYPE: 'x mandatory',
} as const;

// 週末の色設定
export const WEEKDAY_COLORS = {
  SUNDAY: 'text-red-500',
  SATURDAY: 'text-blue-500',
  WEEKDAY: '',
} as const;

// 日付ステータスの型定義
export type DateStatus = 'none' | 'green' | 'red';

// スクロール方向の型定義
export type ScrollDirection = 'left' | 'right';