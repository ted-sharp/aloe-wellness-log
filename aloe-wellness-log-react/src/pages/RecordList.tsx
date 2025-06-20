import React, { useEffect, useState } from 'react';
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';
import {
  HiCalendarDays,
  HiCheckCircle,
  HiXMark,
  HiPencil,
  HiTrash
} from 'react-icons/hi2';

export default function RecordList() {
  const { records, fields, loadRecords, loadFields, updateRecord, deleteRecord } = useRecordsStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number | boolean>('');
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // fieldIdから項目名・型を取得
  const getField = (fieldId: string) => {
    if (fieldId === 'notes') {
      return { fieldId: 'notes', name: '備考', type: 'string' as const, order: 0 };
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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-800 mb-12">記録一覧</h1>

      {Object.entries(grouped).length === 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6 text-center text-gray-500">
          <p className="text-lg">記録がありませんわ。</p>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(grouped).map(([datetime, recs]) => (
          <div key={datetime} className="bg-white rounded-2xl shadow-md p-6">
            <div className="text-2xl font-semibold text-gray-800 mb-8 border-b border-gray-200 pb-4 flex items-center gap-2">
              <HiCalendarDays className="w-6 h-6 text-blue-600" />
              {datetime}
            </div>
            <ul className="space-y-4">
              {sortRecordsByFieldOrder(recs).map((rec) => {
                const field = getField(rec.fieldId);
                return (
                  <li key={rec.id} className="bg-gray-50 rounded-lg p-4 flex items-start gap-4 hover:bg-gray-100 transition-colors duration-200">
                    {editId === rec.id ? (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                            <span className="text-xl font-medium text-gray-700 flex-shrink-0">{field ? field.name : rec.fieldId}:</span>
                            <input
                              type={field?.type === 'number' ? 'number' : field?.type === 'boolean' ? 'checkbox' : 'text'}
                              value={field?.type === 'boolean' ? undefined : String(editValue)}
                              checked={field?.type === 'boolean' ? !!editValue : undefined}
                              onChange={e =>
                                setEditValue(
                                  field?.type === 'boolean' ? e.currentTarget.checked : e.currentTarget.value
                                )
                              }
                              className={field?.type === 'boolean'
                                ? "w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                : "border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 flex-1 min-w-0"}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 flex-shrink-0">
                          <button onClick={() => handleEditSave(rec)} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium flex items-center gap-2">
                            <HiCheckCircle className="w-4 h-4" />
                            保存
                          </button>
                          <button onClick={() => setEditId(null)} className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2">
                            <HiXMark className="w-4 h-4" />
                            キャンセル
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-3">
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
                          </div>
                        </div>
                        <div className="flex gap-3 flex-shrink-0">
                          <button onClick={() => handleEdit(rec)} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2">
                            <HiPencil className="w-4 h-4" />
                            編集
                          </button>
                          <button onClick={() => handleDelete(rec)} className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-2">
                            <HiTrash className="w-4 h-4" />
                            削除
                          </button>
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
    </div>
  );
}
