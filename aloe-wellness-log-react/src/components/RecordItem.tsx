import React, { memo, useCallback } from 'react';
import {
  HiCheckCircle,
  HiPencil,
  HiTrash,
  HiXCircle,
  HiXMark,
} from 'react-icons/hi2';
import type { Field, RecordItem as RecordItemType } from '../types/record';

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

const RecordItem: React.FC<RecordItemProps> = memo(
  ({
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
    onToggleButtons,
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

    const handleToggleExpansion = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleTextExpansion(record.id);
      },
      [onToggleTextExpansion, record.id]
    );

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onEditValueChange(e.target.value);
      },
      [onEditValueChange]
    );

    const handleBooleanChange = useCallback(
      (value: boolean | undefined) => {
        onEditValueChange(value ?? '');
      },
      [onEditValueChange]
    );

    return (
      <li className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
        {isEditing ? (
          // 編集モード
          <div>
            {field?.fieldId === 'notes' ? (
              // 備考編集は左寄せレイアウト（通常表示と同じ）
              <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
                <div className="text-xl font-medium text-gray-700 pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 flex-shrink-0 pb-2 sm:pb-0">
                  {field ? field.name : record.fieldId}
                </div>
                <div className="pl-0 sm:pl-2 flex-1 min-w-0 pt-2 sm:pt-0">
                  {field?.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBooleanChange(true)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                          editValue === true
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                        aria-label={`${field.name}をありに設定`}
                      >
                        あり
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBooleanChange(false)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                          editValue === false
                            ? 'bg-red-100 border-red-500 text-red-700'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                        aria-label={`${field.name}をなしに設定`}
                      >
                        なし
                      </button>
                      {editValue !== undefined && editValue !== '' && (
                        <button
                          type="button"
                          onClick={() => handleBooleanChange(undefined)}
                          className="px-2 py-1.5 rounded-lg border-2 border-gray-300 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex-shrink-0"
                          aria-label={`${field.name}の選択をクリア`}
                          title="選択をクリア"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={String(editValue)}
                      onChange={handleInputChange}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full h-24 resize-none"
                    />
                  )}
                </div>
              </div>
            ) : (
              // 備考以外は二分割グリッドレイアウト
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch mb-4">
                <div className="text-xl font-medium text-gray-700 text-left sm:text-right pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 pb-2 sm:pb-0">
                  {field ? field.name : record.fieldId}
                </div>
                <div className="pl-0 sm:pl-2 pt-2 sm:pt-0">
                  {field?.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBooleanChange(true)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                          editValue === true
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                        aria-label={`${field.name}をありに設定`}
                      >
                        あり
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBooleanChange(false)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                          editValue === false
                            ? 'bg-red-100 border-red-500 text-red-700'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                        aria-label={`${field.name}をなしに設定`}
                      >
                        なし
                      </button>
                      {editValue !== undefined && editValue !== '' && (
                        <button
                          type="button"
                          onClick={() => handleBooleanChange(undefined)}
                          className="px-2 py-1.5 rounded-lg border-2 border-gray-300 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex-shrink-0"
                          aria-label={`${field.name}の選択をクリア`}
                          title="選択をクリア"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ) : (
                    <input
                      type={field?.type === 'number' ? 'number' : 'text'}
                      value={String(editValue)}
                      onChange={handleInputChange}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full"
                    />
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 sm:gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleEditSave}
                className="bg-green-600 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium flex items-center gap-1.5 text-sm sm:text-base flex-1 sm:min-w-[120px] justify-center"
              >
                <HiCheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                保存
              </button>
              <button
                onClick={handleEditCancel}
                className="bg-gray-400 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-1.5 text-sm sm:text-base flex-1 sm:min-w-[120px] justify-center"
              >
                <HiXMark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          // 表示モード
          <div>
            {field?.fieldId === 'notes' ? (
              // 備考は縦棒区切りの左寄せレイアウト（カレンダーと同じ）
              <div
                className="flex flex-col sm:flex-row items-stretch gap-2 cursor-pointer"
                onClick={handleToggleButtons}
              >
                <div className="text-xl font-medium text-gray-700 pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 flex-shrink-0 pb-2 sm:pb-0">
                  {field ? field.name : record.fieldId}
                </div>
                <div className="text-lg text-gray-800 font-semibold pl-0 sm:pl-2 flex-1 min-w-0 pt-2 sm:pt-0">
                  {typeof record.value === 'string' &&
                  record.value.length > 30 ? (
                    <button
                      onClick={handleToggleExpansion}
                      className="text-left hover:text-blue-600 transition-colors break-words w-full"
                      title="クリックして全文表示"
                    >
                      {isTextExpanded
                        ? record.value
                        : truncateText(record.value)}
                    </button>
                  ) : (
                    <span className="break-words">{record.value}</span>
                  )}
                </div>
              </div>
            ) : (
              // 備考以外は真ん中で区切って右寄せ・左寄せレイアウト
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch cursor-pointer"
                onClick={handleToggleButtons}
              >
                <div className="text-xl font-medium text-gray-700 text-left sm:text-right pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 pb-2 sm:pb-0">
                  {field ? field.name : record.fieldId}
                </div>
                <div className="text-lg text-gray-800 font-semibold pl-0 sm:pl-2 text-left pt-2 sm:pt-0">
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
              <div className="flex gap-2 sm:gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleEdit}
                  className="bg-blue-500 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-1.5 text-sm sm:text-base flex-1 sm:min-w-[120px] justify-center"
                >
                  <HiPencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-1.5 text-sm sm:text-base flex-1 sm:min-w-[120px] justify-center"
                >
                  <HiTrash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  削除
                </button>
              </div>
            )}
          </div>
        )}
      </li>
    );
  }
);

RecordItem.displayName = 'RecordItem';

export default RecordItem;
