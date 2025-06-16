import React, { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useRecordsStore } from '../store/records';

export default function RecordCalendar() {
  const { records, fields } = useRecordsStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 日付ごとに記録があるかどうかを判定
  const recordDates = useMemo(() => {
    const set = new Set(records.map(r => r.date));
    return set;
  }, [records]);

  // 選択日の記録一覧
  const selectedRecords = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().slice(0, 10);
    return records.filter(r => r.date === dateStr);
  }, [records, selectedDate]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">記録カレンダー</h2>
      <Calendar
        onChange={date => setSelectedDate(date as Date)}
        value={selectedDate}
        tileContent={({ date, view }) => {
          if (view === 'month') {
            const dateStr = date.toISOString().slice(0, 10);
            if (recordDates.has(dateStr)) {
              return <span className="inline-block ml-1 w-2 h-2 rounded-full bg-blue-500 align-middle" title="記録あり"></span>;
            }
          }
          return null;
        }}
      />
      {selectedDate && (
        <div className="mt-6">
          <h3 className="font-bold mb-2">{selectedDate.toLocaleDateString()} の記録</h3>
          {selectedRecords.length === 0 ? (
            <div className="text-gray-500">記録はありません</div>
          ) : (
            <ul className="space-y-1">
              {selectedRecords.map((rec, i) => {
                const field = fields.find(f => f.fieldId === rec.fieldId);
                return (
                  <li key={i} className="border-b pb-1 flex items-center gap-2">
                    <span className="font-bold">{field ? field.name : rec.fieldId}:</span>
                    <span>{typeof rec.value === 'boolean' ? (rec.value ? 'あり' : 'なし') : rec.value}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 