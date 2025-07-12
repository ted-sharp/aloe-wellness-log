import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { memo, useEffect, useState } from 'react';
import { HiBars3, HiEye, HiEyeSlash, HiTrash } from 'react-icons/hi2';
import type { DailyFieldV2 } from '../types/record';

interface SortableItemProps {
  field: DailyFieldV2;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onToggleDisplay: () => void;
  inputRef: React.RefObject<HTMLInputElement> | ((el: HTMLInputElement | null) => void);
  onCaretPositionChange?: (fieldId: string, start: number, end: number) => void;
}

const SortableItem = memo(function SortableItem({
  field,
  isEditing,
  onStartEdit,
  onEndEdit,
  onNameChange,
  onDelete,
  onToggleDisplay,
  inputRef,
  onCaretPositionChange,
}: SortableItemProps) {
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

  // draftローカルstateで編集値を保持
  const [draft, setDraft] = useState(field.name);

  // 編集開始時にdraftへコピー
  useEffect(() => {
    if (isEditing) setDraft(field.name);
  }, [isEditing, field.name]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
    const start = e.target.selectionStart ?? e.target.value.length;
    const end = e.target.selectionEnd ?? e.target.value.length;
    onCaretPositionChange?.(field.fieldId, start, end);
  };

  const handleInputSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    onCaretPositionChange?.(field.fieldId, start, end);
  };

  const handleBlur = () => {
    onNameChange(draft);
    onEndEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onNameChange(draft);
      onEndEdit();
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        '本当に削除しますか？\n（保存すると確定されます。）'
      )
    ) {
      onDelete();
    }
  };

  const handleStartEdit = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onStartEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl shadow p-4 mb-2 transition-colors ${
        field.display === false
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
      }`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={handleInputChange}
          onSelect={handleInputSelect}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg font-semibold min-w-[5em] bg-inherit ${
            field.display === false
              ? 'border-gray-200 dark:border-gray-600 text-gray-400 bg-gray-50 dark:bg-gray-800'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
          }`}
          data-testid={`daily-input-${field.fieldId}`}
        />
      ) : (
        <span
          className="flex-1 text-lg font-semibold min-w-[5em] cursor-pointer"
          onClick={onStartEdit}
          onKeyDown={handleStartEdit}
          role="button"
          aria-label="項目名を編集"
          tabIndex={0}
        >
          {field.name}
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        className="text-red-500 hover:text-red-700 p-2"
        aria-label="削除"
        data-testid={`delete-btn-${field.fieldId}`}
      >
        <HiTrash className="w-6 h-6" />
      </button>
      <button
        type="button"
        onClick={onToggleDisplay}
        className={`p-2 ${
          field.display === false
            ? 'text-gray-400 hover:text-blue-400'
            : 'text-blue-500 hover:text-blue-700'
        }`}
        aria-label={
          field.display === false ? '表示項目にする' : '非表示項目にする'
        }
        data-testid={`toggle-btn-${field.fieldId}`}
      >
        {field.display === false ? (
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

export default SortableItem;