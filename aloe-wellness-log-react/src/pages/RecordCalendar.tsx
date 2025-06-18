import React, { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';

export default function RecordCalendar() {
  const { records, fields, loadRecords, loadFields } = useRecordsStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // fieldIdから項目名・型を取得（RecordListと同じ関数）
  const getField = (fieldId: string) => {
    if (fieldId === 'notes') {
      return { fieldId: 'notes', name: '📝 備考', type: 'string' as const, order: 0 };
    }
    return fields.find(f => f.fieldId === fieldId);
  };

  // 項目の順序を制御する関数（RecordListと同じ関数）
  const sortRecordsByFieldOrder = (records: RecordItem[]) => {
    return [...records].sort((a, b) => {
      const fieldA = getField(a.fieldId);
      const fieldB = getField(b.fieldId);

      // order属性で並び替え（小さいほど上に表示）
      const orderA = fieldA?.order ?? 999;
      const orderB = fieldB?.order ?? 999;

      return orderA - orderB;
    });
  };

  // 日付ごとに記録があるかどうかを判定
  const recordDates = useMemo(() => {
    const set = new Set(records.map(r => r.date));
    return set;
  }, [records]);

  // 選択日の記録一覧
  const selectedRecords = useMemo(() => {
    if (!selectedDate) return [];
    // タイムゾーンを考慮した日付文字列を作成
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return records.filter(r => r.date === dateStr);
  }, [records, selectedDate]);

  // 選択日の記録を時刻ごとにグループ化
  const groupedSelectedRecords = useMemo(() => {
    if (selectedRecords.length === 0) return {};

    // 時刻で降順ソート（新しい順）
    const sortedRecords = [...selectedRecords].sort((a, b) => {
      const aKey = `${a.date} ${a.time}`;
      const bKey = `${b.date} ${b.time}`;
      return bKey.localeCompare(aKey);
    });

    // 日付・時刻ごとにグループ化
    return sortedRecords.reduce((acc, rec) => {
      const key = `${rec.date} ${rec.time}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    }, {} as Record<string, RecordItem[]>);
  }, [selectedRecords]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">記録カレンダー</h2>
      <Calendar
        onChange={date => setSelectedDate(date as Date)}
        value={selectedDate}
        tileContent={({ date, view }) => {
          if (view === 'month') {
            // タイムゾーンを考慮した日付文字列を作成
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            if (recordDates.has(dateStr)) {
              return <span className="inline-block ml-1 w-2 h-2 rounded-full bg-blue-500 align-middle" title="記録あり"></span>;
            }
          }
          return null;
        }}
      />
      {selectedDate && (
        <div className="mt-6">
          <h3 className="font-bold mb-4 text-lg">{selectedDate.toLocaleDateString()} の記録</h3>
          {selectedRecords.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              <p>この日の記録はありませんわ。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSelectedRecords).map(([datetime, recs]) => (
                <div key={datetime} className="bg-white rounded-lg shadow-md p-6">
                  <div className="font-semibold text-lg text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    🕐 {recs[0].time}
                  </div>
                  <ul className="space-y-3">
                    {sortRecordsByFieldOrder(recs).map((rec) => {
                      const field = getField(rec.fieldId);
                      return (
                        <li key={rec.id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 hover:bg-gray-100 transition-colors">
                          <span className="font-medium text-gray-700">{field ? field.name : rec.fieldId}:</span>
                          <span className="text-gray-900 font-semibold">
                            {typeof rec.value === 'boolean'
                              ? rec.value
                                ? 'あり'
                                : 'なし'
                              : rec.value}
                            {field?.unit && typeof rec.value !== 'boolean' && <span className="text-gray-600 ml-1">{field.unit}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
