/**
 * 現在の時刻を HH:MM 形式で返す
 */
export const getCurrentTimeString = (): string => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Dateオブジェクトを YYYY-MM-DD 形式で返す
 */
export const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * 選択された日付のローカルストレージキー
 */
export const SELECTED_DATE_KEY = 'selectedDate';

/**
 * 日付の日のみを取得する（1-31）
 */
export const formatDay = (date: Date): string => `${date.getDate()}`;

/**
 * 曜日を日本語で取得する
 */
export const formatWeekday = (date: Date): string =>
  ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

/**
 * 指定された範囲の日付配列を生成する
 */
export const getDateArray = (minDate: Date, maxDate: Date): Date[] => {
  const arr: Date[] = [];
  const d = new Date(minDate);
  while (d <= maxDate) {
    arr.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return arr;
};

/**
 * 日付を指定日数前後に拡張する
 */
export const expandDateRange = (centerDate: Date, days: number): { minDate: Date; maxDate: Date } => {
  const minDate = new Date(centerDate);
  minDate.setDate(centerDate.getDate() - days);
  
  const maxDate = new Date(centerDate);
  maxDate.setDate(centerDate.getDate() + days);
  
  return { minDate, maxDate };
};

/**
 * 日付が同じかどうかを判定する
 */
export const isSameDate = (date1: Date, date2: Date): boolean => {
  return formatDate(date1) === formatDate(date2);
};