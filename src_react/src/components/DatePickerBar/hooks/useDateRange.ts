import { useState, useEffect, useRef } from 'react';
import { DateRange, ScrollDirection } from '../types';
import { createDateRange, expandDateRange } from '../helpers';

/**
 * 日付範囲の管理を行うカスタムフック
 */
export const useDateRange = (centerDate: Date) => {
  const [dateRange, setDateRange] = useState<DateRange>(() => 
    createDateRange(centerDate)
  );
  
  const lastEdgeRef = useRef<ScrollDirection | null>(null);
  const prevWidthRef = useRef<number>(0);

  // centerDateが範囲外になった場合の自動拡張
  useEffect(() => {
    const { minDate, maxDate } = dateRange;
    
    if (centerDate < minDate) {
      setDateRange(prev => ({
        ...prev,
        minDate: expandDateRange(centerDate, 'backward'),
      }));
    }
    
    if (centerDate > maxDate) {
      setDateRange(prev => ({
        ...prev,
        maxDate: expandDateRange(centerDate, 'forward'),
      }));
    }
  }, [centerDate, dateRange]);

  /**
   * 日付範囲を左右に拡張する
   */
  const expandRange = (direction: ScrollDirection, scrollWidth: number) => {
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
  };

  return {
    dateRange,
    lastEdgeRef,
    prevWidthRef,
    expandRange,
  };
};