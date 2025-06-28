import React, { useState } from 'react';
import DatePickerBar from '../components/DatePickerBar';

const WeightRecord: React.FC = () => {
  const today = new Date();
  const [centerDate, setCenterDate] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <DatePickerBar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        centerDate={centerDate}
        setCenterDate={setCenterDate}
      />
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
        体重ページ
      </h1>
      {/* ここに体重記録機能を実装予定 */}
    </div>
  );
};

export default WeightRecord;
