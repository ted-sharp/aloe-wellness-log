import React from 'react';
import { HiCalendarDays, HiClock } from 'react-icons/hi2';

interface DateTimeSelectorProps {
  recordDate: string;
  recordTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSetCurrentDateTime: () => void;
}

const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  recordDate,
  recordTime,
  onDateChange,
  onTimeChange,
  onSetCurrentDateTime
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <HiCalendarDays className="w-6 h-6 text-blue-600" />
          記録日時
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-base font-medium text-gray-700 mb-2">日付</label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          <div className="flex-1">
            <label className="block text-base font-medium text-gray-700 mb-2">時刻</label>
            <input
              type="time"
              value={recordTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onSetCurrentDateTime}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2"
            >
              <HiClock className="w-5 h-5" />
              現在時刻
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateTimeSelector;
