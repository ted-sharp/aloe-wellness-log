import React, { useEffect, useState } from 'react';
import {
  HiArrowLeft,
  HiBars3,
  HiCheckCircle,
  HiClipboardDocumentList,
  HiDocumentText,
  HiEyeSlash,
  HiPencil,
  HiPlus,
  HiTrash,
  HiXMark,
} from 'react-icons/hi2';
import Button from '../components/Button';
import DateTimeSelector from '../components/DateTimeSelector';
import NotesInput from '../components/NotesInput';
import SortModal from '../components/SortModal';
import { useFormAccessibility, useLiveRegion } from '../hooks/useAccessibility';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useFieldManagement } from '../hooks/useFieldManagement';
import { useI18n } from '../hooks/useI18n';
import { useRecordsStore } from '../store/records';
import { useToastStore } from '../store/toast';
import type { Field, RecordItem } from '../types/record';
import { isDev } from '../utils/devTools';
import {
  performanceMonitor,
  trackDatabaseOperation,
} from '../utils/performanceMonitor';
import {
  validateDateString,
  validateFieldValue,
  validateTimeString,
} from '../utils/validation';

// ローカル時間ベースの日時フォーマット関数
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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

// データ型オプションは動的に生成

export default function RecordInput() {
  // 国際化フック
  const {
    t,
    translateFieldName,
    translateError,
    getAriaLabel,
    getAnnouncement,
  } = useI18n();

  // アクセシビリティフック
  const { announcePolite } = useLiveRegion();
  const { getFieldProps: _getFieldProps } = useFormAccessibility();

  // エラーハンドリングフック
  const { handleAsyncError: _handleAsyncError } = useErrorHandler();

  // ストア
  const {
    fields,
    loadFields,
    addRecord,
    loadRecords,
    records,
    fieldsOperation,
  } = useRecordsStore();
  const { showSuccess, showError } = useToastStore();

  // カスタムフックからフィールド管理機能を取得
  const fieldManagement = useFieldManagement();

  // フォーム状態
  const [values, setValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  // 日時管理用のstate（デフォルトは現在時刻）
  const [recordDate, setRecordDate] = useState(() => {
    const now = new Date();
    return formatLocalDate(now); // YYYY-MM-DD
  });
  const [recordTime, setRecordTime] = useState(() => {
    const now = new Date();
    return formatLocalTime(now); // HH:MM
  });

  // 備考管理用のstate
  const [recordNotes, setRecordNotes] = useState<string>('');

  // 並び替えモーダルの表示状態
  const [_showSortModal, _setShowSortModal] = useState(false);

  // 1. 入力値ごとにexcludeFromGraphのstateを持つ
  const [excludeFromGraph, setExcludeFromGraph] = useState<
    Record<string, boolean>
  >({});

  // パフォーマンス監視の初期化
  useEffect(() => {
    performanceMonitor.trackRender.start('RecordInput');
    return () => {
      performanceMonitor.trackRender.end('RecordInput');
    };
  });

  // データ読み込み（パフォーマンス監視付き）
  useEffect(() => {
    const loadData = async () => {
      try {
        await trackDatabaseOperation('load-fields-input', async () => {
          await loadFields();
        });

        await trackDatabaseOperation('load-records-input', async () => {
          await loadRecords();
        });
      } catch (error) {
        console.error('Data loading error:', error);
      }
    };

    loadData();
  }, [loadFields, loadRecords]);

  // 開発環境でのパフォーマンス情報表示
  useEffect(() => {
    if (!isDev) return;

    const logPerformanceInfo = () => {
      console.group('🔍 RecordInput Performance Info');
      console.log(`📊 Total Fields: ${fields.length}`);
      console.log(`📊 Total Records: ${records.length}`);
      console.log(`📊 Form Values Count: ${Object.keys(values).length}`);
      console.log(`📊 Current Date: ${recordDate}`);
      console.log(`📊 Current Time: ${recordTime}`);
      console.groupEnd();
    };

    const timeout = setTimeout(logPerformanceInfo, 2000);
    return () => clearTimeout(timeout);
  }, [fields.length, records.length, values, recordDate, recordTime]);

  const handleChange = (fieldId: string, value: string | number | boolean) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('field-change');

    setValues(prev => ({ ...prev, [fieldId]: value }));
    setFormError(null); // エラーをクリア

    // 値が変更されたことをアナウンス（但し過度にならないよう、boolean型のみ）
    const field = fields.find(f => f.fieldId === fieldId);
    if (field?.type === 'boolean' && typeof value === 'boolean') {
      announcePolite(
        getAnnouncement('fieldChanged', {
          fieldName: translateFieldName(field.fieldId),
          value: value ? t('fields.yes') : t('fields.no'),
        })
      );
    }

    performanceMonitor.trackInteraction.end(interactionId, 'field-change');
  };

  // 項目が入力されているかどうかを判定する関数
  const hasValue = (
    field: Field,
    value: string | number | boolean | undefined
  ): boolean => {
    if (value === undefined || value === null) return false;
    if (field.type === 'boolean') {
      // boolean型の場合は、trueまたはfalseが明示的に設定されていれば有効
      return value === true || value === false;
    }
    if (field.type === 'number') {
      return typeof value === 'number' && !isNaN(value);
    }
    return typeof value === 'string' && value.trim().length > 0;
  };

  const validate = (): string | null => {
    // 日付・時刻の基本バリデーション
    if (!validateDateString(recordDate)) {
      return '日付の形式が正しくありません (YYYY-MM-DD)';
    }

    if (!validateTimeString(recordTime)) {
      return '時刻の形式が正しくありません (HH:mm)';
    }

    // 入力された項目のバリデーション
    for (const field of fields) {
      const val = values[field.fieldId];
      if (hasValue(field, val)) {
        const validationResult = validateFieldValue(val, field.type, {
          required: false, // 必須ではないが、入力されている場合はバリデーション
          min: field.type === 'number' ? 0 : undefined, // 数値は0以上
          max: field.type === 'number' ? 10000 : undefined, // 数値は10000以下
        });

        if (!validationResult.isValid) {
          return `${field.name}: ${validationResult.errors.join(', ')}`;
        }
      }
    }

    // 備考の長さバリデーション
    if (recordNotes.length > 500) {
      return '備考は500文字以内で入力してください';
    }

    // 記録する項目が1つもない場合はエラー
    const hasAnyRecord =
      recordNotes.trim() !== '' ||
      fields.some(field => hasValue(field, values[field.fieldId]));

    if (!hasAnyRecord) {
      return t('validation.required');
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const interactionId =
      performanceMonitor.trackInteraction.start('form-submit');

    // バリデーション
    const error = validate();
    if (error) {
      setFormError(error);
      announcePolite(t('errors.inputError', { message: error }));
      performanceMonitor.trackInteraction.end(
        interactionId,
        'form-submit-validation-error'
      );
      return;
    }

    try {
      // 入力された項目数をカウント
      let recordedCount = 0;

      // 入力された項目のみ保存
      const recordsToAdd: RecordItem[] = [];

      // 入力されている項目のみ記録
      for (const field of fields) {
        const value = values[field.fieldId];
        if (hasValue(field, value)) {
          const selectedDateTime = new Date(`${recordDate}T${recordTime}:00`);
          recordsToAdd.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fieldId: field.fieldId,
            value: value,
            date: recordDate,
            time: recordTime,
            datetime: formatLocalDateTime(selectedDateTime),
            excludeFromGraph: !!excludeFromGraph[field.fieldId],
          });
          recordedCount++;
        }
      }

      // 備考が入力されている場合、備考も保存
      if (recordNotes.trim() !== '') {
        const selectedDateTime = new Date(`${recordDate}T${recordTime}:00`);
        recordsToAdd.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fieldId: 'notes',
          value: recordNotes.trim(),
          date: recordDate,
          time: recordTime,
          datetime: formatLocalDateTime(selectedDateTime),
          excludeFromGraph: false,
        });
        recordedCount++;
      }

      // レコードを一括で追加（パフォーマンス監視付き）
      await trackDatabaseOperation(
        'add-records-batch',
        async () => {
          for (const record of recordsToAdd) {
            await addRecord(record);
          }
        },
        recordsToAdd.length
      );

      // 記録成功をアナウンス
      announcePolite(getAnnouncement('recordSaved', { count: recordedCount }));

      // 記録成功の処理

      // 保存が成功した場合のみクリアと成功メッセージ
      setValues({});
      showSuccess(t('pages.input.recordSuccess'));

      // 全ての入力値をクリア（記録後は毎回空の状態にする）
      setRecordNotes('');

      // 現在時刻に更新
      const now = new Date();
      setRecordDate(formatLocalDate(now));
      setRecordTime(formatLocalTime(now));

      // 4. 記録後はexcludeFromGraphもリセット
      setExcludeFromGraph({});

      performanceMonitor.trackInteraction.end(
        interactionId,
        'form-submit-success'
      );
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = translateError(
        'database',
        t('pages.input.recordError')
      );
      setFormError(errorMessage);
      showError(errorMessage);
      performanceMonitor.trackInteraction.end(
        interactionId,
        'form-submit-error'
      );
    }
  };

  // 前回値を取得する関数
  const getLastValue = (fieldId: string): string | number | boolean => {
    const lastRecord = [...records]
      .filter(record => record.fieldId === fieldId)
      .sort(
        (a, b) =>
          new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      )[0];
    return lastRecord?.value ?? '';
  };

  // 前回値を設定するハンドラー
  const handleSetLastValue = (fieldId: string) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('set-last-value');

    const lastValue = getLastValue(fieldId);
    if (lastValue !== '') {
      handleChange(fieldId, lastValue);
      const field = fields.find(f => f.fieldId === fieldId);
      if (field) {
        announcePolite(
          getAnnouncement('previousValueSet', {
            fieldName: translateFieldName(field.fieldId),
          })
        );
      }
    }

    performanceMonitor.trackInteraction.end(interactionId, 'set-last-value');
  };

  // 現在の日時を設定する関数
  const handleSetCurrentDateTime = () => {
    const now = new Date();
    setRecordDate(formatLocalDate(now));
    setRecordTime(formatLocalTime(now));
    announcePolite(getAnnouncement('currentTimeSet'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 p-2 sm:p-4">
      <div className="max-w-full sm:max-w-4xl mx-auto px-2 sm:px-0">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-2 whitespace-nowrap">
            {t('pages.input.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
            {t('pages.input.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 mb-12">
          {/* 日時選択セクション */}
          <DateTimeSelector
            recordDate={recordDate}
            recordTime={recordTime}
            onDateChange={setRecordDate}
            onTimeChange={setRecordTime}
            onSetCurrentDateTime={handleSetCurrentDateTime}
          />

          {/* 備考入力セクション */}
          <NotesInput value={recordNotes} onChange={setRecordNotes} />

          {/* フィールド入力セクション */}
          {[...fields]
            .filter(
              field =>
                field.defaultDisplay !== false ||
                fieldManagement.temporaryDisplayFields.has(field.fieldId)
            )
            .sort((a, b) => (a.order || 999) - (b.order || 999))
            .map(field => (
              <div
                key={field.fieldId}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md"
              >
                {fieldManagement.editFieldId === field.fieldId ? (
                  <div>
                    {/* 項目名入力（左）と単位入力（右）のレイアウト */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch mb-4">
                      <div className="text-left sm:text-right pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 pb-2 sm:pb-0">
                        <input
                          type="text"
                          value={fieldManagement.editField.name ?? ''}
                          onChange={e =>
                            fieldManagement.setEditField(f => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          placeholder={t(
                            'pages.input.fieldManagement.fieldName'
                          )}
                        />
                      </div>
                      <div className="pl-0 sm:pl-2 pt-2 sm:pt-0 flex flex-col gap-2">
                        {field.type === 'boolean' ? (
                          <div className="h-full"></div>
                        ) : (
                          <input
                            type="text"
                            value={fieldManagement.editField.unit ?? ''}
                            onChange={e =>
                              fieldManagement.setEditField(f => ({
                                ...f,
                                unit: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            placeholder={t(
                              'pages.input.fieldManagement.unitPlaceholder'
                            )}
                          />
                        )}
                        <label className="flex items-center gap-2 mt-2 text-sm">
                          <input
                            type="checkbox"
                            checked={
                              !!fieldManagement.editField.excludeFromGraph
                            }
                            onChange={e =>
                              fieldManagement.setEditField(f => ({
                                ...f,
                                excludeFromGraph: e.target.checked,
                              }))
                            }
                          />
                          {t(
                            'pages.input.fieldManagement.excludeFromGraph',
                            'グラフに表示しない'
                          )}
                        </label>
                      </div>
                    </div>

                    {/* 保存・キャンセルボタン（中央寄せ） */}
                    <div className="flex gap-2 sm:gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                      <Button
                        variant="success"
                        size="md"
                        icon={HiCheckCircle}
                        onClick={fieldManagement.handleEditFieldSave}
                        className="flex-1 sm:min-w-[120px]"
                      >
                        {t('actions.save')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        icon={HiXMark}
                        onClick={() => {
                          fieldManagement.setEditFieldId(null);
                          fieldManagement.setEditField({});
                          fieldManagement.clearButtons(); // ボタン表示をクリア
                        }}
                        className="flex-1 sm:min-w-[120px]"
                      >
                        {t('actions.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* 項目表示（入力・単位のレイアウト） */}
                    <div className="grid grid-cols-3 gap-2 items-center w-full">
                      {/* 左：ラベル */}
                      <span className="text-right text-lg font-semibold text-gray-700 dark:text-gray-200 select-none truncate">
                        {translateFieldName(field.fieldId)}
                      </span>
                      {/* 中央：入力欄＋単位 */}
                      <div className="flex items-center gap-2 w-full">
                        {field.type === 'boolean' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={
                                values[field.fieldId] === true
                                  ? 'primary'
                                  : 'secondary'
                              }
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                setValues(prev => {
                                  if (prev[field.fieldId] === true) {
                                    const newValues = { ...prev };
                                    delete newValues[field.fieldId];
                                    return newValues;
                                  } else {
                                    return { ...prev, [field.fieldId]: true };
                                  }
                                });
                              }}
                              className={
                                values[field.fieldId] === true
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 border-2'
                                  : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }
                              aria-label={getAriaLabel('setToYes', {
                                fieldName: translateFieldName(field.fieldId),
                              })}
                            >
                              {t('fields.yes')}
                            </Button>
                            <Button
                              type="button"
                              variant={
                                values[field.fieldId] === false
                                  ? 'primary'
                                  : 'secondary'
                              }
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                setValues(prev => {
                                  if (prev[field.fieldId] === false) {
                                    const newValues = { ...prev };
                                    delete newValues[field.fieldId];
                                    return newValues;
                                  } else {
                                    return { ...prev, [field.fieldId]: false };
                                  }
                                });
                              }}
                              className={
                                values[field.fieldId] === false
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 border-2'
                                  : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }
                              aria-label={getAriaLabel('setToNo', {
                                fieldName: translateFieldName(field.fieldId),
                              })}
                            >
                              {t('fields.no')}
                            </Button>
                          </div>
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={String(values[field.fieldId] || '')}
                            onChange={e =>
                              handleChange(
                                field.fieldId,
                                field.type === 'number'
                                  ? Number(e.target.value) || ''
                                  : e.target.value
                              )
                            }
                            onClick={e => e.stopPropagation()}
                            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                            aria-label={getAriaLabel('inputField', {
                              fieldName: translateFieldName(field.fieldId),
                            })}
                          />
                        )}
                        {field.unit && (
                          <span className="ml-2 text-gray-500 dark:text-gray-300 whitespace-nowrap">
                            {field.unit}
                          </span>
                        )}
                      </div>
                      {/* 右：除外ボタン */}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant={
                            excludeFromGraph[field.fieldId]
                              ? 'primary'
                              : 'secondary'
                          }
                          size="sm"
                          onClick={() =>
                            setExcludeFromGraph(prev => ({
                              ...prev,
                              [field.fieldId]: !prev[field.fieldId],
                            }))
                          }
                          className={
                            (excludeFromGraph[field.fieldId]
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 border-2'
                              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600') +
                            ' min-w-[48px] h-10 px-0 text-sm'
                          }
                          aria-label={t('pages.input.excludeFromGraph')}
                        >
                          {t('pages.input.excludeFromGraphShort') || '除外'}
                        </Button>
                      </div>
                    </div>

                    {/* 前回値・編集・非表示ボタン（クリックで表示/非表示） */}
                    {fieldManagement.areButtonsShown(field.fieldId) && (
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                        <Button
                          variant="sky"
                          size="sm"
                          icon={HiClipboardDocumentList}
                          onClick={() => handleSetLastValue(field.fieldId)}
                          aria-label={getAriaLabel('setPreviousValue', {
                            fieldName: translateFieldName(field.fieldId),
                          })}
                        >
                          {t('actions.lastValue')}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={HiPencil}
                          onClick={() => fieldManagement.handleEditField(field)}
                          aria-label={getAriaLabel('editField', {
                            fieldName: translateFieldName(field.fieldId),
                          })}
                        >
                          {t('actions.edit')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={HiEyeSlash}
                          onClick={() => fieldManagement.handleHideField(field)}
                          aria-label={getAriaLabel('hideField', {
                            fieldName: translateFieldName(field.fieldId),
                          })}
                        >
                          {t('actions.hide')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

          {formError && (
            <div
              id="form-error"
              className="text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800"
              role="alert"
              aria-live="polite"
            >
              <span className="sr-only">{t('aria.formError')}</span>
              {formError}
            </div>
          )}

          <Button
            type="submit"
            variant="success"
            size="lg"
            icon={HiDocumentText}
            fullWidth
            aria-describedby={formError ? 'form-error' : undefined}
          >
            {t('pages.input.record')}
          </Button>
        </form>

        {/* 項目選択・管理セクション */}
        <div className="mb-8">
          {fieldManagement.showSelectField ? (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <HiClipboardDocumentList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                {t('pages.input.fieldManagement.selectFieldsTitle')}
              </h3>
              <div className="space-y-4">
                {fieldManagement.getHiddenFields().length > 0 && (
                  <>
                    <h4 className="text-xl font-medium text-gray-700 dark:text-gray-200 text-left">
                      {t('pages.input.fieldManagement.existingFields')}
                    </h4>
                    <div className="space-y-3">
                      {fieldManagement.getHiddenFields().map(field => (
                        <div
                          key={field.fieldId}
                          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                        >
                          {fieldManagement.editingExistingFieldId ===
                          field.fieldId ? (
                            <div className="space-y-4">
                              {/* 編集モード：左右分割レイアウト */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
                                <div className="text-left sm:text-right pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 pb-2 sm:pb-0">
                                  <input
                                    type="text"
                                    value={
                                      fieldManagement.editingExistingField
                                        .name ?? ''
                                    }
                                    onChange={e =>
                                      fieldManagement.setEditingExistingField(
                                        f => ({ ...f, name: e.target.value })
                                      )
                                    }
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                                    placeholder={t(
                                      'pages.input.fieldManagement.fieldName'
                                    )}
                                  />
                                </div>
                                <div className="pl-0 sm:pl-2 pt-2 sm:pt-0">
                                  <input
                                    type="text"
                                    value={
                                      fieldManagement.editingExistingField
                                        .unit ?? ''
                                    }
                                    onChange={e =>
                                      fieldManagement.setEditingExistingField(
                                        f => ({ ...f, unit: e.target.value })
                                      )
                                    }
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                                    placeholder={t(
                                      'pages.input.fieldManagement.unitPlaceholder'
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 sm:gap-3 justify-center pt-2 border-t border-gray-200">
                                <Button
                                  variant="success"
                                  size="md"
                                  icon={HiCheckCircle}
                                  onClick={
                                    fieldManagement.handleEditExistingFieldSave
                                  }
                                  className="flex-1 sm:min-w-[120px]"
                                >
                                  {t('actions.save')}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="md"
                                  icon={HiXMark}
                                  onClick={() => {
                                    fieldManagement.setEditingExistingFieldId(
                                      null
                                    );
                                    fieldManagement.clearSelectButtons(); // 選択ボタン表示をクリア
                                  }}
                                  className="flex-1 sm:min-w-[120px]"
                                >
                                  {t('actions.cancel')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {/* 通常表示：左右分割レイアウト */}
                              <div
                                className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch cursor-pointer"
                                onClick={() =>
                                  fieldManagement.toggleSelectButtons(
                                    field.fieldId
                                  )
                                }
                              >
                                <div className="text-xl font-medium text-gray-700 dark:text-gray-200 text-left sm:text-right pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-600 pb-2 sm:pb-0">
                                  {field.name}
                                </div>
                                <div className="text-lg text-gray-800 dark:text-gray-200 font-semibold pl-0 sm:pl-2 text-left pt-2 sm:pt-0">
                                  {field.unit ? `(${field.unit})` : ''}
                                </div>
                              </div>

                              {/* 表示・追加・編集・削除ボタン（クリックで表示/非表示） */}
                              {fieldManagement.areSelectButtonsShown(
                                field.fieldId
                              ) && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-200">
                                  <Button
                                    variant="success"
                                    size="sm"
                                    icon={HiCheckCircle}
                                    onClick={() =>
                                      fieldManagement.handleShowExistingFieldPermanently(
                                        field.fieldId
                                      )
                                    }
                                  >
                                    {t('actions.display')}
                                  </Button>
                                  <Button
                                    variant="teal"
                                    size="sm"
                                    icon={HiPlus}
                                    onClick={() =>
                                      fieldManagement.handleShowExistingField(
                                        field.fieldId
                                      )
                                    }
                                  >
                                    {t('actions.add')}
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={HiPencil}
                                    onClick={() =>
                                      fieldManagement.handleEditExistingField(
                                        field
                                      )
                                    }
                                  >
                                    {t('actions.edit')}
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    icon={HiTrash}
                                    onClick={() =>
                                      fieldManagement.handleDeleteExistingField(
                                        field
                                      )
                                    }
                                  >
                                    {t('actions.delete')}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {fieldManagement.showAddField && (
                  <form
                    onSubmit={fieldManagement.handleAddField}
                    className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
                  >
                    <h4 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-4 text-left flex items-center gap-2">
                      <HiPlus
                        className="w-6 h-6 text-green-600 dark:text-green-400"
                        aria-hidden="true"
                      />
                      {t('pages.input.fieldManagement.addNewField')}
                    </h4>
                    <fieldset className="space-y-4">
                      <legend className="sr-only">
                        {t('aria.newFieldDetails')}
                      </legend>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label
                            htmlFor="new-field-name"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
                          >
                            {t('pages.input.fieldManagement.fieldNameRequired')}{' '}
                            <span
                              className="text-red-600"
                              aria-label={t('fields.required')}
                            >
                              *
                            </span>
                          </label>
                          <input
                            id="new-field-name"
                            type="text"
                            value={fieldManagement.newField.name}
                            onChange={e =>
                              fieldManagement.setNewField(f => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                            placeholder={t(
                              'pages.input.fieldManagement.fieldNamePlaceholder'
                            )}
                            required
                            aria-required="true"
                            aria-describedby="new-field-name-desc"
                            aria-invalid={
                              fieldManagement.addFieldError &&
                              fieldManagement.addFieldError.includes(
                                t('validation.fieldNameRequired')
                              )
                                ? 'true'
                                : 'false'
                            }
                          />
                          <div id="new-field-name-desc" className="sr-only">
                            {t('aria.fieldNameDescription')}
                          </div>
                        </div>
                        <div className="w-full sm:w-32">
                          <label
                            htmlFor="new-field-type"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
                          >
                            {t('pages.input.fieldManagement.dataTypeRequired')}{' '}
                            <span
                              className="text-red-600"
                              aria-label={t('fields.required')}
                            >
                              *
                            </span>
                          </label>
                          <select
                            id="new-field-type"
                            value={fieldManagement.newField.type}
                            onChange={e =>
                              fieldManagement.setNewField(f => ({
                                ...f,
                                type: e.target.value as
                                  | 'number'
                                  | 'string'
                                  | 'boolean',
                              }))
                            }
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                            required
                            aria-required="true"
                            aria-describedby="new-field-type-desc"
                          >
                            <option value="number">
                              {t('fields.types.number')}
                            </option>
                            <option value="string">
                              {t('fields.types.string')}
                            </option>
                            <option value="boolean">
                              {t('fields.types.boolean')}
                            </option>
                          </select>
                          <div id="new-field-type-desc" className="sr-only">
                            {t('aria.dataTypeDescription')}
                          </div>
                        </div>
                        <div className="w-full sm:w-32 flex flex-col gap-2">
                          <label
                            htmlFor="new-field-unit"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
                          >
                            {t('pages.input.fieldManagement.unitOptional')}
                          </label>
                          <input
                            id="new-field-unit"
                            type="text"
                            value={fieldManagement.newField.unit}
                            onChange={e =>
                              fieldManagement.setNewField(f => ({
                                ...f,
                                unit: e.target.value,
                              }))
                            }
                            placeholder={t('fields.inputPlaceholder', {
                              example: 'kg',
                            })}
                            className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-400 focus:border-blue-600 dark:focus:border-blue-400"
                            aria-describedby="unit-description"
                            aria-label={t('aria.unitFieldDescription')}
                          />
                          <label className="flex items-center gap-2 mt-2 text-sm">
                            <input
                              type="checkbox"
                              checked={
                                !!fieldManagement.newField.excludeFromGraph
                              }
                              onChange={e =>
                                fieldManagement.setNewField(f => ({
                                  ...f,
                                  excludeFromGraph: e.target.checked,
                                }))
                              }
                            />
                            {t(
                              'pages.input.fieldManagement.excludeFromGraph',
                              'グラフに表示しない'
                            )}
                          </label>
                        </div>
                      </div>

                      {fieldManagement.addFieldError && (
                        <div
                          id="add-field-error"
                          className="text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800"
                          role="alert"
                          aria-live="polite"
                        >
                          <span className="sr-only">{t('aria.formError')}</span>
                          {fieldManagement.addFieldError}
                        </div>
                      )}
                      <div className="flex gap-2 sm:gap-3 pt-2">
                        <button
                          type="submit"
                          className="bg-teal-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md hover:bg-teal-600 transition-colors duration-200 font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 text-sm sm:text-base flex-1 sm:min-w-[120px]"
                          aria-describedby={
                            fieldManagement.addFieldError
                              ? 'add-field-error'
                              : undefined
                          }
                        >
                          <HiPlus className="w-4 h-4" aria-hidden="true" />
                          {t('actions.add')}
                        </button>
                        <button
                          type="button"
                          onClick={() => fieldManagement.setShowAddField(false)}
                          className="bg-gray-400 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 text-sm sm:text-base flex-1 sm:min-w-[120px]"
                        >
                          <HiXMark className="w-4 h-4" aria-hidden="true" />
                          {t('actions.cancel')}
                        </button>
                      </div>
                    </fieldset>
                  </form>
                )}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  {!fieldManagement.showAddField && (
                    <button
                      type="button"
                      onClick={() => fieldManagement.setShowAddField(true)}
                      className="bg-teal-500 text-white px-3 sm:px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition-colors duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                    >
                      <HiPlus className="w-4 h-4" />
                      {t('pages.input.fieldManagement.addNewField')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fieldManagement.setShowSelectField(false)}
                    className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-lg shadow-md hover:bg-gray-600 transition-colors duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <HiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    {t('actions.back')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => fieldManagement.setShowSelectField(true)}
                className="bg-blue-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                aria-label={getAriaLabel('showField', {
                  fieldName: t('pages.input.selectFields'),
                })}
              >
                <HiClipboardDocumentList
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  aria-hidden="true"
                />
                {t('pages.input.selectFields')}
              </button>
              <button
                type="button"
                onClick={fieldManagement.handleOpenSortModal}
                disabled={fieldsOperation.loading || fields.length === 0}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base ${
                  fieldsOperation.loading || fields.length === 0
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
                aria-label={getAriaLabel('sort', {
                  fieldName: t('pages.input.sortFields'),
                })}
              >
                <HiBars3 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                {fieldsOperation.loading
                  ? t('common.loading')
                  : t('pages.input.sortFields')}
              </button>
            </div>
          )}
        </div>

        {/* 並び替えモーダル */}
        <SortModal
          isOpen={fieldManagement.showSortModal}
          onClose={() => fieldManagement.setShowSortModal(false)}
          fields={fieldManagement.sortableFields}
          onDragEnd={fieldManagement.handleDragEnd}
          onSave={fieldManagement.handleSaveSortOrder}
          onToggleDisplay={fieldManagement.handleToggleDisplayInModal}
        />
      </div>
    </div>
  );
}
