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
          <div key={field.fieldId} className="flex items-center gap-2">
            {editFieldId === field.fieldId ? (
              <>
                <input
                  type="text"
                  value={editField.name ?? ''}
                  onChange={e => setEditField(f => ({ ...f, name: e.target.value }))}
                  className="border rounded px-2 py-1 w-32"
                />
                <input
                  type="text"
                  value={editField.unit ?? ''}
                  onChange={e => setEditField(f => ({ ...f, unit: e.target.value }))}
                  className="border rounded px-2 py-1 w-20"
                  placeholder="単位"
                />
                <button type="button" onClick={handleEditFieldSave} className="text-green-600">保存</button>
                <button type="button" onClick={() => setEditFieldId(null)} className="text-gray-500">キャンセル</button>
              </>
            ) : (
              <>
                <label className="block font-bold mb-1 w-32">{field.name}</label>
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
                  className="border rounded px-2 py-1"
                />
                {field.unit && <span className="ml-2">{field.unit}</span>}
                <button
                  type="button"
                  className="ml-2 bg-gray-200 px-2 py-1 rounded text-sm"
                  onClick={() => setValues(v => ({ ...v, [field.fieldId]: getLastValue(field.fieldId) }))}
                >
                  前回と同じ
                </button>
                <button type="button" onClick={() => handleEditField(field)} className="text-blue-600 ml-2">編集</button>
              </>
            )}
          </div>
        ))}
        {formError && <div className="text-red-500 font-bold">{formError}</div>}
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          記録する
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
            <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded">追加</button>
            <button type="button" onClick={() => setShowAddField(false)} className="text-gray-500">キャンセル</button>
            {addFieldError && <span className="text-red-500 ml-2">{addFieldError}</span>}
          </form>
        ) : (
          <button onClick={() => setShowAddField(true)} className="bg-gray-200 px-3 py-1 rounded">+ 新しい項目を追加</button>
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