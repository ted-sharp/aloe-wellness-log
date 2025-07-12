import { DATE_PICKER_CONFIG, WEEKDAY_COLORS, DateStatus } from './constants';
import { DateItem, DateRange } from './types';
import { formatDate, formatDay, formatWeekday } from '../../utils/dateUtils';

/**
 * 日付範囲を生成する
 */
export const createDateRange = (centerDate: Date): DateRange => {
  const minDate = new Date(centerDate);
  minDate.setDate(centerDate.getDate() - DATE_PICKER_CONFIG.EXTRA_SCROLL_DAYS);
  
  const maxDate = new Date(centerDate);
  maxDate.setDate(centerDate.getDate() + DATE_PICKER_CONFIG.EXTRA_SCROLL_DAYS);
  
  return { minDate, maxDate };
};

/**
 * 日付範囲を拡張する
 */
export const expandDateRange = (
  currentDate: Date,
  direction: 'forward' | 'backward'
): Date => {
  const newDate = new Date(currentDate);
  const days = direction === 'forward' 
    ? DATE_PICKER_CONFIG.SCROLL_EXPAND_CHUNK 
    : -DATE_PICKER_CONFIG.SCROLL_EXPAND_CHUNK;
  
  newDate.setDate(currentDate.getDate() + days);
  return newDate;
};

/**
 * 曜日に応じた色を取得する
 */
export const getWeekdayColor = (dayOfWeek: number): string => {
  switch (dayOfWeek) {
    case 0: return WEEKDAY_COLORS.SUNDAY;
    case 6: return WEEKDAY_COLORS.SATURDAY;
    default: return WEEKDAY_COLORS.WEEKDAY;
  }
};

/**
 * 日付配列から表示用のDateItemを生成する
 */
export const createDateItems = (
  dateArray: Date[],
  selectedDate: Date,
  centerDate: Date,
  today: Date,
  getDateStatus?: (date: Date) => DateStatus,
  isRecorded?: (date: Date) => boolean
): DateItem[] => {
  return dateArray.map((date, index) => {
    const isSelected = formatDate(date) === formatDate(selectedDate);
    const isToday = formatDate(date) === formatDate(today);
    const isCenter = formatDate(date) === formatDate(centerDate);
    
    const prevDate = index > 0 ? dateArray[index - 1] : null;
    const showMonth = index === 0 || 
      (prevDate && date.getMonth() !== prevDate.getMonth());
    
    const dayOfWeek = date.getDay();
    const weekdayColor = getWeekdayColor(dayOfWeek);
    
    const status = getDateStatus 
      ? getDateStatus(date)
      : isRecorded && isRecorded(date)
      ? 'green' as DateStatus
      : 'none' as DateStatus;

    return {
      date,
      isSelected,
      isToday,
      isCenter,
      showMonth,
      weekdayColor,
      status,
      index,
    };
  });
};

/**
 * タッチ移動量から日数を計算する
 */
export const calculateDaysFromSwipe = (diffX: number): number => {
  const dayPixel = DATE_PICKER_CONFIG.BUTTON_WIDTH + DATE_PICKER_CONFIG.DAY_PIXEL_SPACING;
  return Math.round(Math.abs(diffX) / dayPixel) || 1;
};

/**
 * スクロール端の判定
 */
export const isAtScrollEdge = (
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number
): { isAtLeft: boolean; isAtRight: boolean } => {
  const threshold = DATE_PICKER_CONFIG.EDGE_THRESHOLD;
  
  return {
    isAtLeft: scrollLeft <= threshold,
    isAtRight: scrollLeft + clientWidth + threshold >= scrollWidth,
  };
};

/**
 * 中央スクロール位置を計算する
 */
export const calculateCenterScrollOffset = (
  containerRect: DOMRect,
  targetRect: DOMRect
): number => {
  return (
    targetRect.left +
    targetRect.width / 2 -
    (containerRect.left + containerRect.width / 2)
  );
};