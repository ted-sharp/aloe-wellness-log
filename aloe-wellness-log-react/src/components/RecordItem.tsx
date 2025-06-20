import React, { memo, useCallback } from 'react';
import type { RecordItem as RecordItemType, Field } from '../types/record';
import {
  HiCheckCircle,
  HiXMark,
  HiXCircle,
  HiPencil,
  HiTrash
} from 'react-icons/hi2';

interface RecordItemProps {
  record: RecordItemType;
  field: Field | undefined;
  editId: string | null;
  editValue: string | number | boolean;
  expandedTexts: Set<string>;
  showButtons: Set<string>;
  onEdit: (record: RecordItemType) => void;
  onEditSave: (record: RecordItemType) => void;
  onEditCancel: (recordId: string) => void;
  onDelete: (record: RecordItemType) => void;
  onEditValueChange: (value: string | number | boolean) => void;
  onToggleTextExpansion: (recordId: string) => void;
  onToggleButtons: (recordId: string) => void;
}

// テキスト省略機能のヘルパー関数
const truncateText = (text: string, maxLength: number = 30) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const RecordItem: React.FC<RecordItemProps> = memo(({
  record,
  field,
  editId,
  editValue,
  expandedTexts,
  showButtons,
  onEdit,
  onEditSave,
  onEditCancel,
  onDelete,
  onEditValueChange,
  onToggleTextExpansion,
  onToggleButtons
}) => {
  const isEditing = editId === record.id;
  const isTextExpanded = expandedTexts.has(record.id);
  const areButtonsShown = showButtons.has(record.id);

  const handleToggleButtons = useCallback(() => {
    onToggleButtons(record.id);
  }, [onToggleButtons, record.id]);

  const handleEdit = useCallback(() => {
    onEdit(record);
  }, [onEdit, record]);

  const handleEditSave = useCallback(() => {
    onEditSave(record);
  }, [onEditSave, record]);

  const handleEditCancel = useCallback(() => {
    onEditCancel(record.id);
  }, [onEditCancel, record.id]);

  const handleDelete = useCallback(() => {
    onDelete(record);
  }, [onDelete, record]);

  const handleToggleExpansion = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTextExpansion(record.id);
  }, [onToggleTextExpansion, record.id]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (field?.type === 'boolean') {
      onEditValueChange((e.target as HTMLInputElement).checked);
    } else {
      onEditValueChange(e.target.value);
    }
  }, [field?.type, onEditValueChange]);

  return (
    <li className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
      {isEditing ? (
        // 編集モード
        <div>
          {field?.fieldId === 'notes' ? (
            // 備考編集は左寄せレイアウト（通常表示と同じ）
            <div className="flex items-stretch gap-2 mb-4">
              <div className="text-xl font-medium text-gray-700 pr-2 border-r border-gray-200 flex-shrink-0">
                {field ? field.name : record.fieldId}
              </div>
              <div className="pl-2 flex-1 min-w-0">
                <textarea
                  value={String(editValue)}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full h-24 resize-none"
                />
              </div>
            </div>
          ) : (
            // 備考以外は二分割グリッドレイアウト
            <div className="grid grid-cols-2 gap-2 items-stretch mb-4">
              <div className="text-xl font-medium text-gray-700 text-right pr-2 border-r border-gray-200">
                {field ? field.name : record.fieldId}
              </div>
              <div className="pl-2">
                <input
                  type={field?.type === 'number' ? 'number' : field?.type === 'boolean' ? 'checkbox' : 'text'}
                  value={field?.type === 'boolean' ? undefined : String(editValue)}
                  checked={field?.type === 'boolean' ? !!editValue : undefined}
                  onChange={handleInputChange}
                  className={field?.type === 'boolean'
                    ? "w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 block"
                    : "border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"}
                />
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
            <button onClick={handleEditSave} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium flex items-center gap-2">
              <HiCheckCircle className="w-4 h-4" />
              保存
            </button>
            <button onClick={handleEditCancel} className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2">
              <HiXMark className="w-4 h-4" />
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        // 表示モード
        <div>
          {field?.fieldId === 'notes' ? (
            // 備考は縦棒区切りの左寄せレイアウト（カレンダーと同じ）
            <div className="flex items-stretch gap-2 cursor-pointer" onClick={handleToggleButtons}>
              <div className="text-xl font-medium text-gray-700 pr-2 border-r border-gray-200 flex-shrink-0">
                {field ? field.name : record.fieldId}
              </div>
              <div className="text-lg text-gray-800 font-semibold pl-2 flex-1 min-w-0">
                {typeof record.value === 'string' && record.value.length > 30 ? (
                  <button
                    onClick={handleToggleExpansion}
                    className="text-left hover:text-blue-600 transition-colors break-words max-w-80"
                    title="クリックして全文表示"
                  >
                    {isTextExpanded ? record.value : truncateText(record.value)}
                  </button>
                ) : (
                  <span className="break-words">{record.value}</span>
                )}
              </div>
            </div>
          ) : (
            // 備考以外は真ん中で区切って右寄せ・左寄せレイアウト
            <div className="grid grid-cols-2 gap-2 items-stretch cursor-pointer" onClick={handleToggleButtons}>
              <div className="text-xl font-medium text-gray-700 text-right pr-2 border-r border-gray-200">
                {field ? field.name : record.fieldId}
              </div>
              <div className="text-lg text-gray-800 font-semibold pl-2 text-left">
                {typeof record.value === 'boolean' ? (
                  record.value ? (
                    <span className="inline-flex items-center gap-2 text-green-600">
                      <HiCheckCircle className="w-6 h-6" />
                      あり
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-red-600">
                      <HiXCircle className="w-6 h-6" />
                      なし
                    </span>
                  )
                ) : (
                  <span className="break-words">
                    {record.value}
                    {field?.unit && typeof record.value !== 'boolean' && (
                      <span className="text-gray-600 ml-1">{field.unit}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 編集・削除ボタン（クリックで表示/非表示） */}
          {areButtonsShown && (
            <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
              <button onClick={handleEdit} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2">
                <HiPencil className="w-4 h-4" />
                編集
              </button>
              <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-2">
                <HiTrash className="w-4 h-4" />
                削除
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
});

RecordItem.displayName = 'RecordItem';

export default RecordItem;
