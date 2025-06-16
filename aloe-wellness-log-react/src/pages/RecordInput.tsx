import React, { useEffect, useState } from 'react';
import { useRecordsStore } from '../store/records';
import type { Field } from '../types/record';

export default function RecordInput() {
  const { fields, loadFields, addRecord } = useRecordsStore();
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setValues({});
    alert('記録を保存しましたわ');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {fields.map((field) => (
        <div key={field.fieldId}>
          <label className="block font-bold mb-1">{field.name}</label>
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
        </div>
      ))}
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        記録する
      </button>
    </form>
  );
} 