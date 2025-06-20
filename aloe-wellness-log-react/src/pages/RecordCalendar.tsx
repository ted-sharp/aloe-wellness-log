import React, { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';
import {
  HiClock
} from 'react-icons/hi2';

export default function RecordCalendar() {
  const { records, fields, loadRecords, loadFields } = useRecordsStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // fieldIdから項目名・型を取得（RecordListと同じ関数）
  const getField = (fieldId: string) => {
    if (fieldId === 'notes') {
      return { fieldId: 'notes', name: '備考', type: 'string' as const, order: 0 };
    }
    return fields.find(f => f.fieldId === fieldId);
  };

  // テキスト省略機能のヘルパー関数
  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleTextExpansion = (recordId: string) => {
    setExpandedTexts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const isTextExpanded = (recordId: string) => {
    return expandedTexts.has(recordId);
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-800 mb-12">記録カレンダー</h1>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <style>{`
          .react-calendar {
            width: 100%;
            background: transparent;
            border: none;
            font-family: inherit;
          }
          .react-calendar__tile {
            padding: 12px 8px;
            background: transparent;
            border-radius: 8px;
            transition: all 0.2s;
          }
          .react-calendar__tile:enabled:hover,
          .react-calendar__tile:enabled:focus {
            background-color: #dbeafe;
          }
          .react-calendar__tile--active {
            background: #2563eb !important;
            color: white;
          }
          .react-calendar__navigation button {
            color: #374151;
            font-weight: 500;
            font-size: 16px;
            padding: 8px 16px;
          }
          .react-calendar__navigation button:enabled:hover,
          .react-calendar__navigation button:enabled:focus {
            background-color: #f3f4f6;
            border-radius: 8px;
          }
          .react-calendar__month-view__weekdays {
            font-weight: 600;
            color: #6b7280;
          }
        `}</style>
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
                return <span className="inline-block ml-1 w-2 h-2 rounded-full bg-blue-600 align-middle" title="記録あり"></span>;
              }
            }
            return null;
          }}
        />
      </div>

      {selectedDate && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-8">{selectedDate.toLocaleDateString()} の記録</h2>
          {selectedRecords.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-6 text-center text-gray-500">
              <p className="text-lg">この日の記録はありませんわ。</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedSelectedRecords).map(([datetime, recs]) => (
                <div key={datetime} className="bg-white rounded-2xl shadow-md p-6">
                  <div className="text-2xl font-semibold text-gray-800 mb-6 border-b border-gray-200 pb-4 flex items-center gap-2">
                    <HiClock className="w-6 h-6 text-blue-600" />
                    {recs[0].time}
                  </div>
                  <ul className="space-y-4">
                    {sortRecordsByFieldOrder(recs).map((rec) => {
                      const field = getField(rec.fieldId);
                      return (
                        <li key={rec.id} className="bg-gray-50 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors duration-200 min-w-0">
                          <span className="text-xl font-medium text-gray-700 flex-shrink-0">{field ? field.name : rec.fieldId}:</span>
                          <div className="text-lg text-gray-800 font-semibold flex-1 min-w-0">
                            {typeof rec.value === 'boolean' ? (
                              rec.value ? 'あり' : 'なし'
                            ) : typeof rec.value === 'string' && rec.value.length > 30 ? (
                              <button
                                onClick={() => toggleTextExpansion(rec.id)}
                                className="text-left hover:text-blue-600 transition-colors break-words w-full"
                                title="クリックして全文表示"
                              >
                                {isTextExpanded(rec.id) ? rec.value : truncateText(rec.value)}
                              </button>
                            ) : (
                              <span className="break-words">{rec.value}</span>
                            )}
                            {field?.unit && typeof rec.value !== 'boolean' && <span className="text-gray-600 ml-2 flex-shrink-0">{field.unit}</span>}
                          </div>
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
