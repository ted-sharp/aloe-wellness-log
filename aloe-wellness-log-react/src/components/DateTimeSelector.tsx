import React, { memo } from 'react';
import { HiCalendarDays, HiClock } from 'react-icons/hi2';
import { useI18n } from '../hooks/useI18n';

interface DateTimeSelectorProps {
  recordDate: string;
  recordTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSetCurrentDateTime: () => void;
}

// メモ化されたDateTimeSelectorコンポーネント
const DateTimeSelector: React.FC<DateTimeSelectorProps> = memo(
  ({
    recordDate,
    recordTime,
    onDateChange,
    onTimeChange,
    onSetCurrentDateTime,
  }) => {
    const { t } = useI18n();

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
        <fieldset className="space-y-4">
          <legend className="text-2xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <HiCalendarDays
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            {t('pages.input.recordDateTime')}
          </legend>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label
                htmlFor="record-date"
                className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2"
              >
                {t('pages.input.date')}
              </label>
              <input
                id="record-date"
                type="date"
                value={recordDate}
                onChange={e => onDateChange(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                aria-describedby="record-date-desc"
                required
                aria-required="true"
              />
              <div id="record-date-desc" className="sr-only">
                {t('pages.input.dateDescription')}
              </div>
            </div>
            <div className="flex-1">
              <label
                htmlFor="record-time"
                className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-2"
              >
                {t('pages.input.time')}
              </label>
              <input
                id="record-time"
                type="time"
                value={recordTime}
                onChange={e => onTimeChange(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                aria-describedby="record-time-desc"
                required
                aria-required="true"
              />
              <div id="record-time-desc" className="sr-only">
                {t('pages.input.timeDescription')}
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={onSetCurrentDateTime}
                className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                aria-label={t('pages.input.setCurrentDateTime')}
                aria-describedby="current-time-desc"
              >
                <HiClock className="w-5 h-5" aria-hidden="true" />
                {t('pages.input.setCurrentDateTime')}
              </button>
              <div id="current-time-desc" className="sr-only">
                {t('pages.input.currentTimeDescription')}
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    );
  }
);

DateTimeSelector.displayName = 'DateTimeSelector';

export default DateTimeSelector;
