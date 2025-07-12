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
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 pt-8 p-4 sm:pt-10 sm:p-6 w-[95vw] max-w-md relative"
        onClick={e => e.stopPropagation()}
      >
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
            today: 'ring-2 ring-blue-400 ring-offset-1',
          }}
          classNames={{
            ...getDefaultClassNames(),
            root: `${getDefaultClassNames().root} dark:text-gray-100`,
            caption_label: `${
              getDefaultClassNames().caption_label
            } text-lg font-medium text-gray-900 dark:text-gray-100`,
            nav: `${
              getDefaultClassNames().nav || ''
            } border border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800`,
            day: `${
              getDefaultClassNames().day
            } hover:bg-blue-50 dark:hover:bg-blue-900/30`,
            selected: `${
              getDefaultClassNames().selected || ''
            } bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 dark:from-blue-400 dark:to-blue-500`,
            today: `${
              getDefaultClassNames().today || ''
            } bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 dark:from-gray-700 dark:to-gray-800 dark:text-gray-100 font-semibold`,
            outside: `${
              getDefaultClassNames().outside || ''
            } text-gray-400 opacity-50 dark:text-gray-600`,
            disabled: `${
              getDefaultClassNames().disabled || ''
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