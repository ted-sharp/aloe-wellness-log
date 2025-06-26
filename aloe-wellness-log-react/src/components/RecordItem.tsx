import React, { memo, useCallback } from 'react';
import {
  HiCheckCircle,
  HiPencil,
  HiTrash,
  HiXCircle,
  HiXMark,
} from 'react-icons/hi2';
import { useI18n } from '../hooks/useI18n';
import type { Field, RecordItem as RecordItemType } from '../types/record';
import { truncateText } from '../utils/textUtils';

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
  onToggleExclude: (record: RecordItemType) => void;
}

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
    onToggleExclude,
  }) => {
    const { t, getAriaLabel } = useI18n();
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
      <li className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
        {isEditing ? (
          <div>
            {field?.fieldId === 'notes' ? (
              <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
                <div className="text-xl font-medium text-gray-700 dark:text-gray-200 pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-600 flex-shrink-0 pb-2 sm:pb-0">
                  {field ? field.name : record.fieldId}
                </div>
                <div className="pl-0 sm:pl-2 flex-1 min-w-0 pt-2 sm:pt-0">
                  {field?.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleBooleanChange(
                            editValue === true ? undefined : true
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                          editValue === true
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        aria-label={getAriaLabel('setToYes', {
                          fieldName: field.name,
                        })}
                      >
                        {t('fields.yes')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleBooleanChange(
                            editValue === false ? undefined : false
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                          editValue === false
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        aria-label={getAriaLabel('setToNo', {
                          fieldName: field.name,
                        })}
                      >
                        {t('fields.no')}
                      </button>
                    </div>
                  ) : (
                    <textarea
                      value={String(editValue)}
                      onChange={handleInputChange}
                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400 w-full h-24 resize-none"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 items-center mb-4">
                <div className="text-xl font-medium text-gray-700 dark:text-gray-200 text-left sm:text-right pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-600 pb-2 sm:pb-0">
                  {field ? field.name : record.fieldId}
                </div>
                <div className="pl-0 sm:pl-2 pt-2 sm:pt-0">
                  {field?.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleBooleanChange(
                            editValue === true ? undefined : true
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                          editValue === true
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        aria-label={getAriaLabel('setToYes', {
                          fieldName: field.name,
                        })}
                      >
                        {t('fields.yes')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleBooleanChange(
                            editValue === false ? undefined : false
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                          editValue === false
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        aria-label={getAriaLabel('setToNo', {
                          fieldName: field.name,
                        })}
                      >
                        {t('fields.no')}
                      </button>
                    </div>
                  ) : (
                    <input
                      type={field?.type === 'number' ? 'number' : 'text'}
                      value={String(editValue)}
                      onChange={handleInputChange}
                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400 w-full"
                    />
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onToggleExclude(record)}
                    className={
                      (record.excludeFromGraph
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 border-2'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600') +
                      ' min-w-[48px] h-10 px-0 text-sm rounded-lg border-2 font-medium'
                    }
                    aria-label={t('pages.input.excludeFromGraphShort')}
                  >
                    {t('pages.input.excludeFromGraphShort') || '除外'}
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2 sm:gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleEditSave}
                className="bg-green-600 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium flex items-center gap-1.5 text-sm sm:text-base flex-1 sm:min-w-[120px] justify-center"
              >
                <HiCheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('actions.save')}
              </button>
              <button
                onClick={handleEditCancel}
                className="bg-gray-400 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-1.5 text-sm sm:text-base flex-1 sm:min-w-[120px] justify-center"
              >
                <HiXMark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('actions.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {field?.fieldId === 'notes' ? (
              <div
                className="flex flex-col sm:flex-row items-stretch gap-2 cursor-pointer"
                onClick={handleToggleButtons}
              >
                <div className="text-xl font-medium text-gray-700 dark:text-gray-200 pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-600 flex-shrink-0 pb-2 sm:pb-0">
                  {field ? field.name : record.fieldId}
                </div>
                <div className="text-lg text-gray-800 dark:text-gray-200 font-semibold pl-0 sm:pl-2 flex-1 min-w-0 pt-2 sm:pt-0">
                  {typeof record.value === 'string' &&
                  record.value.length > 30 ? (
                    <button
                      onClick={handleToggleExpansion}
                      className="text-left hover:text-blue-600 transition-colors break-words w-full"
                      title={t('common.clickToExpand')}
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
              <div
                className="grid grid-cols-3 gap-2 items-center cursor-pointer"
                onClick={handleToggleButtons}
              >
                <div className="text-xl font-medium text-gray-700 dark:text-gray-200 text-left sm:text-right pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-600 pb-2 sm:pb-0">
                  {field ? field.name : record.fieldId}
                </div>
                <div className="text-lg text-gray-800 dark:text-gray-200 font-semibold pl-0 sm:pl-2 text-left pt-2 sm:pt-0">
                  {typeof record.value === 'boolean' ? (
                    record.value ? (
                      <span className="inline-flex items-center gap-2 text-green-600">
                        <HiCheckCircle className="w-6 h-6" />
                        {t('fields.yes')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-red-600">
                        <HiXCircle className="w-6 h-6" />
                        {t('fields.no')}
                      </span>
                    )
                  ) : (
                    <span className="break-words">
                      {record.value}
                      {field?.unit && typeof record.value !== 'boolean' && (
                        <span className="text-gray-600 dark:text-gray-400 ml-1">
                          {field.unit}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex justify-end">
                  <span
                    className={
                      (record.excludeFromGraph
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 border-2'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300') +
                      ' min-w-[48px] h-10 px-0 text-sm rounded-lg border-2 font-medium flex items-center justify-center select-none'
                    }
                    aria-label={t('pages.input.excludeFromGraphShort')}
                  >
                    {t('pages.input.excludeFromGraphShort') || '除外'}
                  </span>
                </div>
              </div>
            )}

            {areButtonsShown && (
              <div className="flex gap-2 sm:gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleEdit}
                  className="bg-blue-500 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-1.5 text-sm sm:text-base flex-1 sm:min-w-[120px] justify-center"
                >
                  <HiPencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('actions.edit')}
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-1.5 text-sm sm:text-base flex-1 sm:min-w-[120px] justify-center"
                >
                  <HiTrash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('actions.delete')}
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
