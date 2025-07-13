// DatePickerBar関連の定数定義
export const DATE_PICKER_CONFIG = {
  // レイアウト設定
  BUTTON_WIDTH: 56,
  BUTTON_HEIGHT: 48,
  MONTH_INDICATOR_WIDTH: 56,

  // スクロール設定
  EXTRA_SCROLL_DAYS: 15,
  SCROLL_EXPAND_CHUNK: 15,
  EDGE_THRESHOLD: 10,

  // タッチ操作設定
  TOUCH_THRESHOLD: 15,
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

// 型安全な曜日色の型定義
export type WeekdayColor = (typeof WEEKDAY_COLORS)[keyof typeof WEEKDAY_COLORS];

// 今日の日付を安全に取得する関数
export const getTodayDate = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// 日付ステータスの型定義
export type DateStatus = 'none' | 'green' | 'red';

// スクロール方向の型定義
export type ScrollDirection = 'left' | 'right';
