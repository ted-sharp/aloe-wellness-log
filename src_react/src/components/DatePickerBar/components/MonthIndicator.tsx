import React from 'react';

interface MonthIndicatorProps {
  date: Date;
}

/**
 * 月表示インジケーターコンポーネント
 */
export const MonthIndicator: React.FC<MonthIndicatorProps> = ({ date }) => {
  const classes = `
    flex flex-col items-center justify-center 
    min-w-14 w-14 max-w-14 h-14 
    px-0 py-0 m-1 
    rounded-xl bg-gray-100 dark:bg-gray-700 
    text-gray-500 dark:text-gray-300 
    text-xs font-bold 
    select-none cursor-default 
    border border-gray-300 dark:border-gray-600
  `.trim();

  return (
    <span
      className={classes}
      aria-hidden="true"
      style={{ scrollSnapAlign: 'center' }}
    >
      {date.getMonth() + 1}月
    </span>
  );
};