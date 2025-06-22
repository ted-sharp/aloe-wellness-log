import React, { memo } from 'react';
import { HiCalendarDays, HiClock } from 'react-icons/hi2';

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
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <fieldset className="space-y-4">
          <legend className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <HiCalendarDays
              className="w-6 h-6 text-blue-600"
              aria-hidden="true"
            />
            記録日時
          </legend>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label
                htmlFor="record-date"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                日付
              </label>
              <input
                id="record-date"
                type="date"
                value={recordDate}
                onChange={e => onDateChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                aria-describedby="record-date-desc"
                required
                aria-required="true"
              />
              <div id="record-date-desc" className="sr-only">
                記録する日付を選択してください
              </div>
            </div>
            <div className="flex-1">
              <label
                htmlFor="record-time"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                時刻
              </label>
              <input
                id="record-time"
                type="time"
                value={recordTime}
                onChange={e => onTimeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                aria-describedby="record-time-desc"
                required
                aria-required="true"
              />
              <div id="record-time-desc" className="sr-only">
                記録する時刻を選択してください
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={onSetCurrentDateTime}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="現在の日時を設定"
                aria-describedby="current-time-desc"
              >
                <HiClock className="w-5 h-5" aria-hidden="true" />
                現在時刻
              </button>
              <div id="current-time-desc" className="sr-only">
                クリックすると現在の日付と時刻が自動的に設定されます
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
