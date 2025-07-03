import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { HiCalendarDays } from 'react-icons/hi2';

// 日付ユーティリティ
const BUTTON_WIDTH = 56;
const MIN_BUTTONS = 5;
const MAX_BUTTONS = 21;
const EXTRA_SCROLL_DAYS = 90; // 最低表示日数（片側）
const SCROLL_EXPAND_CHUNK = 30; // 端に来たら追加する日数

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
  const [expandDays, setExpandDays] = useState(EXTRA_SCROLL_DAYS);
  const lastEdgeRef = useRef<'left' | 'right' | null>(null);
  const prevWidthRef = useRef<number>(0);

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

  // 表示範囲を広げて水平方向にオーバーフローを確保（可視領域×3）
  const range = Math.floor(buttonCount / 2);
  const displayRange = Math.max(range * 3, expandDays); // 可視域×3 か expandDays の大きい方
  const dateArray = getDateArray(centerDate, displayRange);

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
        // 1 ボタン幅 + gap（概算）あたりを 1 日とみなして移動量を算定
        const DAY_PIXEL = BUTTON_WIDTH + 8; // gap-1 は 0.25rem ≒ 4px, 余裕を見て 8
        const daysMove = Math.round(Math.abs(diffX) / DAY_PIXEL) || 1;

        const newDate = new Date(centerDate);
        if (diffX < 0) {
          // 左フリック → 未来へ daysMove 日
          newDate.setDate(centerDate.getDate() + daysMove);
        } else {
          // 右フリック → 過去へ daysMove 日
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

  // スクロール端に達したら日付配列を前後に拡張
  useEffect(() => {
    const btns = btnsRef.current;
    if (!btns) return;

    const handleScrollEdge = () => {
      const { scrollLeft, scrollWidth, clientWidth } = btns;
      const EDGE_THRESHOLD = 60; // px

      // 右端
      if (scrollLeft + clientWidth + EDGE_THRESHOLD >= scrollWidth) {
        setExpandDays(prev => prev + SCROLL_EXPAND_CHUNK);
        lastEdgeRef.current = 'right';
        prevWidthRef.current = scrollWidth;
      }
      // 左端
      if (scrollLeft <= EDGE_THRESHOLD) {
        setExpandDays(prev => prev + SCROLL_EXPAND_CHUNK);
        lastEdgeRef.current = 'left';
        prevWidthRef.current = scrollWidth;
      }
    };

    btns.addEventListener('scroll', handleScrollEdge, { passive: true });
    return () => btns.removeEventListener('scroll', handleScrollEdge);
  }, []);

  // 拡張後、左端追加の場合は scrollLeft を補正してジャンプを防止
  useLayoutEffect(() => {
    const btns = btnsRef.current;
    if (!btns) return;
    if (!lastEdgeRef.current) return;

    const diff = btns.scrollWidth - prevWidthRef.current;
    if (lastEdgeRef.current === 'left') {
      btns.scrollLeft += diff;
    }
    // 右端追加は位置変化しないため補正不要
    lastEdgeRef.current = null;
  }, [expandDays]);

  return (
    <div>
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
            return (
              <React.Fragment key={formatDate(date)}>
                {showMonth && (
                  <span
                    className="flex flex-col items-center justify-center min-w-14 w-14 max-w-14 h-14 px-0 py-0 m-1 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold select-none cursor-default border border-gray-300 dark:border-gray-600"
                    aria-hidden="true"
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
                  {isRecorded && isRecorded(date) && (
                    <span
                      className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-500 border border-white dark:border-gray-800"
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl pt-8 p-4 sm:pt-10 sm:p-6 w-[95vw] max-w-md relative"
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
            <Calendar
              onChange={date => {
                setSelectedDate(date as Date);
                setCenterDate(date as Date);
                setTimeout(() => {
                  // スクロール位置を中央に補正
                  const btns = btnsRef.current;
                  if (!btns) return;
                  const target = btns.querySelector<HTMLButtonElement>(
                    `button[data-date='${formatDate(date as Date)}']`
                  );
                  if (!target) return;
                  const containerRect = btns.getBoundingClientRect();
                  const targetRect = target.getBoundingClientRect();
                  const offset =
                    targetRect.left +
                    targetRect.width / 2 -
                    (containerRect.left + containerRect.width / 2);
                  btns.scrollBy({ left: offset, behavior: 'smooth' });
                }, 0);
                setIsCalendarOpen(false);
              }}
              value={selectedDate}
              locale="ja-JP"
              className="w-full"
              formatDay={(_locale, date) => date.getDate().toString()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePickerBar;
