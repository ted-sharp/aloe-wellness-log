import { DateStatus } from './constants';

// DatePickerBarのProps型定義
export interface DatePickerBarProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  centerDate: Date;
  setCenterDate: (date: Date) => void;
  today?: Date;
  isRecorded?: (date: Date) => boolean;
  getDateStatus?: (date: Date) => DateStatus;
}

// 日付配列の各項目の型定義
export interface DateItem {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isCenter: boolean;
  showMonth: boolean;
  weekdayColor: string;
  status: DateStatus;
  index: number;
}

// タッチイベントの座標型定義
export interface TouchCoordinates {
  startX: number | null;
  startY: number | null;
}

// スクロール情報の型定義
export interface ScrollInfo {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}

// 日付範囲の型定義
export interface DateRange {
  minDate: Date;
  maxDate: Date;
}