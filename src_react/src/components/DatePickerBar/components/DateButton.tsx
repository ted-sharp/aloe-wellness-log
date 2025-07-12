import React, { memo, useMemo } from 'react';
import type { DateItem } from '../types';
import { formatDate, formatDay, formatWeekday } from '../../../utils/dateUtils';

interface DateButtonProps {
  dateItem: DateItem;
  onSelect: (date: Date) => void;
}

/**
 * 個別の日付ボタンコンポーネント（最適化版）
 */
const DateButtonComponent: React.FC<DateButtonProps> = ({ dateItem, onSelect }) => {
  const {
    date,
    isSelected,
    isToday,
    isCenter,
    weekdayColor,
    status,
    index,
  } = dateItem;

  // スタイル計算のメモ化
  const buttonClasses = useMemo(() => {
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

    return `${baseClasses} ${stateClasses} ${centerClass}`;
  }, [isSelected, isToday, isCenter]);

  const statusIndicatorClasses = useMemo(() => {
    const baseStyle = 'inline-block w-2 h-2 rounded-full';
    const statusColor = status === 'green' 
      ? 'bg-green-500' 
      : status === 'red' 
      ? 'bg-red-500' 
      : '';
    return `${baseStyle} ${statusColor}`.trim();
  }, [status]);

  // アクセシビリティの改善
  const ariaLabel = useMemo(() => {
    const dateStr = formatDate(date);
    const dayStr = formatDay(date);
    const weekdayStr = formatWeekday(date);
    const statusText = status === 'green' ? '記録済み' : status === 'red' ? '注意' : '';
    const selectedText = isSelected ? '選択中' : '';
    const todayText = isToday ? '今日' : '';
    
    return `${dateStr} ${weekdayStr} ${dayStr}日 ${statusText} ${selectedText} ${todayText}`.trim();
  }, [date, status, isSelected, isToday]);

  return (
    <button
      data-date-idx={index}
      data-date={formatDate(date)}
      onClick={() => onSelect(date)}
      className={buttonClasses}
      style={{
        position: 'relative',
        scrollSnapAlign: 'center',
        border: 'none',
      }}
      aria-current={isSelected ? 'date' : undefined}
      aria-label={ariaLabel}
      role="gridcell"
      tabIndex={isSelected ? 0 : -1}
    >
      <span className={`text-xs font-medium ${weekdayColor}`} aria-hidden="true">
        {formatWeekday(date)}
      </span>
      
      <span className="text-lg font-bold" aria-hidden="true">
        {formatDay(date)}
      </span>
      
      <span 
        className={statusIndicatorClasses} 
        aria-hidden="true"
        role="presentation"
      />
    </button>
  );
};

// React.memoでコンポーネントをメモ化
export const DateButton = memo(DateButtonComponent, (prevProps, nextProps) => {
  // カスタム比較関数でパフォーマンスを最適化
  const prev = prevProps.dateItem;
  const next = nextProps.dateItem;
  
  return (
    prev.date.getTime() === next.date.getTime() &&
    prev.isSelected === next.isSelected &&
    prev.isToday === next.isToday &&
    prev.isCenter === next.isCenter &&
    prev.status === next.status &&
    prev.showMonth === next.showMonth &&
    prevProps.onSelect === nextProps.onSelect
  );
});