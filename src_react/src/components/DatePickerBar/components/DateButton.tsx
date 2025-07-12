import React from 'react';
import { DateItem } from '../types';
import { formatDate, formatDay, formatWeekday } from '../../../utils/dateUtils';

interface DateButtonProps {
  dateItem: DateItem;
  onSelect: (date: Date) => void;
}

/**
 * 個別の日付ボタンコンポーネント
 */
export const DateButton: React.FC<DateButtonProps> = ({ dateItem, onSelect }) => {
  const {
    date,
    isSelected,
    isToday,
    isCenter,
    weekdayColor,
    status,
    index,
  } = dateItem;

  const baseClasses = `
    flex flex-col items-center justify-center 
    min-w-12 w-12 max-w-12 h-12 
    px-0 py-0 mt-2 mb-2 
    rounded-full transition-colors duration-150 shadow-md
    hover:bg-blue-200 dark:hover:bg-blue-700 
    focus:outline-none focus:ring-2 focus:ring-blue-400
  `.trim();

  const stateClasses = isSelected
    ? 'bg-blue-600 text-white shadow-lg scale-105 z-10'
    : isToday
    ? 'bg-blue-100 text-blue-700'
    : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200';

  const centerClass = isCenter && !isSelected ? 'scale-105' : '';

  const statusIndicatorClasses = `
    inline-block w-2 h-2 rounded-full
    ${
      status === 'green'
        ? 'bg-green-500'
        : status === 'red'
        ? 'bg-red-500'
        : ''
    }
  `.trim();

  return (
    <button
      data-date-idx={index}
      data-date={formatDate(date)}
      onClick={() => onSelect(date)}
      className={`${baseClasses} ${stateClasses} ${centerClass}`}
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
      
      <span className="text-lg font-bold">
        {formatDay(date)}
      </span>
      
      <span className={statusIndicatorClasses} />
    </button>
  );
};