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