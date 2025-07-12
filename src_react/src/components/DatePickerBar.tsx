import React, { useState, useMemo, useCallback, useRef } from 'react';
import { HiCalendarDays } from 'react-icons/hi2';
import { getDateArray } from '../utils/dateUtils';
import { getTodayDate } from './DatePickerBar/constants';
import { DatePickerBarProps } from './DatePickerBar/types';
import { createDateItems } from './DatePickerBar/helpers';
import { useDateRange } from './DatePickerBar/hooks/useDateRange';
import { useScrollable } from './DatePickerBar/hooks/useScrollable';
import { useTouch } from './DatePickerBar/hooks/useTouch';
import { useCenterScroll } from './DatePickerBar/hooks/useCenterScroll';
import { useScrollCorrection } from './DatePickerBar/hooks/useScrollCorrection';
import { DateButton } from './DatePickerBar/components/DateButton';
import { MonthIndicator } from './DatePickerBar/components/MonthIndicator';
import { CalendarModal } from './DatePickerBar/components/CalendarModal';

/**
 * リファクタリングされたDatePickerBarコンポーネント
 * 複数のカスタムフックと子コンポーネントに分離してシンプルに
 */
const DatePickerBar: React.FC<DatePickerBarProps> = ({
  selectedDate,
  setSelectedDate,
  centerDate,
  setCenterDate,
  today = getTodayDate(), // 型安全で一貫性のある今日の日付
  isRecorded,
  getDateStatus,
}) => {
  // ローカル状態
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // ref統合: touch と scroll 両方に対応する共通ref
  const containerRef = useRef<HTMLDivElement>(null);

  // カスタムフック
  const { dateRange, lastEdgeRef, prevWidthRef, expandRange } = useDateRange(centerDate);
  
  // scrollableフック：独自のrefを使わず、外部refを使用
  const { containerRef: scrollRef } = useScrollable({
    onScrollEdge: expandRange,
  });
  
  // touchフック：独自のrefを使わず、外部refを使用  
  const { touchRef } = useTouch({
    centerDate,
    setCenterDate,
  });
  
  const { requestCenterScroll } = useCenterScroll({
    centerDate,
    containerRef: scrollRef,
  });
  
  useScrollCorrection({
    containerRef: scrollRef,
    lastEdgeRef,
    prevWidthRef,
    dateRange,
  });

  // パフォーマンス最適化: dateItemsのメモ化
  const dateArray = useMemo(() => 
    getDateArray(dateRange.minDate, dateRange.maxDate), 
    [dateRange.minDate, dateRange.maxDate]
  );
  
  const dateItems = useMemo(() => 
    createDateItems(
      dateArray,
      selectedDate,
      centerDate,
      today,
      getDateStatus,
      isRecorded
    ), 
    [dateArray, selectedDate, centerDate, today, getDateStatus, isRecorded]
  );

  // イベントハンドラー（メモ化）
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, [setSelectedDate]);

  const handleCalendarSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setCenterDate(date);
    requestCenterScroll();
  }, [setSelectedDate, setCenterDate, requestCenterScroll]);

  const openCalendar = useCallback(() => setIsCalendarOpen(true), []);
  const closeCalendar = useCallback(() => setIsCalendarOpen(false), []);

  return (
    <div data-testid="date-picker">
      {/* メインピッカー */}
      <div
        ref={touchRef}
        className="w-full flex items-center justify-center pt-2 pb-2 bg-white/80 dark:bg-gray-900/80 shadow-md sticky top-0 z-10"
      >
        {/* カレンダーボタン */}
        <button
          type="button"
          onClick={openCalendar}
          className="ml-2 mr-1 flex items-center justify-center w-12 h-12 rounded-full border-2 border-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="カレンダーを開く"
        >
          <HiCalendarDays className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </button>

        {/* 日付スクロールバー */}
        <div
          ref={scrollRef}
          className="flex-1 flex gap-1 mx-1 overflow-x-auto justify-center scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* スクロールバー非表示のスタイル */}
          <style>{`
            .scrollbar-hide::-webkit-scrollbar, 
            .scrollbar-none::-webkit-scrollbar, 
            .scrollbar-fake::-webkit-scrollbar {
              display: none !important;
            }
          `}</style>

          {/* 日付アイテム */}
          {dateItems.map((dateItem) => (
            <React.Fragment key={`${dateItem.date.getTime()}`}>
              {/* 月表示 */}
              {dateItem.showMonth && (
                <MonthIndicator date={dateItem.date} />
              )}
              
              {/* 日付ボタン */}
              <DateButton
                dateItem={dateItem}
                onSelect={handleDateSelect}
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* カレンダーモーダル */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={closeCalendar}
        selectedDate={selectedDate}
        onSelect={handleCalendarSelect}
        onCenterScroll={requestCenterScroll}
        isRecorded={isRecorded}
      />
    </div>
  );
};

export default DatePickerBar;