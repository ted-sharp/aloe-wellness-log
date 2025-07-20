import React, { memo } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { ja } from 'date-fns/locale';
import type { DatePickerBarProps } from '../types';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onCenterScroll: () => void;
  isRecorded?: DatePickerBarProps['isRecorded'];
}

/**
 * カレンダーモーダルコンポーネント（最適化版）
 */
const CalendarModalComponent: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelect,
  onCenterScroll,
  isRecorded,
}) => {
  if (!isOpen) return null;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onSelect(date);
      onCenterScroll();
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div
        className="calendar-modal-container bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 pt-8 p-4 sm:pt-10 sm:p-6 w-[95vw] max-w-md relative"
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          .calendar-modal-container .rdp {
            width: auto !important;
            margin: 0 auto !important;
            display: block !important;
          }
          .calendar-modal-container .rdp-month_grid {
            width: auto !important;
            margin: 0 auto !important;
          }
          .calendar-modal-container .rdp .rdp-day_button {
            width: clamp(2.25rem, 6.5vw, 3.5rem) !important;
            height: clamp(2.25rem, 6.5vw, 3.5rem) !important;
            font-size: clamp(0.875rem, 3.8vw, 1.1rem) !important;
          }
          .calendar-modal-container .rdp .rdp-weekday {
            font-size: clamp(0.875rem, 3.3vw, 1.1rem) !important;
          }
          @media (max-width: 375px) {
            .calendar-modal-container .rdp .rdp-day_button {
              width: 2.75rem !important;
              height: 2.75rem !important;
              font-size: 0.9rem !important;
            }
            .calendar-modal-container .rdp .rdp-weekday {
              font-size: 0.9rem !important;
            }
          }
          .calendar-modal-container .rdp .today-border {
            position: relative !important;
          }
          .calendar-modal-container .rdp .rdp-day.today-border button.rdp-day_button {
            color: #1f2937 !important;
          }
          .calendar-modal-container .rdp .today-border::after {
            content: '' !important;
            position: absolute !important;
            inset: -2px !important;
            border: 2px solid #60a5fa !important;
            border-radius: 0.375rem !important;
            pointer-events: none !important;
          }
          html.dark .calendar-modal-container .rdp .rdp-day.today-border button.rdp-day_button {
            color: #f9fafb !important;
          }
          .calendar-modal-container button.rdp-day_button[aria-label*="selected"] {
            color: #1f2937 !important;
          }
          .calendar-modal-container .rdp button.rdp-day_button[aria-label*="selected"] {
            color: #1f2937 !important;
          }
          .calendar-modal-container button[aria-label*="selected"] {
            color: #1f2937 !important;
          }
          button.rdp-day_button[aria-label*="selected"] {
            color: #1f2937 !important;
          }
          .calendar-modal-container button.rdp-day_button[aria-label*="selected"]:focus,
          .calendar-modal-container button.rdp-day_button[aria-label*="selected"]:hover {
            color: #1f2937 !important;
          }
          .calendar-modal-container .selected-date-custom {
            color: #1f2937 !important;
          }
          .calendar-modal-container .rdp .selected-date-custom {
            color: #1f2937 !important;
          }
          .calendar-modal-container .rdp .recorded::after {
            bottom: 2px !important;
            width: 6px !important;
            height: 6px !important;
          }
          @media (max-width: 375px) {
            .calendar-modal-container .rdp .recorded::after {
              bottom: 1px !important;
              width: 5px !important;
              height: 5px !important;
            }
          }
        `}</style>
        <button
          type="button"
          onClick={onClose}
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
        
        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            locale={ja}
            weekStartsOn={0}
            onSelect={handleDateSelect}
          formatters={{
            formatCaption: (date) => {
              return `${date.getFullYear()}年${date.getMonth() + 1}月`;
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
            today: 'today-border',
          }}
          classNames={{
            ...getDefaultClassNames(),
            root: `${getDefaultClassNames().root} dark:text-gray-100`,
            months: `${getDefaultClassNames().months}`,
            month: `${getDefaultClassNames().month}`,
            month_grid: `${getDefaultClassNames().month_grid}`,
            weekdays: `${getDefaultClassNames().weekdays}`,
            weekday: `${getDefaultClassNames().weekday} text-xs sm:text-sm font-medium`,
            week: `${getDefaultClassNames().week}`,
            day: `${getDefaultClassNames().day}`,
            day_button: `${getDefaultClassNames().day_button}`,
            selected: `${
              getDefaultClassNames().selected || ''
            } bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg hover:from-blue-600 hover:to-blue-700 dark:from-blue-400 dark:to-blue-500 selected-date-custom`,
            today: `${
              getDefaultClassNames().today || ''
            } bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 dark:from-gray-700 dark:to-gray-800 dark:text-gray-100 font-semibold`,
            outside: `${
              getDefaultClassNames().outside || ''
            } text-gray-400 opacity-50 dark:text-gray-600`,
            disabled: `${
              getDefaultClassNames().disabled || ''
            } text-gray-400 opacity-50 dark:text-gray-600`,
            caption_label: `${
              getDefaultClassNames().caption_label
            } text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100`,
            nav: `${
              getDefaultClassNames().nav || ''
            } border border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800`,
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
    </div>
  );
};

// React.memoでメモ化
export const CalendarModal = memo(CalendarModalComponent, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.selectedDate.getTime() === nextProps.selectedDate.getTime() &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onCenterScroll === nextProps.onCenterScroll &&
    prevProps.isRecorded === nextProps.isRecorded
  );
});