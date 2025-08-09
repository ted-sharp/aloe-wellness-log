import { useCallback, useMemo } from 'react';
import { goalStore } from '../../../store/goal.mobx';
import { getDateArray } from '../../../utils/dateUtils';
import { createDateItems } from '../helpers';
import type { DatePickerBarProps } from '../types';
import { useCenterScroll } from './useCenterScroll';
import { useDateRange } from './useDateRange';
import { useScrollCorrection } from './useScrollCorrection';
import { useScrollable } from './useScrollable';
import { useTouch } from './useTouch';

/**
 * DatePickerBarの全ての動作を統合するカスタムフック
 * 複数の小さなフックを組み合わせて、DatePickerBarに必要な機能を提供
 */
export const useDatePickerBehavior = ({
  selectedDate,
  setSelectedDate,
  centerDate,
  setCenterDate,
  today,
  isRecorded,
  getDateStatus,
}: DatePickerBarProps) => {
  // 日付範囲管理
  const { dateRange, lastEdgeRef, prevWidthRef, expandRange } =
    useDateRange(centerDate);

  // スクロール機能
  const { containerRef: scrollRef } = useScrollable({
    onScrollEdge: expandRange,
  });

  // タッチ機能
  const { touchRef } = useTouch({
    setCenterDate,
    getBaseDate: () => centerDate,
  });

  // 中央スクロール機能
  const { requestCenterScroll } = useCenterScroll({
    centerDate,
    containerRef: scrollRef,
  });

  // スクロール位置補正
  useScrollCorrection({
    containerRef: scrollRef,
    lastEdgeRef,
    prevWidthRef,
    dateRange,
  });

  // 日付配列の生成（メモ化）
  const dateArray = useMemo(
    () => getDateArray(dateRange.minDate, dateRange.maxDate),
    [dateRange.minDate, dateRange.maxDate]
  );

  // 日付アイテムの生成（メモ化）
  const dateItems = useMemo(
    () =>
      createDateItems(
        dateArray,
        selectedDate,
        centerDate,
        today || new Date(),
        getDateStatus,
        isRecorded,
        goalStore.checkpointDates
      ),
    [
      dateArray,
      selectedDate,
      centerDate,
      today,
      getDateStatus,
      isRecorded,
      goalStore.checkpointDates,
    ]
  );

  // イベントハンドラー
  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
    },
    [setSelectedDate]
  );

  const handleCalendarSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      setCenterDate(date);
      requestCenterScroll();
    },
    [setSelectedDate, setCenterDate, requestCenterScroll]
  );

  return {
    // データ
    dateItems,

    // Refs
    scrollRef,
    touchRef,

    // イベントハンドラー
    handleDateSelect,
    handleCalendarSelect,

    // ユーティリティ
    requestCenterScroll,
  };
};
