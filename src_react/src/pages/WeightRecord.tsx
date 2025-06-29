import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiBars3,
  HiCheck,
  HiEye,
  HiEyeSlash,
  HiNoSymbol,
  HiTrash,
  HiXMark,
} from 'react-icons/hi2';
import { PiChartLineDown } from 'react-icons/pi';
import Button from '../components/Button';
import DatePickerBar from '../components/DatePickerBar';
import { useRecordsStore } from '../store/records';

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
};
const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const WeightRecord: React.FC = () => {
  const today = new Date();
  const [centerDate, setCenterDate] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const {
    fields,
    addRecord,
    updateRecord,
    deleteRecord,
    records,
    addField,
    loadRecords,
    deleteField,
    updateField,
    loadFields,
  } = useRecordsStore();

  // 新規項目追加用state
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('');
  const [addFieldError, setAddFieldError] = useState('');

  // D&D sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // 日付・時刻文字列
  const recordDate = formatDate(selectedDate);
  const formatLocalTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  const recordTime = formatLocalTime(selectedDate);

  // 既存記録の取得
  const getNumberRecord = (fieldId: string) =>
    records.find(r => r.fieldId === fieldId && r.date === recordDate);

  // 入力値ローカルstate
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [timeValues, setTimeValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const newNotes: Record<string, string> = {};
    const newTimes: Record<string, string> = {};
    fields.forEach(f => {
      const rec = getNumberRecord(f.fieldId);
      newNotes[f.fieldId] = rec && rec.note ? rec.note : '';
      newTimes[f.fieldId] = rec && rec.time ? rec.time : '08:00';
    });
    setNoteValues(newNotes);
    setTimeValues(newTimes);
  }, [fields, records, recordDate]);

  // 保存
  const handleSave = async (fieldId: string) => {
    const value = inputValues[fieldId];
    const note = noteValues[fieldId] || '';
    const time = timeValues[fieldId] || '08:00';
    if (!value) return;
    const numValue = Number(value);
    if (isNaN(numValue)) return;
    const rec = getNumberRecord(fieldId);
    if (rec) {
      await updateRecord({ ...rec, value: numValue, note, time });
    } else {
      const now = new Date();
      await addRecord({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fieldId,
        value: numValue,
        date: recordDate,
        time,
        datetime: formatLocalDateTime(now),
        note,
      });
    }
    await loadRecords();
  };
  // 削除
  const handleDelete = async (fieldId: string) => {
    const rec = getNumberRecord(fieldId);
    if (rec) {
      if (window.confirm('本当に削除しますか？')) {
        await deleteRecord(rec.id);
        await loadRecords();
      }
    }
  };

  // 新規数値項目追加
  const handleAddField = async () => {
    setAddFieldError('');
    const name = newFieldName.trim();
    const unit = newFieldUnit.trim();
    if (!name) {
      setAddFieldError('項目名を入力してください');
      return;
    }
    if (fields.some(f => f.name === name)) {
      setAddFieldError('同じ名前の項目が既に存在します');
      return;
    }
    const fieldId = `custom_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;
    const newField = {
      fieldId,
      name,
      unit,
      type: 'number' as const,
      order: (fields.length + 1) * 10,
      defaultDisplay: true,
      scope: 'weight' as const,
    };
    await addField(newField);
    setShowAddField(false);
    setNewFieldName('');
    setNewFieldUnit('');
  };

  // 編集モード用の追加state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const caretPosRef = useRef<{ [key: string]: { start: number; end: number } }>(
    {}
  );
  useEffect(() => {
    if (!editingFieldId) return;
    const input = inputRefs.current[editingFieldId];
    if (input) {
      const pos = caretPosRef.current[editingFieldId] ?? {
        start: input.value.length,
        end: input.value.length,
      };
      input.setSelectionRange(pos.start, pos.end);
    }
  }, [editingFieldId]);

  // D&Dハンドル付きSortableItem
  const SortableItem = React.memo(function SortableItem({
    field,
    isEditing,
    onStartEdit,
    onEndEdit,
    onNameChange,
    onUnitChange,
    onDelete,
    onToggleDisplay,
    inputRef,
    unitInputRef,
  }: {
    field: (typeof fields)[number];
    isEditing: boolean;
    onStartEdit: () => void;
    onEndEdit: () => void;
    onNameChange: (name: string) => void;
    onUnitChange: (unit: string) => void;
    onDelete: () => void;
    onToggleDisplay: () => void;
    inputRef:
      | React.RefObject<HTMLInputElement>
      | ((el: HTMLInputElement | null) => void);
    unitInputRef:
      | React.RefObject<HTMLInputElement>
      | ((el: HTMLInputElement | null) => void);
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: field.fieldId });
    const style: React.CSSProperties = {
      ...(isDragging
        ? { transform: CSS.Transform.toString(transform), transition }
        : {}),
      opacity: isDragging ? 0.5 : 1,
      background: isDragging ? '#f3f4f6' : undefined,
    };
    const [draft, setDraft] = React.useState(field.name);
    const [draftUnit, setDraftUnit] = React.useState(field.unit || '');
    React.useEffect(() => {
      if (isEditing) {
        setDraft(field.name);
        setDraftUnit(field.unit || '');
      }
    }, [isEditing, field.name, field.unit]);
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 rounded-xl shadow p-4 mb-2 transition-colors ${
          field.defaultDisplay === false
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
        }`}
      >
        {isEditing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                const start = e.target.selectionStart ?? e.target.value.length;
                const end = e.target.selectionEnd ?? e.target.value.length;
                caretPosRef.current[field.fieldId] = { start, end };
              }}
              onSelect={e => {
                const target = e.target as HTMLInputElement;
                caretPosRef.current[field.fieldId] = {
                  start: target.selectionStart ?? target.value.length,
                  end: target.selectionEnd ?? target.value.length,
                };
              }}
              onBlur={() => {
                onNameChange(draft);
                onEndEdit();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onNameChange(draft);
                  onEndEdit();
                }
              }}
              className={`flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg font-semibold min-w-[5em] bg-inherit ${
                field.defaultDisplay === false
                  ? 'border-gray-200 dark:border-gray-600 text-gray-400 bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
              }`}
            />
            <input
              ref={unitInputRef}
              type="text"
              value={draftUnit}
              onChange={e => setDraftUnit(e.target.value)}
              onBlur={() => onUnitChange(draftUnit)}
              placeholder="単位"
              className="w-20 border rounded-lg px-2 py-2 ml-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-inherit border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            />
          </>
        ) : (
          <>
            <span
              className="flex-1 text-lg font-semibold min-w-[5em] cursor-pointer"
              onClick={onStartEdit}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') onStartEdit();
              }}
              role="button"
              aria-label="項目名を編集"
              tabIndex={0}
            >
              {field.name}
            </span>
            {field.unit && (
              <span className="ml-2 text-gray-500 dark:text-gray-300 whitespace-nowrap">
                {field.unit}
              </span>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                '本当に削除しますか？\n（保存すると確定されます。）'
              )
            ) {
              onDelete();
            }
          }}
          className="text-red-500 hover:text-red-700 p-2"
          aria-label="削除"
        >
          <HiTrash className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={onToggleDisplay}
          className={`p-2 ${
            field.defaultDisplay === false
              ? 'text-gray-400 hover:text-blue-400'
              : 'text-blue-500 hover:text-blue-700'
          }`}
          aria-label={
            field.defaultDisplay === false
              ? '表示項目にする'
              : '非表示項目にする'
          }
        >
          {field.defaultDisplay === false ? (
            <HiEyeSlash className="w-6 h-6" />
          ) : (
            <HiEye className="w-6 h-6" />
          )}
        </button>
        <span
          className="cursor-move p-2"
          aria-label="並び替えハンドル"
          style={{ touchAction: 'none' }}
          {...attributes}
          {...listeners}
          tabIndex={0}
        >
          <HiBars3 className="w-6 h-6 text-gray-400" />
        </span>
      </div>
    );
  });

  // その日付にnumber型の記録が1つでもあればtrue
  const isRecorded = (date: Date) => {
    const d = formatDate(date);
    // scope: 'weight' のフィールドIDだけを対象に
    const weightFieldIds = fields
      .filter(f => f.scope === 'weight')
      .map(f => f.fieldId);
    return records.some(
      r => r.date === d && weightFieldIds.includes(r.fieldId)
    );
  };

  // 新規追加用state
  const [newWeight, setNewWeight] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newNote, setNewNote] = useState('');

  // 編集状態管理
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editTime, setEditTime] = useState('08:00');
  const [editNote, setEditNote] = useState('');

  // 編集開始
  const startEdit = (rec: any) => {
    setEditingId(rec.id);
    setEditWeight(String(rec.value));
    setEditTime(rec.time || '08:00');
    setEditNote(rec.note || '');
  };
  // 編集キャンセル
  const cancelEdit = () => {
    setEditingId(null);
    setEditWeight('');
    setEditTime('08:00');
    setEditNote('');
  };
  // 編集保存
  const saveEdit = async (rec: any) => {
    await updateRecord({
      ...rec,
      value: Number(editWeight),
      time: editTime,
      note: editNote,
    });
    setEditingId(null);
    setEditWeight('');
    setEditTime('08:00');
    setEditNote('');
    await loadRecords();
  };

  const numberFields = useMemo(
    () =>
      fields
        .filter(
          f => f.type === 'number' && f.scope === 'weight' && f.defaultDisplay
        )
        .slice()
        .sort((a, b) => {
          if (a.order !== b.order) return (a.order ?? 0) - (b.order ?? 0);
          return a.fieldId.localeCompare(b.fieldId);
        }),
    [fields]
  );

  // newTimeのuseState初期値を現在時刻に
  const getCurrentTimeString = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-800 dark:to-gray-900">
      <DatePickerBar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        centerDate={centerDate}
        setCenterDate={setCenterDate}
        isRecorded={isRecorded}
      />
      <div className="w-full max-w-md mx-auto mt-3 mb-3 flex justify-start pl-4">
        <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          {formatDate(selectedDate)}
        </span>
      </div>
      <div className="flex flex-col items-center justify-start min-h-[60vh]">
        <div className="flex flex-col gap-6 w-full max-w-md">
          {numberFields.map(field => {
            // 同日・同項目の全記録を取得
            const recordsOfDay = records
              .filter(r => r.fieldId === field.fieldId && r.date === recordDate)
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

            return (
              <div
                key={field.fieldId}
                className="flex flex-col gap-4 bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4"
              >
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200 min-w-[5em] mb-2">
                  {field.name}
                </span>
                {/* 既存記録リスト */}
                {recordsOfDay.length > 0 &&
                  recordsOfDay.map(rec => {
                    return (
                      <div
                        key={rec.id}
                        className="flex flex-col gap-1 w-full relative"
                      >
                        {/* 1行目: 時刻・体重・操作ボタン群 */}
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="time"
                            className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                            defaultValue={rec.time || '08:00'}
                            onBlur={async e => {
                              if (e.target.value !== rec.time) {
                                await updateRecord({
                                  ...rec,
                                  time: e.target.value,
                                });
                                await loadRecords();
                              }
                            }}
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[7em]"
                            defaultValue={rec.value}
                            onBlur={async e => {
                              if (Number(e.target.value) !== rec.value) {
                                await updateRecord({
                                  ...rec,
                                  value: Number(e.target.value),
                                });
                                await loadRecords();
                              }
                            }}
                          />
                          <div className="flex gap-1 ml-auto">
                            <Button
                              variant="danger"
                              size="sm"
                              icon={HiTrash}
                              aria-label="削除"
                              onClick={async () => {
                                if (window.confirm('本当に削除しますか？')) {
                                  await deleteRecord(rec.id);
                                  await loadRecords();
                                }
                              }}
                              children=""
                            />
                            <Button
                              variant={
                                rec.excludeFromGraph === true
                                  ? 'secondary'
                                  : 'sky'
                              }
                              size="sm"
                              aria-label={
                                rec.excludeFromGraph === true
                                  ? 'グラフ除外'
                                  : 'グラフ表示'
                              }
                              onClick={async () => {
                                await updateRecord({
                                  ...rec,
                                  excludeFromGraph: !rec.excludeFromGraph,
                                });
                                await loadRecords();
                              }}
                            >
                              <span className="relative inline-block w-5 h-5">
                                <PiChartLineDown className="w-5 h-5 text-white" />
                                {rec.excludeFromGraph === true && (
                                  <HiNoSymbol className="w-5 h-5 text-red-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                                )}
                              </span>
                            </Button>
                          </div>
                        </div>
                        {/* 2行目: note欄 */}
                        <textarea
                          className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full mt-1"
                          rows={1}
                          defaultValue={rec.note || ''}
                          onBlur={async e => {
                            if ((e.target.value || '') !== (rec.note || '')) {
                              await updateRecord({
                                ...rec,
                                note: e.target.value,
                              });
                              await loadRecords();
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                {/* 新規追加欄 */}
                <div className="flex flex-col gap-1 w-full mt-2">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="time"
                      className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[7em]"
                      value={newWeight}
                      onChange={e => setNewWeight(e.target.value)}
                      placeholder={
                        field.unit ? `例: 0.0 (${field.unit})` : '例: 0.0'
                      }
                    />
                    <Button
                      variant="success"
                      size="sm"
                      icon={HiCheck}
                      aria-label="保存"
                      className="ml-auto"
                      onClick={async () => {
                        if (!newWeight) return;
                        await addRecord({
                          id: `${Date.now()}-${Math.random()
                            .toString(36)
                            .substr(2, 9)}`,
                          fieldId: field.fieldId,
                          value: Number(newWeight),
                          date: recordDate,
                          time: newTime,
                          datetime: formatLocalDateTime(new Date()),
                          note: newNote,
                        });
                        setNewWeight('');
                        setNewTime(getCurrentTimeString());
                        setNewNote('');
                        await loadRecords();
                      }}
                      children=""
                    />
                  </div>
                  <textarea
                    className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full mt-1"
                    rows={1}
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="補足・メモ（任意）"
                  />
                </div>
              </div>
            );
          })}
        </div>
        {/* 新規項目追加ボタンとフォーム（編集モード時のみ） */}
        {showAddField && (
          <div className="w-full max-w-md mt-6 mb-2">
            <div className="flex items-center gap-2 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <input
                type="text"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="新しい項目名"
                maxLength={20}
              />
              <input
                type="text"
                value={newFieldUnit}
                onChange={e => setNewFieldUnit(e.target.value)}
                className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="単位"
                maxLength={10}
              />
              <Button
                variant="primary"
                size="md"
                icon={HiCheck}
                aria-label="保存"
                onClick={handleAddField}
                disabled={!newFieldName.trim()}
              >
                {''}
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={HiXMark}
                aria-label="キャンセル"
                onClick={() => {
                  setShowAddField(false);
                  setNewFieldName('');
                  setNewFieldUnit('');
                  setAddFieldError('');
                }}
              >
                {''}
              </Button>
            </div>
            {addFieldError && (
              <div className="text-red-500 text-sm mt-1">{addFieldError}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightRecord;
