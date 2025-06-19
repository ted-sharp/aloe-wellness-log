import React, { useEffect, useState } from 'react';
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';

export default function RecordList() {
  const { records, fields, loadRecords, loadFields, updateRecord, deleteRecord } = useRecordsStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number | boolean>('');

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // fieldIdから項目名・型を取得
  const getField = (fieldId: string) => {
    if (fieldId === 'notes') {
      return { fieldId: 'notes', name: '📝 備考', type: 'string' as const, order: 0 };
    }
    return fields.find(f => f.fieldId === fieldId);
  };

  // 項目の順序を制御する関数
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

  // 日付・時刻で降順ソート（新しい順）
  const sortedRecords = [...records].sort((a, b) => {
    const aKey = `${a.date} ${a.time}`;
    const bKey = `${b.date} ${b.time}`;
    return bKey.localeCompare(aKey);
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

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h2 className="text-xl font-bold mb-4">記録一覧</h2>
      {Object.entries(grouped).length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
          <p>記録がありませんわ。</p>
        </div>
      )}
      {Object.entries(grouped).map(([datetime, recs]) => (
        <div key={datetime} className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="font-semibold text-lg text-gray-800 mb-4 border-b border-gray-200 pb-2">
            📅 {datetime}
          </div>
          <ul className="space-y-3">
            {sortRecordsByFieldOrder(recs).map((rec) => {
              const field = getField(rec.fieldId);
              return (
                <li key={rec.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between hover:bg-gray-100 transition-colors">
                  {editId === rec.id ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-700">{field ? field.name : rec.fieldId}:</span>
                        <input
                          type={field?.type === 'number' ? 'number' : field?.type === 'boolean' ? 'checkbox' : 'text'}
                          value={field?.type === 'boolean' ? undefined : String(editValue)}
                          checked={field?.type === 'boolean' ? !!editValue : undefined}
                          onChange={e =>
                            setEditValue(
                              field?.type === 'boolean' ? e.currentTarget.checked : e.currentTarget.value
                            )
                          }
                          className="border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditSave(rec)} className="bg-green-100 hover:bg-green-200 border border-green-300 px-3 py-1.5 rounded text-sm font-medium text-green-700 transition-colors">💾 保存</button>
                        <button onClick={() => setEditId(null)} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1.5 rounded text-sm font-medium text-gray-700 transition-colors">❌ キャンセル</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-700">{field ? field.name : rec.fieldId}:</span>
                        <span className="text-gray-900 font-semibold">
                          {typeof rec.value === 'boolean'
                            ? rec.value
                              ? 'あり'
                              : 'なし'
                            : rec.value}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(rec)} className="bg-blue-100 hover:bg-blue-200 border border-blue-300 px-3 py-1.5 rounded text-sm font-medium text-blue-700 transition-colors">✏️ 編集</button>
                        <button onClick={() => handleDelete(rec)} className="bg-red-100 hover:bg-red-200 border border-red-300 px-3 py-1.5 rounded text-sm font-medium text-red-700 transition-colors">🗑️ 削除</button>
                      </div>
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
