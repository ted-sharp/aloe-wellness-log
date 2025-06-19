import React, { useEffect, useState } from 'react';
import { useRecordsStore } from '../store/records';
import type { Field } from '../types/record';

const FIELD_TYPES = [
  { value: 'number', label: '数値' },
  { value: 'string', label: '文字列' },
  { value: 'boolean', label: '有無' },
] as const;

type NewField = {
  name: string;
  type: 'number' | 'string' | 'boolean';
  unit?: string;
  order?: number;
  defaultDisplay?: boolean;
};

export default function RecordInput() {
  const { fields, loadFields, addRecord, addField, loadRecords, updateField, records } = useRecordsStore();
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [showSelectField, setShowSelectField] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<NewField>({ name: '', type: 'number', unit: '', order: 1, defaultDisplay: true });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editField, setEditField] = useState<Partial<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 一時的に表示する項目のIDを管理
  const [temporaryDisplayFields, setTemporaryDisplayFields] = useState<Set<string>>(new Set());

  // 日時管理用のstate（デフォルトは現在時刻）
  const [recordDate, setRecordDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [recordTime, setRecordTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM
  });

  // 備考管理用のstate
  const [recordNotes, setRecordNotes] = useState<string>('');

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  const handleChange = (fieldId: string, value: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // 項目が入力されているかどうかを判定する関数
  const hasValue = (field: Field, value: string | number | boolean | undefined): boolean => {
    if (field.type === 'number') {
      return value !== undefined && value !== '' && !isNaN(Number(value));
    } else if (field.type === 'string') {
      return value !== undefined && value !== '' && String(value).trim() !== '';
    } else if (field.type === 'boolean') {
      return value === true; // チェックされている場合のみ
    }
    return false;
  };

  const validate = () => {
    // 入力された項目のみバリデーション
    for (const field of fields) {
      const val = values[field.fieldId];
      if (hasValue(field, val)) {
        if (field.type === 'number' && isNaN(Number(val))) {
          return `${field.name}は正しい数値で入力してください`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    try {
      // 選択された日時を使用
      const selectedDateTime = new Date(`${recordDate}T${recordTime}:00`);
      // より一意性を保つために現在のタイムスタンプを追加
      const uniqueTimestamp = Date.now();

      // 入力された項目のみ保存
      for (const field of fields) {
        const value = values[field.fieldId];

        // 入力されている項目のみ記録
        if (hasValue(field, value)) {
          await addRecord({
            id: `${selectedDateTime.toISOString()}-${field.fieldId}-${uniqueTimestamp}`,
            date: recordDate,
            time: recordTime,
            datetime: selectedDateTime.toISOString(),
            fieldId: field.fieldId,
            value: value,
          });
        }
      }

      // 備考が入力されている場合、備考も保存
      if (recordNotes.trim()) {
        await addRecord({
          id: `${selectedDateTime.toISOString()}-notes-${uniqueTimestamp}`,
          date: recordDate,
          time: recordTime,
          datetime: selectedDateTime.toISOString(),
          fieldId: 'notes',
          value: recordNotes.trim(),
        });
      }

      setToast('記録を保存いたしましたわ');
      setTimeout(() => setToast(null), 2000);

      // defaultDisplay: false の項目のみクリア、defaultDisplay: true の項目は保持
      setValues(prev => {
        const newValues: Record<string, string | number | boolean> = {};
        for (const field of fields) {
          if (field.defaultDisplay !== false && prev[field.fieldId] !== undefined) {
            newValues[field.fieldId] = prev[field.fieldId];
          }
        }
        return newValues;
      });

      // 一時表示項目をクリア
      setTemporaryDisplayFields(new Set());
      setRecordNotes('');
    } catch (error) {
      console.error('保存エラー:', error);
      setFormError('保存に失敗いたしましたわ。もう一度お試しくださいませ。');
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFieldError(null);
    if (!newField.name.trim()) {
      setAddFieldError('項目名を入力してください');
      return;
    }
    if (fields.some(f => f.name === newField.name.trim())) {
      setAddFieldError('同じ名前の項目が既に存在します');
      return;
    }
    const fieldId = newField.name.trim().replace(/\s+/g, '_').toLowerCase();
    await addField({
      fieldId,
      name: newField.name.trim(),
      type: newField.type,
      unit: newField.unit?.trim() || undefined,
      order: newField.order || 1,
      defaultDisplay: !!newField.defaultDisplay,
    });

    // defaultDisplay: false の項目は一時的に表示リストに追加
    if (!newField.defaultDisplay) {
      setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));
    }

    setNewField({ name: '', type: 'number', unit: '', order: getNextDefaultOrder(), defaultDisplay: true });
    setShowAddField(false);
    setShowSelectField(false);
    await loadFields();
    setToast('項目を追加しましたわ');
    setTimeout(() => setToast(null), 2000);
  };

  const handleEditField = (field: Field) => {
    setEditFieldId(field.fieldId);
    setEditField({ name: field.name, unit: field.unit });
  };

  const handleEditFieldSave = async () => {
    if (!editFieldId || !editField.name?.trim()) {
      setEditFieldId(null);
      setEditField({});
      return;
    }
    const original = fields.find(f => f.fieldId === editFieldId);
    if (original) {
      await updateField({
        ...original,
        name: editField.name.trim(),
        unit: editField.unit?.trim() || undefined,
      });
      await loadFields();
      setToast('項目を編集しましたわ');
      setTimeout(() => setToast(null), 2000);
    }
    setEditFieldId(null);
    setEditField({});
  };

  // 前回値を取得する関数
  const getLastValue = (fieldId: string): string | number | boolean => {
    const rec = [...records].reverse().find(r => r.fieldId === fieldId);
    return rec ? rec.value : '';
  };

  // 次のデフォルト順序を計算する関数
  const getNextDefaultOrder = (): number => {
    if (fields.length === 0) return 1;
    const maxOrder = Math.max(...fields.map(f => f.order || 0));
    return maxOrder + 1;
  };

  // 非表示項目を一時的に表示に追加する関数
  const handleShowExistingField = (fieldId: string) => {
    const field = fields.find(f => f.fieldId === fieldId);
    if (field) {
      // 一時表示リストに追加（defaultDisplayは変更しない）
      setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));
      setShowSelectField(false);
      setToast('項目を一時表示に追加しましたわ');
      setTimeout(() => setToast(null), 2000);
    }
  };

  // 非表示項目のリストを取得
  const getHiddenFields = () => {
    return fields.filter(field => field.defaultDisplay === false);
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        {/* 日時選択セクション */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="space-y-3">
            <label className="text-lg font-semibold text-gray-800">📅 記録日時</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">時刻</label>
                <input
                  type="time"
                  value={recordTime}
                  onChange={(e) => setRecordTime(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setRecordDate(now.toISOString().slice(0, 10));
                    setRecordTime(now.toTimeString().slice(0, 5));
                  }}
                  className="bg-purple-100 hover:bg-purple-200 border border-purple-300 px-4 py-2 rounded font-medium text-purple-700 transition-colors"
                >
                  🕐 現在時刻
                </button>
              </div>
            </div>
          </div>
                </div>

        {/* 備考入力セクション */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="space-y-3">
            <label className="text-lg font-semibold text-gray-800">📝 備考・メモ</label>
            <div>
              <textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                placeholder="その時の体調、気づき、特記事項など（任意）"
                className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {recordNotes.length}/500文字
              </div>
            </div>
          </div>
        </div>

        {[...fields]
          .filter(field => field.defaultDisplay !== false || temporaryDisplayFields.has(field.fieldId)) // デフォルト表示項目または一時表示項目
          .sort((a, b) => (a.order || 999) - (b.order || 999))
          .map((field) => (
          <div key={field.fieldId} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            {editFieldId === field.fieldId ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">項目名</label>
                    <input
                      type="text"
                      value={editField.name ?? ''}
                      onChange={e => setEditField(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                    <input
                      type="text"
                      value={editField.unit ?? ''}
                      onChange={e => setEditField(f => ({ ...f, unit: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例: kg"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={handleEditFieldSave} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium transition-colors">💾 保存</button>
                  <button type="button" onClick={() => setEditFieldId(null)} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium transition-colors">❌ キャンセル</button>
                </div>
              </div>
            ) : (
                            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-semibold text-gray-800">{field.name}</label>
                  <button type="button" onClick={() => handleEditField(field)} className="bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 px-3 py-1.5 rounded text-sm font-medium text-yellow-700 transition-colors w-24">✏️ 編集</button>
                </div>
                                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                                        <input
                      type={field.type === 'number' ? 'number' : field.type === 'boolean' ? 'checkbox' : 'text'}
                      value={field.type === 'boolean' ? undefined : String(values[field.fieldId] ?? '')}
                      checked={field.type === 'boolean' ? !!values[field.fieldId] : undefined}
                      onChange={(e) =>
                        handleChange(
                          field.fieldId,
                          field.type === 'boolean' ? e.currentTarget.checked : e.currentTarget.value
                        )
                      }
                      className={field.type === 'boolean'
                        ? "w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        : "border border-gray-300 rounded px-3 py-2 w-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                    />
                    {field.unit && <span className="text-gray-600 font-medium">{field.unit}</span>}
                  </div>
                  <button
                    type="button"
                    className="bg-blue-100 hover:bg-blue-200 border border-blue-300 px-3 py-1.5 rounded text-sm font-medium text-blue-700 transition-colors w-24"
                    onClick={() => setValues(v => ({ ...v, [field.fieldId]: getLastValue(field.fieldId) }))}
                  >
                    📋 前回値
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {formError && <div className="text-red-500 font-bold">{formError}</div>}
        <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors shadow-md hover:shadow-lg">
          📝 記録する
        </button>
      </form>

      <div className="mb-4">
        {showSelectField ? (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 項目を選択</h3>
            <div className="space-y-3">
              {getHiddenFields().length > 0 && (
                <>
                  <h4 className="font-medium text-gray-700">既存の項目から選択:</h4>
                  <div className="space-y-2">
                    {getHiddenFields().map((field) => (
                      <button
                        key={field.fieldId}
                        onClick={() => handleShowExistingField(field.fieldId)}
                        className="w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-3 rounded font-medium text-blue-800 transition-colors"
                      >
                        ➕ {field.name} {field.unit && `(${field.unit})`}
                      </button>
                    ))}
                  </div>
                  <hr className="my-4" />
                </>
              )}
              <h4 className="font-medium text-gray-700">新しい項目を作成:</h4>
              <button
                onClick={() => {
                  setShowSelectField(false);
                  setShowAddField(true);
                  setNewField({ name: '', type: 'number', unit: '', order: getNextDefaultOrder(), defaultDisplay: true });
                }}
                className="w-full bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-3 rounded font-medium text-green-800 transition-colors"
              >
                ✨ 完全に新しい項目を作成
              </button>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setShowSelectField(false)}
                className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-6 py-2 rounded font-medium text-gray-700 transition-colors"
              >
                ❌ キャンセル
              </button>
            </div>
          </div>
        ) : showAddField ? (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">✨ 新しい項目を作成</h3>
            <form onSubmit={handleAddField} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">項目名</label>
                  <input
                    type="text"
                    value={newField.name}
                    onChange={e => setNewField(f => ({ ...f, name: e.target.value }))}
                    placeholder="例: 血圧"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">データ型</label>
                  <select
                    value={newField.type}
                    onChange={e => setNewField(f => ({ ...f, type: e.target.value as NewField['type'] }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {FIELD_TYPES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-1">単位（任意）</label>
                  <input
                    type="text"
                    value={newField.unit}
                    onChange={e => setNewField(f => ({ ...f, unit: e.target.value }))}
                    placeholder="例: mmHg"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="w-full md:w-20">
                  <label className="block text-sm font-medium text-gray-700 mb-1">表示順序</label>
                  <input
                    type="number"
                    value={newField.order || ''}
                    onChange={e => setNewField(f => ({ ...f, order: parseInt(e.target.value) || 1 }))}
                    placeholder="1"
                    min="1"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newField.defaultDisplay !== false}
                      onChange={e => setNewField(f => ({ ...f, defaultDisplay: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">デフォルトで記録入力画面に表示する</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-medium transition-colors">✅ 追加</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddField(false);
                    setShowSelectField(true);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-6 py-2 rounded font-medium text-gray-700 transition-colors"
                >
                  ⬅️ 戻る
                </button>
              </div>
              {addFieldError && <div className="text-red-500 font-medium mt-2">{addFieldError}</div>}
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowSelectField(true)}
            className="bg-green-100 hover:bg-green-200 border border-green-300 px-4 py-2 rounded font-medium text-green-700 transition-colors"
          >
            ➕ 新しい項目を追加
          </button>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
