import { observer } from 'mobx-react-lite';
import React, { useCallback, useState } from 'react';
import { HiCalendarDays } from 'react-icons/hi2';
import { CalendarModal } from './DatePickerBar/components/CalendarModal';
import { DateButton } from './DatePickerBar/components/DateButton';
import { MonthIndicator } from './DatePickerBar/components/MonthIndicator';
import { useDatePickerBehavior } from './DatePickerBar/hooks/useDatePickerBehavior';
import type { DatePickerBarProps } from './DatePickerBar/types';

/**
 * リファクタリングされたDatePickerBarコンポーネント
 * 複数のカスタムフックと子コンポーネントに分離してシンプルに
 */
const DatePickerBar: React.FC<DatePickerBarProps> = props => {
  const { selectedDate, isRecorded } = props;

  // ローカル状態
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 統合されたDatePickerBar動作フック
  const {
    dateItems,
    scrollRef,
    touchRef,
    handleDateSelect,
    handleCalendarSelect,
  } = useDatePickerBehavior(props);

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
            // スクロールチェーン/オーバースクロールを抑止して初回右フリックの取りこぼしを防ぐ
            overscrollBehaviorX: 'contain',
            // スクロールバーは非表示
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            // 以前: 'x mandatory' → 暴れ低減のため 'x proximity' に変更
            scrollSnapType: 'x proximity',
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
          {dateItems.map(dateItem => (
            <React.Fragment key={`${dateItem.date.getTime()}`}>
              {/* 月表示 */}
              {dateItem.showMonth && <MonthIndicator date={dateItem.date} />}

              {/* 日付ボタン */}
              <DateButton dateItem={dateItem} onSelect={handleDateSelect} />
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
        onCenterScroll={() => {}}
        isRecorded={isRecorded}
      />
    </div>
  );
};

export default observer(DatePickerBar);
