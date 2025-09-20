import { useCallback, useEffect, useRef, useState } from 'react';
import { createDateRange, expandDateRange } from '../helpers';
import type { DateRange, ScrollDirection } from '../types';

/**
 * 日付範囲の管理を行うカスタムフック
 */
export const useDateRange = (centerDate: Date) => {
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    createDateRange(centerDate)
  );

  const lastEdgeRef = useRef<ScrollDirection | null>(
    null
  ) as React.MutableRefObject<ScrollDirection | null>;
  const prevWidthRef = useRef<number>(0) as React.MutableRefObject<number>;

  // centerDateが範囲外になった場合の自動拡張（無限ループ防止）
  useEffect(() => {
    const { minDate, maxDate } = dateRange;
    let needsUpdate = false;
    const newRange = { ...dateRange };

    if (centerDate < minDate) {
      newRange.minDate = expandDateRange(centerDate, 'backward');
      needsUpdate = true;
    }

    if (centerDate > maxDate) {
      newRange.maxDate = expandDateRange(centerDate, 'forward');
      needsUpdate = true;
    }

    if (needsUpdate) {
      setDateRange(newRange);
    }
  }, [centerDate]); // dateRangeを依存関係から除外して無限ループを防止

  /**
   * 日付範囲を左右に拡張する（メモ化）
   */
  const expandRange = useCallback(
    (direction: ScrollDirection, scrollWidth: number) => {
      if (direction === 'left') {
        setDateRange(prev => ({
          ...prev,
          minDate: expandDateRange(prev.minDate, 'backward'),
        }));
      } else {
        setDateRange(prev => ({
          ...prev,
          maxDate: expandDateRange(prev.maxDate, 'forward'),
        }));
      }

      lastEdgeRef.current = direction;
      prevWidthRef.current = scrollWidth;
    },
    []
  ); // 依存関係なし - setDateRange は安定している

  return {
    dateRange,
    lastEdgeRef,
    prevWidthRef,
    expandRange,
  };
};
