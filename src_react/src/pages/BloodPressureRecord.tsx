import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  HiBars3,
  HiCheck,
  HiCheckCircle,
  HiEye,
  HiEyeSlash,
  HiPencil,
  HiPlus,
  HiTrash,
  HiXMark,
} from 'react-icons/hi2';
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

const BloodPressureRecord: React.FC = () => {
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

  // 編集モード用state
  const [isEditMode, setIsEditMode] = useState(false);
  const bpFields = useMemo(
    () =>
      isEditMode
        ? fields
            .filter(f => f.type === 'number' && f.scope === 'bp')
            .slice()
            .sort((a, b) => {
              if (a.order !== b.order) return (a.order ?? 0) - (b.order ?? 0);
              return a.fieldId.localeCompare(b.fieldId);
            })
        : fields
            .filter(
              f => f.type === 'number' && f.scope === 'bp' && f.defaultDisplay
            )
            .slice()
            .sort((a, b) => {
              if (a.order !== b.order) return (a.order ?? 0) - (b.order ?? 0);
              return a.fieldId.localeCompare(b.fieldId);
            }),
    [fields, isEditMode]
  );
  const [editFields, setEditFields] = useState(() =>
    bpFields.map(f => ({ ...f }))
  );
  const [editOrder, setEditOrder] = useState(() =>
    bpFields.map(f => f.fieldId)
  );
  const [editDelete, setEditDelete] = useState<string[]>([]);

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
  const getBPRecord = (fieldId: string) =>
    records.find(r => r.fieldId === fieldId && r.date === recordDate);

  // 入力値ローカルstate
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  useEffect(() => {
    // 日付変更やレコード更新時に既存値を反映
    const newValues: Record<string, string> = {};
    bpFields.forEach(f => {
      const rec = getBPRecord(f.fieldId);
      newValues[f.fieldId] = rec ? String(rec.value) : '';
    });
    setInputValues(newValues);
  }, [fields, isEditMode, records, recordDate, bpFields]);

  // 保存
  const handleSave = async (fieldId: string) => {
    const value = inputValues[fieldId];
    if (!value) return;
    const numValue = Number(value);
    if (isNaN(numValue)) return;
    const rec = getBPRecord(fieldId);
    if (rec) {
      await updateRecord({ ...rec, value: numValue });
    } else {
      const now = new Date();
      await addRecord({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fieldId,
        value: numValue,
        date: recordDate,
        time: recordTime,
        datetime: formatLocalDateTime(now),
      });
    }
    await loadRecords();
  };
  // 削除
  const handleDelete = async (fieldId: string) => {
    const rec = getBPRecord(fieldId);
    if (rec) {
      await deleteRecord(rec.id);
      await loadRecords();
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
    if (fields.some(f => f.name === name && f.scope === 'bp')) {
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
      scope: 'bp' as const,
    };
    await addField(newField);
    // 編集モード中なら即時ローカルstateにも反映
    if (isEditMode) {
      setEditFields(fields => [...fields, { ...newField }]);
      setEditOrder(order => [...order, fieldId]);
    }
    setShowAddField(false);
    setNewFieldName('');
    setNewFieldUnit('');
  };

  // 編集モード切替時に最新フィールドで初期化
  useEffect(() => {
    if (isEditMode) {
      const allBPFields = fields
        .filter(f => f.type === 'number' && f.scope === 'bp')
        .slice()
        .sort((a, b) => {
          if (a.order !== b.order) return (a.order ?? 0) - (b.order ?? 0);
          return a.fieldId.localeCompare(b.fieldId);
        });
      setEditFields(allBPFields.map(f => ({ ...f })));
      setEditOrder(allBPFields.map(f => f.fieldId));
      setEditDelete([]);
    }
  }, [isEditMode, fields]);

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
    field: (typeof editFields)[number];
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

  // 編集内容保存
  const handleEditSave = async () => {
    for (const delId of editDelete) {
      await deleteField(delId);
    }
    for (let i = 0; i < editOrder.length; ++i) {
      const f = editFields.find(f => f.fieldId === editOrder[i]);
      if (f) {
        await updateField({ ...f, order: i * 10 });
      }
    }
    await loadFields();
    setIsEditMode(false);
  };
  const handleEditCancel = () => {
    setIsEditMode(false);
  };
  const handleDragEnd = (event: import('@dnd-kit/core').DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId !== overId) {
      const oldIdx = editOrder.indexOf(activeId);
      const newIdx = editOrder.indexOf(overId);
      setEditOrder(arrayMove(editOrder, oldIdx, newIdx));
    }
  };
  const handleDeleteField = useCallback((fieldId: string) => {
    setEditDelete(list => [...list, fieldId]);
    setEditFields(fields => fields.filter(f => f.fieldId !== fieldId));
  }, []);
  const handleToggleDisplay = useCallback((fieldId: string) => {
    setEditFields(fields =>
      fields.map(f =>
        f.fieldId === fieldId ? { ...f, defaultDisplay: !f.defaultDisplay } : f
      )
    );
  }, []);

  // 入力済み日付かどうか判定
  const isRecorded = (date: Date) => {
    return records.some(
      r =>
        r.date === formatDate(date) &&
        bpFields.some(f => f.fieldId === r.fieldId)
    );
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
      {/* 選択中の日付表示 */}
      <div className="w-full max-w-md mx-auto mt-3 mb-3 flex justify-start pl-4">
        <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          {formatDate(selectedDate)}
          {isRecorded(selectedDate) && (
            <HiCheck
              className="inline-block w-6 h-6 text-green-500 ml-2 align-middle"
              aria-label="入力済み"
            />
          )}
        </span>
      </div>
      <div className="flex flex-col items-center justify-start min-h-[60vh]">
        <div className="flex flex-col gap-6 w-full max-w-md">
          {isEditMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={editOrder}
                strategy={verticalListSortingStrategy}
              >
                {editOrder.map(id => {
                  const field = editFields.find(f => f.fieldId === id);
                  if (!field) return null;
                  const isEditing = editingFieldId === field.fieldId;
                  return (
                    <SortableItem
                      key={field.fieldId}
                      field={field}
                      isEditing={isEditing}
                      onStartEdit={() => setEditingFieldId(field.fieldId)}
                      onEndEdit={() => setEditingFieldId(null)}
                      onNameChange={name =>
                        setEditFields(fields =>
                          fields.map(f =>
                            f.fieldId === field.fieldId ? { ...f, name } : f
                          )
                        )
                      }
                      onUnitChange={unit =>
                        setEditFields(fields =>
                          fields.map(f =>
                            f.fieldId === field.fieldId ? { ...f, unit } : f
                          )
                        )
                      }
                      onDelete={() => handleDeleteField(field.fieldId)}
                      onToggleDisplay={() => handleToggleDisplay(field.fieldId)}
                      inputRef={el => (inputRefs.current[field.fieldId] = el)}
                      unitInputRef={() => {}}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : (
            bpFields.map(field => {
              const value = inputValues[field.fieldId] ?? '';
              return (
                <div
                  key={field.fieldId}
                  className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow p-4"
                >
                  <span className="text-lg font-semibold text-gray-700 dark:text-gray-200 min-w-[5em]">
                    {field.name}
                  </span>
                  <div className="flex flex-1 min-w-0 items-center">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200"
                      value={value}
                      onChange={e =>
                        setInputValues(v => ({
                          ...v,
                          [field.fieldId]: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        if (value) {
                          handleSave(field.fieldId);
                        } else {
                          handleDelete(field.fieldId);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (value) {
                            handleSave(field.fieldId);
                          } else {
                            handleDelete(field.fieldId);
                          }
                        }
                      }}
                      placeholder={
                        field.unit ? `例: 0.0 (${field.unit})` : '例: 0.0'
                      }
                    />
                    {field.unit && (
                      <span className="ml-2 text-gray-500 dark:text-gray-300 whitespace-nowrap shrink-0 overflow-hidden">
                        {field.unit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* 新規項目追加ボタンとフォーム（編集モード時のみ） */}
        {isEditMode && (
          <div className="w-full max-w-md mt-6 mb-2">
            {showAddField ? (
              <div className="flex items-center gap-2 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex flex-1 min-w-0 gap-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="新しい項目名"
                    maxLength={20}
                  />
                  <input
                    type="text"
                    value={newFieldUnit}
                    onChange={e => setNewFieldUnit(e.target.value)}
                    className="w-20 shrink-0 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="単位"
                    maxLength={10}
                  />
                </div>
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
            ) : (
              <Button
                variant="teal"
                size="md"
                icon={HiPlus}
                fullWidth
                onClick={() => setShowAddField(true)}
              >
                新規項目
              </Button>
            )}
            {addFieldError && (
              <div className="text-red-500 text-sm mt-1">{addFieldError}</div>
            )}
          </div>
        )}
        {/* 編集モード切替・保存・キャンセルボタン */}
        <div className="w-full max-w-md mt-6">
          {isEditMode ? (
            <div className="flex gap-2">
              <Button
                variant="success"
                size="md"
                icon={HiCheckCircle}
                onClick={handleEditSave}
                fullWidth
              >
                保存
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={HiXMark}
                onClick={handleEditCancel}
                fullWidth
              >
                キャンセル
              </Button>
            </div>
          ) : (
            <Button
              variant="teal"
              size="md"
              icon={HiPencil}
              fullWidth
              onClick={() => setIsEditMode(true)}
            >
              編集
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BloodPressureRecord;
