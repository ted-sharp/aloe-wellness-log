import React, { useEffect } from 'react';
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';

function formatDateForFilename(date: Date) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 15);
}

function toCSV(records: RecordItem[], fields: { fieldId: string; name: string }[]) {
  const header = ['id', 'date', 'time', 'datetime', 'fieldId', 'fieldName', 'value'];
  const rows = records.map(rec => {
    const field = fields.find(f => f.fieldId === rec.fieldId);
    return [
      rec.id,
      rec.date,
      rec.time,
      rec.datetime,
      rec.fieldId,
      field ? field.name : '',
      typeof rec.value === 'boolean' ? (rec.value ? 'あり' : 'なし') : rec.value
    ];
  });
  return [header, ...rows].map(row => row.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export default function RecordExport() {
  const { records, fields, loadRecords, loadFields } = useRecordsStore();

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // 日付・時刻で降順ソート（新しい順）
  const sortedRecords = [...records].sort((a, b) => {
    const aKey = `${a.date} ${a.time}`;
    const bKey = `${b.date} ${b.time}`;
    return bKey.localeCompare(aKey);
  });

  const handleExportCSV = () => {
    const csv = toCSV(sortedRecords, fields);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `records-${formatDateForFilename(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(sortedRecords, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `records-${formatDateForFilename(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

    return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">エクスポート</h2>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">データ詳細</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>📊 <strong>対象レコード数:</strong> {sortedRecords.length}件</p>
          <p>📅 <strong>期間:</strong> {sortedRecords.length > 0
            ? `${sortedRecords[sortedRecords.length - 1]?.date} 〜 ${sortedRecords[0]?.date}`
            : 'データなし'}</p>
          <p>📋 <strong>対象項目:</strong> すべての健康記録項目</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">エクスポート</h3>
        <div className="flex gap-4">
          <button
            onClick={handleExportCSV}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
          >
            📊 CSV形式でダウンロード
          </button>
          <button
            onClick={handleExportJSON}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
          >
            📄 JSON形式でダウンロード
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>• CSV形式: Excel等での分析に適しています</p>
          <p>• JSON形式: プログラムでの処理やバックアップに適しています</p>
        </div>
      </div>
    </div>
  );
}
