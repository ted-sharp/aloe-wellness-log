import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate, SELECTED_DATE_KEY } from '../utils/dateUtils';

/**
 * 日付選択と記録状態管理を行うフック
 */
interface UseDateSelectionOptions<T> {
  records: T[];
  getRecordDate: (record: T) => string;
}

interface UseDateSelectionReturn<T> {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  centerDate: Date;
  setCenterDate: (date: Date) => void;
  today: Date;
  recordDate: string;
  recordsOfDay: T[];
  isRecorded: (date: Date) => boolean;
}

export function useDateSelection<T>({
  records,
  getRecordDate,
}: UseDateSelectionOptions<T>): UseDateSelectionReturn<T> {
  const today = new Date();
  
  // 選択された日付の状態管理
  const [centerDate, setCenterDate] = useState<Date>(() => {
    const saved = localStorage.getItem(SELECTED_DATE_KEY);
    return saved ? new Date(saved) : today;
  });
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const saved = localStorage.getItem(SELECTED_DATE_KEY);
    return saved ? new Date(saved) : today;
  });

  // 選択された日付の文字列表現
  const recordDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  // その日の記録をフィルタリング
  const recordsOfDay = useMemo(() => 
    records.filter(record => getRecordDate(record) === recordDate), 
    [records, recordDate, getRecordDate]
  );

  // 記録済みかどうかの判定
  const isRecorded = useCallback((date: Date) => {
    const dateStr = formatDate(date);
    return records.some(record => getRecordDate(record) === dateStr);
  }, [records, getRecordDate]);

  // selectedDateが変わったらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(SELECTED_DATE_KEY, selectedDate.toISOString());
  }, [selectedDate]);

  // selectedDateが変わったらcenterDateも更新
  useEffect(() => {
    setCenterDate(selectedDate);
  }, [selectedDate]);

  return {
    selectedDate,
    setSelectedDate,
    centerDate,
    setCenterDate,
    today,
    recordDate,
    recordsOfDay,
    isRecorded,
  };
}