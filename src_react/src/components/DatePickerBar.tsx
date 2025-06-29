import React, { useCallback, useEffect, useRef, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { HiCalendarDays } from 'react-icons/hi2';

// 日付ユーティリティ
const BUTTON_WIDTH = 56;
const MIN_BUTTONS = 5;
const MAX_BUTTONS = 21;

const getDateArray = (centerDate: Date, range: number) => {
  const arr = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    arr.push(new Date(d));
  }
  return arr;
};

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDay = (date: Date) => `${date.getDate()}`;
const formatWeekday = (date: Date) =>
  ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

export interface DatePickerBarProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  centerDate: Date;
  setCenterDate: (date: Date) => void;
  today?: Date;
  isRecorded?: (date: Date) => boolean;
}

const DatePickerBar: React.FC<DatePickerBarProps> = ({
  selectedDate,
  setSelectedDate,
  centerDate,
  setCenterDate,
  today = new Date(),
  isRecorded,
}) => {
  const [buttonCount, setButtonCount] = useState<number>(MIN_BUTTONS);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);

  // 画面幅に応じてボタン数を再計算
  const updateButtonCount = useCallback(() => {
    const width = window.innerWidth;
    const maxButtons = Math.floor((width - 64) / (BUTTON_WIDTH + 8));
    setButtonCount(Math.max(MIN_BUTTONS, Math.min(MAX_BUTTONS, maxButtons)));
  }, []);

  useEffect(() => {
    updateButtonCount();
    window.addEventListener('resize', updateButtonCount);
    return () => window.removeEventListener('resize', updateButtonCount);
  }, [updateButtonCount]);

  const range = Math.floor(buttonCount / 2);
  const dateArray = getDateArray(centerDate, range);

  // ホイールで日付移動
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        const d = new Date(centerDate);
        d.setDate(centerDate.getDate() + 1);
        setCenterDate(d);
      } else if (e.deltaY > 0) {
        const d = new Date(centerDate);
        d.setDate(centerDate.getDate() - 1);
        setCenterDate(d);
      }
    };
    const picker = pickerRef.current;
    const btns = btnsRef.current;
    if (picker)
      picker.addEventListener('wheel', handleWheel, { passive: false });
    if (btns) btns.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      if (picker) picker.removeEventListener('wheel', handleWheel);
      if (btns) btns.removeEventListener('wheel', handleWheel);
    };
  }, [centerDate, setCenterDate]);

  return (
    <div>
      <div
        ref={pickerRef}
        className="w-full flex items-center justify-center py-6 bg-white/80 dark:bg-gray-900/80 shadow-md sticky top-0 z-10"
      >
        <button
          type="button"
          onClick={() => setIsCalendarOpen(true)}
          className="ml-2 mr-1 flex items-center justify-center w-12 h-12 rounded-full border-2 border-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="カレンダーを開く"
        >
          <HiCalendarDays className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </button>
        <div
          ref={btnsRef}
          className="flex-1 flex gap-1 mx-1 overflow-x-auto justify-center"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`
            .scrollbar-hide::-webkit-scrollbar, .scrollbar-none::-webkit-scrollbar, .scrollbar-fake::-webkit-scrollbar {
              display: none !important;
            }
          `}</style>
          {dateArray.map((date, idx) => {
            const isSelected = formatDate(date) === formatDate(selectedDate);
            const isToday = formatDate(date) === formatDate(today);
            const prevDate = idx > 0 ? dateArray[idx - 1] : null;
            const showMonth =
              idx === 0 ||
              (prevDate && date.getMonth() !== prevDate.getMonth());
            const dayOfWeek = date.getDay();
            const weekdayColor =
              dayOfWeek === 0
                ? 'text-red-500'
                : dayOfWeek === 6
                ? 'text-blue-500'
                : '';
            const isCenter = idx === range;
            return (
              <React.Fragment key={formatDate(date)}>
                {showMonth && (
                  <span
                    className="flex flex-col items-center justify-center min-w-14 w-14 max-w-14 h-14 px-0 py-0 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold select-none cursor-default border border-gray-300 dark:border-gray-600"
                    aria-hidden="true"
                  >
                    {date.getMonth() + 1}月
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedDate(date);
                  }}
                  className={`flex flex-col items-center justify-center min-w-14 w-14 max-w-14 h-14 px-0 py-0 rounded-xl border-2 transition-colors duration-150
                    ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isToday
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    }
                    hover:bg-blue-200 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400
                    ${isCenter ? 'border-4 border-blue-400 z-10' : ''}`}
                  aria-current={isSelected ? 'date' : undefined}
                  style={{ position: 'relative' }}
                >
                  <span className={`text-xs font-medium ${weekdayColor}`}>
                    {formatWeekday(date)}
                  </span>
                  <span className="text-lg font-bold">{formatDay(date)}</span>
                  {isRecorded && isRecorded(date) && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500 border border-white dark:border-gray-800"
                      aria-label="記録済み"
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {/* カレンダーモーダル */}
      {isCalendarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 w-[95vw] max-w-md relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
              aria-label="閉じる"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M6 18L18 6"
                />
              </svg>
            </button>
            <Calendar
              onChange={date => {
                setSelectedDate(date as Date);
                setCenterDate(date as Date);
                setIsCalendarOpen(false);
              }}
              value={selectedDate}
              locale="ja-JP"
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePickerBar;
