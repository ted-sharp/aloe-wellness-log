import React, { useEffect } from 'react';
import { useRecordsStore } from '../store/records';

export default function RecordList() {
  const { records, fields, loadRecords, loadFields } = useRecordsStore();

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // fieldIdから項目名を取得
  const getFieldName = (fieldId: string) => {
    const field = fields.find(f => f.fieldId === fieldId);
    return field ? field.name : fieldId;
  };

  // 日付・時刻ごとにグループ化
  const grouped = records.reduce((acc, rec) => {
    const key = `${rec.date} ${rec.time}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {} as Record<string, typeof records>);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">記録一覧</h2>
      {Object.entries(grouped).length === 0 && <p>記録がありませんわ。</p>}
      {Object.entries(grouped).map(([datetime, recs]) => (
        <div key={datetime} className="mb-6">
          <div className="font-semibold mb-2">{datetime}</div>
          <ul className="space-y-1">
            {recs.map((rec) => (
              <li key={rec.id} className="border-b pb-1">
                <span className="font-bold">{getFieldName(rec.fieldId)}:</span>{' '}
                <span>
                  {typeof rec.value === 'boolean'
                    ? rec.value
                      ? 'あり'
                      : 'なし'
                    : rec.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
} 