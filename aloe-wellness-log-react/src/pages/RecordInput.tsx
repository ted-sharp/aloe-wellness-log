import React, { useEffect, useState } from 'react';
import { useRecordsStore } from '../store/records';
import type { Field, RecordItem } from '../types/record';

const FIELD_TYPES = [
  { value: 'number', label: '数値' },
  { value: 'string', label: '文字列' },
  { value: 'boolean', label: '有無' },
] as const;

type NewField = {
  name: string;
  type: 'number' | 'string' | 'boolean';
  unit?: string;
};

export default function RecordInput() {
  const { fields, loadFields, addRecord, addField, loadRecords, updateField, records } = useRecordsStore();
  const [values, setValues] = useState<Record<string, any>>({});
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<NewField>({ name: '', type: 'number', unit: '' });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editField, setEditField] = useState<Partial<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validate = () => {
    for (const field of fields) {
      const val = values[field.fieldId];
      if (field.type === 'number') {
        if (val === undefined || val === '' || isNaN(Number(val))) {
          return `${field.name}は数値で入力してください`;
        }
      } else if (field.type === 'string') {
        if (val === undefined || val === '') {
          return `${field.name}を入力してください`;
        }
      }
      // boolean型は未入力でもOK
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
    const now = new Date();
    for (const field of fields) {
      await addRecord({
        id: `${now.toISOString()}-${field.fieldId}`,
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        datetime: now.toISOString(),
        fieldId: field.fieldId,
        value: values[field.fieldId] ?? '',
      });
    }
    setToast('記録を保存しましたわ');
    setTimeout(() => setToast(null), 2000);
    setValues({});
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
    });
    setNewField({ name: '', type: 'number', unit: '' });
    setShowAddField(false);
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
  const getLastValue = (fieldId: string): any => {
    const rec = [...records].reverse().find(r => r.fieldId === fieldId);
    return rec ? rec.value : '';
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        {fields.map((field) => (
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
                      value={field.type === 'boolean' ? undefined : values[field.fieldId] ?? ''}
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
        {showAddField ? (
          <form onSubmit={handleAddField} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newField.name}
              onChange={e => setNewField(f => ({ ...f, name: e.target.value }))}
              placeholder="項目名"
              className="border rounded px-2 py-1 w-32"
              required
            />
            <select
              value={newField.type}
              onChange={e => setNewField(f => ({ ...f, type: e.target.value as NewField['type'] }))}
              className="border rounded px-2 py-1"
            >
              {FIELD_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={newField.unit}
              onChange={e => setNewField(f => ({ ...f, unit: e.target.value }))}
              placeholder="単位(任意)"
              className="border rounded px-2 py-1 w-20"
            />
            <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium transition-colors">✅ 追加</button>
            <button type="button" onClick={() => setShowAddField(false)} className="ml-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-2 rounded font-medium text-gray-700 transition-colors">❌ キャンセル</button>
            {addFieldError && <span className="text-red-500 ml-2">{addFieldError}</span>}
          </form>
        ) : (
          <button onClick={() => setShowAddField(true)} className="bg-green-100 hover:bg-green-200 border border-green-300 px-4 py-2 rounded font-medium text-green-700 transition-colors">➕ 新しい項目を追加</button>
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
