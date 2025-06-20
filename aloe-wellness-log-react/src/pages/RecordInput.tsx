import React, { useEffect, useState } from 'react';
import { useRecordsStore } from '../store/records';
import type { Field } from '../types/record';
import {
  HiArrowLeft,
  HiCalendarDays,
  HiClock,
  HiDocumentText,
  HiCheckCircle,
  HiXMark,
  HiPencil,
  HiClipboardDocumentList,
  HiPlus,
  HiTrash
} from 'react-icons/hi2';

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
  const { fields, loadFields, addRecord, addField, loadRecords, updateField, records, deleteField } = useRecordsStore();
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [showSelectField, setShowSelectField] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<NewField>({ name: '', type: 'number', unit: '', order: 1, defaultDisplay: true });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editField, setEditField] = useState<Partial<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingExistingFieldId, setEditingExistingFieldId] = useState<string | null>(null);
  const [editingExistingField, setEditingExistingField] = useState<Partial<Field>>({});

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
    setEditField({
      name: field.name,
      unit: field.unit,
      defaultDisplay: field.defaultDisplay
    });
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
        defaultDisplay: editField.defaultDisplay !== false,
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

  // 既存項目の編集機能
  const handleEditExistingField = (field: Field) => {
    setEditingExistingFieldId(field.fieldId);
    setEditingExistingField({
      name: field.name,
      unit: field.unit,
      order: field.order,
      defaultDisplay: field.defaultDisplay
    });
  };

  const handleEditExistingFieldSave = async () => {
    if (!editingExistingFieldId || !editingExistingField.name?.trim()) {
      setEditingExistingFieldId(null);
      setEditingExistingField({});
      return;
    }
    const original = fields.find(f => f.fieldId === editingExistingFieldId);
    if (original) {
      await updateField({
        ...original,
        name: editingExistingField.name.trim(),
        unit: editingExistingField.unit?.trim() || undefined,
        order: editingExistingField.order || 1,
        defaultDisplay: editingExistingField.defaultDisplay !== false,
      });
      await loadFields();
      setToast('項目を編集しましたわ');
      setTimeout(() => setToast(null), 2000);
    }
    setEditingExistingFieldId(null);
    setEditingExistingField({});
  };

  // 既存項目の削除機能
  const handleDeleteExistingField = async (field: Field) => {
    const isConfirmed = window.confirm(
      `項目「${field.name}」を削除してもよろしいですか？\n\nこの項目に関連するすべての記録データも削除されます。`
    );

    if (isConfirmed) {
      try {
        await deleteField(field.fieldId);
        await loadFields();
        setToast('項目を削除しましたわ');
        setTimeout(() => setToast(null), 2000);
      } catch (error) {
        console.error('削除エラー:', error);
        setToast('項目の削除に失敗しました');
        setTimeout(() => setToast(null), 2000);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-800 mb-12">記録入力</h1>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 mb-12">
        {/* 日時選択セクション */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <HiCalendarDays className="w-6 h-6 text-blue-600" />
              記録日時
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-base font-medium text-gray-700 mb-2">日付</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div className="flex-1">
                <label className="block text-base font-medium text-gray-700 mb-2">時刻</label>
                <input
                  type="time"
                  value={recordTime}
                  onChange={(e) => setRecordTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
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
                  className="bg-amber-400 text-gray-800 px-4 py-2 rounded-lg shadow-md hover:bg-amber-500 transition-colors duration-200 font-medium flex items-center gap-2"
                >
                  <HiClock className="w-5 h-5" />
                  現在時刻
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 備考入力セクション */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <HiDocumentText className="w-6 h-6 text-blue-600" />
              備考・メモ
            </h2>
            <div>
              <textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                placeholder="その時の体調、気づき、特記事項など（任意）"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-600 mt-2">
                {recordNotes.length}/500文字
              </div>
            </div>
          </div>
        </div>

        {[...fields]
          .filter(field => field.defaultDisplay !== false || temporaryDisplayFields.has(field.fieldId))
          .sort((a, b) => (a.order || 999) - (b.order || 999))
          .map((field) => (
          <div key={field.fieldId} className="bg-white p-6 rounded-2xl shadow-md">
            {editFieldId === field.fieldId ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-base font-medium text-gray-700 mb-2">項目名</label>
                    <input
                      type="text"
                      value={editField.name ?? ''}
                      onChange={e => setEditField(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-base font-medium text-gray-700 mb-2">単位</label>
                    <input
                      type="text"
                      value={editField.unit ?? ''}
                      onChange={e => setEditField(f => ({ ...f, unit: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      placeholder="例: kg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editField.defaultDisplay !== false}
                      onChange={e => setEditField(f => ({ ...f, defaultDisplay: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-base font-medium text-gray-700">デフォルトで記録入力画面に表示する</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleEditFieldSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2">
                    <HiCheckCircle className="w-5 h-5" />
                    保存
                  </button>
                  <button type="button" onClick={() => setEditFieldId(null)} className="bg-indigo-500 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 font-medium flex items-center gap-2">
                    <HiXMark className="w-5 h-5" />
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-medium text-gray-800">{field.name}</h3>
                  <button type="button" onClick={() => handleEditField(field)} className="bg-amber-400 text-gray-800 px-4 py-2 rounded-lg shadow-md hover:bg-amber-500 transition-colors duration-200 font-medium flex items-center gap-2">
                    <HiPencil className="w-4 h-4" />
                    編集
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                        : "border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"}
                    />
                    {field.unit && <span className="text-gray-600 font-medium">{field.unit}</span>}
                  </div>
                  <button
                    type="button"
                    className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 font-medium flex items-center gap-2"
                    onClick={() => setValues(v => ({ ...v, [field.fieldId]: getLastValue(field.fieldId) }))}
                  >
                    <HiClipboardDocumentList className="w-4 h-4" />
                    前回値
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {formError && <div className="text-red-600 font-semibold bg-red-50 p-4 rounded-lg border border-red-200">{formError}</div>}

        <button type="submit" className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3">
          <HiDocumentText className="w-6 h-6" />
          記録する
        </button>
      </form>

      <div className="mb-8">
        {showSelectField ? (
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <HiClipboardDocumentList className="w-6 h-6 text-blue-600" />
              項目を選択
            </h3>
            <div className="space-y-4">
              {getHiddenFields().length > 0 && (
                <>
                  <h4 className="text-xl font-medium text-gray-700">既存の項目から選択:</h4>
                  <div className="space-y-3">
                    {getHiddenFields().map((field) => (
                      <div key={field.fieldId} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        {editingExistingFieldId === field.fieldId ? (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">項目名</label>
                                <input
                                  type="text"
                                  value={editingExistingField.name ?? ''}
                                  onChange={e => setEditingExistingField(f => ({ ...f, name: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                  placeholder="項目名"
                                />
                              </div>
                              <div className="w-full sm:w-32">
                                <label className="block text-sm font-medium text-gray-700 mb-1">単位（任意）</label>
                                <input
                                  type="text"
                                  value={editingExistingField.unit ?? ''}
                                  onChange={e => setEditingExistingField(f => ({ ...f, unit: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                  placeholder="例: kg"
                                />
                              </div>
                              <div className="w-full sm:w-20">
                                <label className="block text-sm font-medium text-gray-700 mb-1">表示順序</label>
                                <input
                                  type="number"
                                  value={editingExistingField.order || ''}
                                  onChange={e => setEditingExistingField(f => ({ ...f, order: parseInt(e.target.value) || 1 }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                  placeholder="1"
                                  min="1"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingExistingField.defaultDisplay !== false}
                                  onChange={e => setEditingExistingField(f => ({ ...f, defaultDisplay: e.target.checked }))}
                                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">デフォルトで記録入力画面に表示する</span>
                              </label>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button type="button" onClick={handleEditExistingFieldSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2">
                                <HiCheckCircle className="w-4 h-4" />
                                保存
                              </button>
                              <button type="button" onClick={() => setEditingExistingFieldId(null)} className="bg-indigo-500 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 font-medium flex items-center gap-2">
                                <HiXMark className="w-4 h-4" />
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="text-lg font-medium text-gray-800">{field.name}</span>
                              {field.unit && <span className="text-gray-600 ml-2">({field.unit})</span>}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleShowExistingField(field.fieldId)}
                                className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 font-medium flex items-center gap-2"
                              >
                                <HiPlus className="w-4 h-4" />
                                一時表示
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditExistingField(field)}
                                className="bg-amber-400 text-gray-800 px-4 py-2 rounded-lg shadow-md hover:bg-amber-500 transition-colors duration-200 font-medium flex items-center gap-2"
                              >
                                <HiPencil className="w-4 h-4" />
                                編集
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingField(field)}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition-colors duration-200 font-medium flex items-center gap-2"
                              >
                                <HiTrash className="w-4 h-4" />
                                削除
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {showAddField && (
                <form onSubmit={handleAddField} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-xl font-medium text-gray-700 mb-4">新しい項目を追加:</h4>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">項目名 *</label>
                        <input
                          type="text"
                          value={newField.name}
                          onChange={e => setNewField(f => ({ ...f, name: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          placeholder="例: 体重"
                          required
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">データ型 *</label>
                        <select
                          value={newField.type}
                          onChange={e => setNewField(f => ({ ...f, type: e.target.value as 'number' | 'string' | 'boolean' }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        >
                          {FIELD_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">単位（任意）</label>
                        <input
                          type="text"
                          value={newField.unit}
                          onChange={e => setNewField(f => ({ ...f, unit: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          placeholder="例: kg"
                        />
                      </div>
                      <div className="w-full sm:w-20">
                        <label className="block text-sm font-medium text-gray-700 mb-1">表示順序</label>
                        <input
                          type="number"
                          value={newField.order || ''}
                          onChange={e => setNewField(f => ({ ...f, order: parseInt(e.target.value) || 1 }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          placeholder="1"
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newField.defaultDisplay}
                          onChange={e => setNewField(f => ({ ...f, defaultDisplay: e.target.checked }))}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">デフォルトで記録入力画面に表示する</span>
                      </label>
                    </div>
                    {addFieldError && <div className="text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-200">{addFieldError}</div>}
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2">
                        <HiPlus className="w-4 h-4" />
                        追加
                      </button>
                      <button type="button" onClick={() => setShowAddField(false)} className="bg-indigo-500 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 font-medium flex items-center gap-2">
                        <HiXMark className="w-4 h-4" />
                        キャンセル
                      </button>
                    </div>
                  </div>
                </form>
              )}
              <div className="flex gap-3 pt-4">
                {!showAddField && (
                  <button
                    type="button"
                    onClick={() => setShowAddField(true)}
                    className="bg-amber-400 text-gray-800 px-4 py-2 rounded-lg shadow-md hover:bg-amber-500 transition-colors duration-200 font-medium flex items-center gap-2"
                  >
                    <HiPlus className="w-4 h-4" />
                    新しい項目を追加
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSelectField(false)}
                  className="bg-indigo-500 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 font-medium flex items-center gap-2"
                >
                  <HiArrowLeft className="w-5 h-5" />
                  戻る
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSelectField(true)}
            className="bg-indigo-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 font-medium flex items-center gap-2"
          >
            <HiClipboardDocumentList className="w-5 h-5" />
            項目を選択・追加
          </button>
        )}
      </div>
    </div>
  );
}
