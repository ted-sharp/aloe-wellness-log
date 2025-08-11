import type { DateStatus, WeekdayColor } from './constants';

// DatePickerBarのProps型定義
export interface DatePickerBarProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  centerDate: Date;
  setCenterDate: (date: Date) => void;
  today?: Date;
  isRecorded?: (date: Date) => boolean;
  getDateStatus?: (date: Date) => DateStatus;
  checkpointDates?: string[];
}

// 日付配列の各項目の型定義
export interface DateItem {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isCenter: boolean;
  showMonth: boolean;
  weekdayColor: WeekdayColor;
  status: DateStatus;
  index: number;
  isCheckpoint: boolean;
}

// タッチイベントの座標型定義
export interface TouchCoordinates {
  startX: number | null;
  startY: number | null;
}

// スクロール情報の型定義（実際の使用場所で直接型定義）

// 日付範囲の型定義
export interface DateRange {
  minDate: Date;
  maxDate: Date;
}

// スクロール方向の型定義
export type ScrollDirection = 'left' | 'right';
