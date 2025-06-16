import React, { useEffect, useState } from 'react';
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

export default function RecordList() {
  const { records, fields, loadRecords, loadFields, updateRecord, deleteRecord } = useRecordsStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [filterField, setFilterField] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // fieldIdから項目名・型を取得
  const getField = (fieldId: string) => fields.find(f => f.fieldId === fieldId);

  // フィルタ適用
  const filteredRecords = filterField
    ? records.filter(rec => rec.fieldId === filterField)
    : records;

  // 日付・時刻でソート
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const aKey = `${a.date} ${a.time}`;
    const bKey = `${b.date} ${b.time}`;
    return sortAsc ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
  });

  // 日付・時刻ごとにグループ化
  const grouped = sortedRecords.reduce((acc, rec) => {
    const key = `${rec.date} ${rec.time}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {} as Record<string, RecordItem[]>);

  const handleEdit = (rec: RecordItem) => {
    setEditId(rec.id);
    setEditValue(rec.value);
  };

  const handleEditSave = async (rec: RecordItem) => {
    await updateRecord({ ...rec, value: editValue });
    setEditId(null);
    setEditValue('');
  };

  const handleDelete = async (rec: RecordItem) => {
    if (window.confirm('本当に削除してよろしいですか？')) {
      await deleteRecord(rec.id);
    }
  };

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
      <h2 className="text-xl font-bold mb-4">記録一覧</h2>
      <div className="flex gap-4 mb-4 items-center">
        <label>
          項目フィルタ：
          <select
            value={filterField}
            onChange={e => setFilterField(e.target.value)}
            className="border rounded px-2 py-1 ml-2"
          >
            <option value="">すべて</option>
            {fields.map(f => (
              <option key={f.fieldId} value={f.fieldId}>{f.name}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setSortAsc(s => !s)}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          日付ソート: {sortAsc ? '昇順' : '降順'}
        </button>
        <button
          onClick={handleExportCSV}
          className="bg-green-500 text-white px-3 py-1 rounded"
        >
          CSVエクスポート
        </button>
        <button
          onClick={handleExportJSON}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          JSONエクスポート
        </button>
      </div>
      {Object.entries(grouped).length === 0 && <p>記録がありませんわ。</p>}
      {Object.entries(grouped).map(([datetime, recs]) => (
        <div key={datetime} className="mb-6">
          <div className="font-semibold mb-2">{datetime}</div>
          <ul className="space-y-1">
            {recs.map((rec) => {
              const field = getField(rec.fieldId);
              return (
                <li key={rec.id} className="border-b pb-1 flex items-center gap-2">
                  <span className="font-bold">{field ? field.name : rec.fieldId}:</span>{' '}
                  {editId === rec.id ? (
                    <>
                      <input
                        type={field?.type === 'number' ? 'number' : field?.type === 'boolean' ? 'checkbox' : 'text'}
                        value={field?.type === 'boolean' ? undefined : editValue}
                        checked={field?.type === 'boolean' ? !!editValue : undefined}
                        onChange={e =>
                          setEditValue(
                            field?.type === 'boolean' ? e.currentTarget.checked : e.currentTarget.value
                          )
                        }
                        className="border rounded px-2 py-1"
                      />
                      <button onClick={() => handleEditSave(rec)} className="text-green-600 ml-2">保存</button>
                      <button onClick={() => setEditId(null)} className="text-gray-500 ml-1">キャンセル</button>
                    </>
                  ) : (
                    <>
                      <span>
                        {typeof rec.value === 'boolean'
                          ? rec.value
                            ? 'あり'
                            : 'なし'
                          : rec.value}
                      </span>
                      <button onClick={() => handleEdit(rec)} className="text-blue-600 ml-2">編集</button>
                      <button onClick={() => handleDelete(rec)} className="text-red-600 ml-1">削除</button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
} 