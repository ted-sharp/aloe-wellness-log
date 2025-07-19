import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { HiCalendarDays } from 'react-icons/hi2';
import { getDateArray } from '../../utils/dateUtils';
import type { DatePickerBarProps } from './types';
import { createDateItems } from './helpers';
import { useDateRange } from './hooks/useDateRange';
import { useScrollable } from './hooks/useScrollable';
import { useTouch } from './hooks/useTouch';
import { useCenterScroll } from './hooks/useCenterScroll';
import { useScrollCorrection } from './hooks/useScrollCorrection';
import { DateButton } from './components/DateButton';
import { MonthIndicator } from './components/MonthIndicator';
import { CalendarModal } from './components/CalendarModal';
import { goalStore } from '../../store/goal.mobx';

/**
 * リファクタリングされたDatePickerBarコンポーネント
 * 複数のカスタムフックと子コンポーネントに分離してシンプルに
 */
const DatePickerBarComponent: React.FC<DatePickerBarProps> = ({
  selectedDate,
  setSelectedDate,
  centerDate,
  setCenterDate,
  today = new Date(),
  isRecorded,
  getDateStatus,
}) => {
  // デバッグ用ログ（コンポーネント実行確認）
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 DatePickerBar component executing');
  }

  // ローカル状態
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // カスタムフック
  const { dateRange, lastEdgeRef, prevWidthRef, expandRange } = useDateRange(centerDate);
  
  const { containerRef } = useScrollable({
    onScrollEdge: expandRange,
  });
  
  const { touchRef } = useTouch({
    setCenterDate,
  });
  
  const { requestCenterScroll } = useCenterScroll({
    centerDate,
    containerRef,
  });
  
  useScrollCorrection({
    containerRef,
    lastEdgeRef,
    prevWidthRef,
    dateRange,
  });

  // 日付配列と表示アイテムの生成
  const dateArray = getDateArray(dateRange.minDate, dateRange.maxDate);
  
  // MobX observableからローカル変数に取得
  const checkpointDates = goalStore.checkpointDates;
  
  // デバッグ用ログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 DatePickerBar render - checkpointDates:', checkpointDates);
  }
  
  const dateItems = createDateItems(
    dateArray,
    selectedDate,
    centerDate,
    today,
    getDateStatus,
    isRecorded,
    checkpointDates
  );

  // イベントハンドラー
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCalendarSelect = (date: Date) => {
    setSelectedDate(date);
    setCenterDate(date);
    requestCenterScroll();
  };

  const openCalendar = () => setIsCalendarOpen(true);
  const closeCalendar = () => setIsCalendarOpen(false);

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
          ref={containerRef}
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

const DatePickerBar = observer(DatePickerBarComponent);

export default DatePickerBar;