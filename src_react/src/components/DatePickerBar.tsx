import { ja } from 'date-fns/locale';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { HiCalendarDays } from 'react-icons/hi2';
import {
  formatDate,
  formatDay,
  formatWeekday,
  getDateArray,
} from '../utils/dateUtils';

// 日付ピッカー設定
const BUTTON_WIDTH = 56;
const EXTRA_SCROLL_DAYS = 90;
const SCROLL_EXPAND_CHUNK = 30;

export interface DatePickerBarProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  centerDate: Date;
  setCenterDate: (date: Date) => void;
  today?: Date;
  isRecorded?: (date: Date) => boolean;
  getDateStatus?: (date: Date) => 'none' | 'green' | 'red';
}

const DatePickerBar: React.FC<DatePickerBarProps> = ({
  selectedDate,
  setSelectedDate,
  centerDate,
  setCenterDate,
  today = new Date(),
  isRecorded,
  getDateStatus,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);
  const [minDate, setMinDate] = useState(() => {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() - EXTRA_SCROLL_DAYS);
    return d;
  });
  const [maxDate, setMaxDate] = useState(() => {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + EXTRA_SCROLL_DAYS);
    return d;
  });
  const lastEdgeRef = useRef<'left' | 'right' | null>(null);
  const prevWidthRef = useRef<number>(0);
  const [pendingCenterScroll, setPendingCenterScroll] = useState(false);

  // 初回マウント時に中央スクロール補正フラグを立てる
  useEffect(() => {
    setPendingCenterScroll(true);
  }, []);

  // minDate/maxDateでdateArray生成
  const dateArray = getDateArray(minDate, maxDate);

  // ホイールで横スクロール（縦ホイールを横スクロールに変換）
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const btns = btnsRef.current;
      if (!btns) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        // 縦ホイールを横スクロールに変換
        btns.scrollLeft += e.deltaY;
        e.preventDefault();
      }
      // 横ホイールやshift+ホイールは標準挙動
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
  }, []);

  // ------------------------------
  // タッチ（フリック）操作で日付移動
  // ------------------------------
  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    let startX: number | null = null;
    let startY: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startX === null || startY === null) return;
      const touch = e.changedTouches[0];
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;
      const THRESHOLD = 30;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > THRESHOLD) {
        const DAY_PIXEL = BUTTON_WIDTH + 8;
        const daysMove = Math.round(Math.abs(diffX) / DAY_PIXEL) || 1;
        const newDate = new Date(centerDate);
        if (diffX < 0) {
          newDate.setDate(centerDate.getDate() + daysMove);
        } else {
          newDate.setDate(centerDate.getDate() - daysMove);
        }
        setCenterDate(newDate);
      }
      startX = null;
      startY = null;
    };

    picker.addEventListener('touchstart', handleTouchStart, { passive: true });
    picker.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      picker.removeEventListener('touchstart', handleTouchStart);
      picker.removeEventListener('touchend', handleTouchEnd);
    };
  }, [centerDate, setCenterDate]);

  // スクロール端に達したらminDate/maxDateを拡張
  useEffect(() => {
    const btns = btnsRef.current;
    if (!btns) return;

    const handleScrollEdge = () => {
      const { scrollLeft, scrollWidth, clientWidth } = btns;
      const EDGE_THRESHOLD = 60; // px

      // 右端
      if (scrollLeft + clientWidth + EDGE_THRESHOLD >= scrollWidth) {
        setMaxDate(prev => {
          const d = new Date(prev);
          d.setDate(d.getDate() + SCROLL_EXPAND_CHUNK);
          return d;
        });
        lastEdgeRef.current = 'right';
        prevWidthRef.current = scrollWidth;
      }
      // 左端
      if (scrollLeft <= EDGE_THRESHOLD) {
        setMinDate(prev => {
          const d = new Date(prev);
          d.setDate(d.getDate() - SCROLL_EXPAND_CHUNK);
          return d;
        });
        lastEdgeRef.current = 'left';
        prevWidthRef.current = scrollWidth;
      }
    };

    btns.addEventListener('scroll', handleScrollEdge, { passive: true });
    return () => btns.removeEventListener('scroll', handleScrollEdge);
  }, []);

  // centerDateがminDate/maxDateを超えた場合も自動拡張
  useEffect(() => {
    if (centerDate < minDate) {
      setMinDate(() => {
        const d = new Date(centerDate);
        d.setDate(centerDate.getDate() - EXTRA_SCROLL_DAYS);
        return d;
      });
    }
    if (centerDate > maxDate) {
      setMaxDate(() => {
        const d = new Date(centerDate);
        d.setDate(centerDate.getDate() + EXTRA_SCROLL_DAYS);
        return d;
      });
    }
  }, [centerDate, minDate, maxDate]);

  // centerDate変更後、pendingCenterScroll時のみ中央スクロール補正
  useEffect(() => {
    if (!pendingCenterScroll) return;
    const btns = btnsRef.current;
    if (!btns) return;
    // ボタンが描画されるまで最大10回リトライ
    let tries = 0;
    const tryScroll = () => {
      const target = btns.querySelector<HTMLButtonElement>(
        `button[data-date='${formatDate(centerDate)}']`
      );
      if (target) {
        const containerRect = btns.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset =
          targetRect.left +
          targetRect.width / 2 -
          (containerRect.left + containerRect.width / 2);
        btns.scrollBy({ left: offset, behavior: 'smooth' });
        setPendingCenterScroll(false);
      } else if (tries < 10) {
        tries++;
        setTimeout(tryScroll, 30);
      } else {
        setPendingCenterScroll(false);
      }
    };
    tryScroll();
  }, [centerDate, pendingCenterScroll]);

  // minDate/maxDate拡張時のscrollLeft補正（左端のみ）
  useLayoutEffect(() => {
    const btns = btnsRef.current;
    if (!btns) return;
    if (!lastEdgeRef.current) return;
    const diff = btns.scrollWidth - prevWidthRef.current;
    if (lastEdgeRef.current === 'left' && diff > 0) {
      btns.scrollLeft += diff;
    }
    lastEdgeRef.current = null;
  }, [minDate, maxDate]);

  return (
    <div data-testid="date-picker">
      <div
        ref={pickerRef}
        className="w-full flex items-center justify-center pt-2 pb-2 bg-white/80 dark:bg-gray-900/80 shadow-md sticky top-0 z-10"
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
          className="flex-1 flex gap-1 mx-1 overflow-x-auto justify-center scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
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
            const isCenter = formatDate(date) === formatDate(centerDate);
            const status = getDateStatus
              ? getDateStatus(date)
              : isRecorded && isRecorded(date)
              ? 'green'
              : 'none';
            return (
              <React.Fragment key={formatDate(date)}>
                {showMonth && (
                  <span
                    className="flex flex-col items-center justify-center min-w-14 w-14 max-w-14 h-14 px-0 py-0 m-1 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold select-none cursor-default border border-gray-300 dark:border-gray-600"
                    aria-hidden="true"
                    style={{ scrollSnapAlign: 'center' }}
                  >
                    {date.getMonth() + 1}月
                  </span>
                )}
                <button
                  data-date-idx={idx}
                  data-date={formatDate(date)}
                  onClick={() => {
                    setSelectedDate(date);
                  }}
                  className={`flex flex-col items-center justify-center min-w-12 w-12 max-w-12 h-12 px-0 py-0 mt-2 mb-2 rounded-full transition-colors duration-150 shadow-md
                    ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-lg scale-105 z-10'
                        : isToday
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    }
                    hover:bg-blue-200 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400
                    ${isCenter && !isSelected ? 'scale-105' : ''}`}
                  style={{
                    position: 'relative',
                    scrollSnapAlign: 'center',
                    border: 'none',
                  }}
                  aria-current={isSelected ? 'date' : undefined}
                >
                  <span className={`text-xs font-medium ${weekdayColor}`}>
                    {formatWeekday(date)}
                  </span>
                  <span className="text-lg font-bold">{formatDay(date)}</span>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      status === 'green'
                        ? 'bg-green-500'
                        : status === 'red'
                        ? 'bg-red-500'
                        : ''
                    }`}
                  ></span>
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
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 pt-8 p-4 sm:pt-10 sm:p-6 w-[95vw] max-w-md relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="absolute top-0 right-0 m-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-transparent shadow-none border-none rounded-full transition-colors focus:outline-none hover:bg-gray-200/60 dark:hover:bg-white/10"
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
            <DayPicker
              mode="single"
              selected={selectedDate}
              locale={ja}
              weekStartsOn={0}
              onSelect={date => {
                if (date) {
                  setSelectedDate(date);
                  setCenterDate(date);
                  setPendingCenterScroll(true);
                  setIsCalendarOpen(false);
                }
              }}
              modifiers={{
                recorded: date => (isRecorded ? isRecorded(date) : false),
                today: date => {
                  const todayDate = new Date();
                  return date.toDateString() === todayDate.toDateString();
                },
              }}
              modifiersClassNames={{
                recorded:
                  'relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-green-500 after:rounded-full',
                today: 'ring-2 ring-blue-400 ring-offset-1',
              }}
              classNames={{
                ...getDefaultClassNames(),
                root: `${getDefaultClassNames().root} dark:text-gray-100`,
                caption_label: `${
                  getDefaultClassNames().caption_label
                } text-lg font-medium text-gray-900 dark:text-gray-100`,
                nav_button: `${
                  getDefaultClassNames().nav_button
                } border border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800`,
                head_cell: `${
                  getDefaultClassNames().head_cell
                } text-gray-500 dark:text-gray-400`,
                day: `${
                  getDefaultClassNames().day
                } hover:bg-blue-50 dark:hover:bg-blue-900/30`,
                day_selected: `${
                  getDefaultClassNames().day_selected
                } bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 dark:from-blue-400 dark:to-blue-500`,
                day_today: `${
                  getDefaultClassNames().day_today
                } bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 dark:from-gray-700 dark:to-gray-800 dark:text-gray-100 font-semibold`,
                day_outside: `${
                  getDefaultClassNames().day_outside
                } text-gray-400 opacity-50 dark:text-gray-600`,
                day_disabled: `${
                  getDefaultClassNames().day_disabled
                } text-gray-400 opacity-50 dark:text-gray-600`,
              }}
              components={{
                Chevron: ({ orientation, ...props }) =>
                  orientation === 'left' ? (
                    <span
                      className="text-2xl text-blue-500 dark:text-blue-300"
                      {...props}
                    >
                      ◀
                    </span>
                  ) : (
                    <span
                      className="text-2xl text-blue-500 dark:text-blue-300"
                      {...props}
                    >
                      ▶
                    </span>
                  ),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePickerBar;
