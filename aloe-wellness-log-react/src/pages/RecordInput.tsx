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
import DateTimeSelector from '../components/DateTimeSelector';
import NotesInput from '../components/NotesInput';
import SortModal from '../components/SortModal';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useFieldManagement } from '../hooks/useFieldManagement';
import { useRecordsStore } from '../store/records';
import { useToastStore } from '../store/toast';
import type { Field } from '../types/record';

const FIELD_TYPES = [
  { value: 'number', label: '数値' },
  { value: 'string', label: '文字列' },
  { value: 'boolean', label: '成否' },
] as const;

export default function RecordInput() {
  const { fields, loadFields, addRecord, loadRecords, records } =
    useRecordsStore();
  const { showSuccess } = useToastStore();
  const { handleAsyncError } = useErrorHandler();

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
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [recordTime, setRecordTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM
  });

  // 備考管理用のstate
  const [recordNotes, setRecordNotes] = useState<string>('');

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  const handleChange = (fieldId: string, value: string | number | boolean) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // 項目が入力されているかどうかを判定する関数
  const hasValue = (
    field: Field,
    value: string | number | boolean | undefined
  ): boolean => {
    if (field.type === 'number') {
      return value !== undefined && value !== '' && !isNaN(Number(value));
    } else if (field.type === 'string') {
      return value !== undefined && value !== '' && String(value).trim() !== '';
    } else if (field.type === 'boolean') {
      return value === true; // チェックされている場合のみ
    }
    return false;
  };

  const validate = () => {
    // 入力された項目のみバリデーション
    for (const field of fields) {
      const val = values[field.fieldId];
      if (hasValue(field, val)) {
        if (field.type === 'number' && isNaN(Number(val))) {
          return `${field.name}は正しい数値で入力してください`;
        }
      }
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

    const result = await handleAsyncError(
      async () => {
        // 選択された日時を使用
        const selectedDateTime = new Date(`${recordDate}T${recordTime}:00`);
        // より一意性を保つために現在のタイムスタンプを追加
        const uniqueTimestamp = Date.now();

        // 入力された項目のみ保存
        for (const field of fields) {
          const value = values[field.fieldId];

          // 入力されている項目のみ記録
          if (hasValue(field, value)) {
            await addRecord({
              id: `${selectedDateTime.toISOString()}-${
                field.fieldId
              }-${uniqueTimestamp}`,
              date: recordDate,
              time: recordTime,
              datetime: selectedDateTime.toISOString(),
              fieldId: field.fieldId,
              value: value,
            });
          }
        }

        // 備考が入力されている場合、備考も保存
        if (recordNotes.trim()) {
          await addRecord({
            id: `${selectedDateTime.toISOString()}-notes-${uniqueTimestamp}`,
            date: recordDate,
            time: recordTime,
            datetime: selectedDateTime.toISOString(),
            fieldId: 'notes',
            value: recordNotes.trim(),
          });
        }

        return true;
      },
      {
        context: '記録保存',
        fallbackMessage:
          '保存に失敗いたしましたわ。もう一度お試しくださいませ。',
      }
    );

    // 保存が成功した場合のみクリアと成功メッセージ
    if (result) {
      showSuccess('記録を保存いたしましたわ');

      // 全ての入力値をクリア（記録後は毎回空の状態にする）
      setValues({});

      // 一時表示項目をクリア（defaultDisplay: false の項目を非表示に戻す）
      fieldManagement.temporaryDisplayFields.clear();

      // 備考もクリア
      setRecordNotes('');
    }
  };

  // 前回値を取得する関数
  const getLastValue = (fieldId: string): string | number | boolean => {
    const rec = [...records].reverse().find(r => r.fieldId === fieldId);
    return rec ? rec.value : '';
  };

  // 日時リセット
  const handleSetCurrentDateTime = () => {
    const now = new Date();
    setRecordDate(now.toISOString().slice(0, 10));
    setRecordTime(now.toTimeString().slice(0, 5));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            健康記録入力
          </h1>
          <p className="text-gray-600">
            項目をクリックすると操作ボタンが表示されます
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
                className="bg-white p-6 rounded-2xl shadow-md"
              >
                {fieldManagement.editFieldId === field.fieldId ? (
                  <div>
                    {/* 項目名入力（左）と単位入力（右）のレイアウト */}
                    <div className="grid grid-cols-2 gap-2 items-stretch mb-4">
                      <div className="text-right pr-2 border-r border-gray-200">
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
                          placeholder="項目名"
                        />
                      </div>
                      <div className="pl-2">
                        {field.type === 'boolean' ? (
                          // boolean型の項目は右側を空白地帯に
                          <div className="h-full"></div>
                        ) : (
                          // boolean型以外は単位入力
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
                            placeholder="単位（例: kg）"
                          />
                        )}
                      </div>
                    </div>

                    {/* 保存・キャンセルボタン（中央寄せ） */}
                    <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={fieldManagement.handleEditFieldSave}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium flex items-center gap-2"
                      >
                        <HiCheckCircle className="w-4 h-4" />
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          fieldManagement.setEditFieldId(null);
                          fieldManagement.setEditField({});
                          fieldManagement.clearButtons(); // ボタン表示をクリア
                        }}
                        className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2"
                      >
                        <HiXMark className="w-4 h-4" />
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* 一覧画面と同じレイアウト：項目名左、入力欄右 */}
                    <fieldset
                      className="grid grid-cols-2 gap-2 items-stretch cursor-pointer"
                      onClick={() =>
                        fieldManagement.toggleButtons(field.fieldId)
                      }
                    >
                      <legend className="sr-only">
                        {field.name}の入力フィールド
                      </legend>
                      <label
                        htmlFor={`field-${field.fieldId}`}
                        className="text-xl font-medium text-gray-700 text-right pr-2 border-r border-gray-200 cursor-pointer"
                      >
                        {field.name}
                        {field.type !== 'boolean' &&
                          formError &&
                          formError.includes(field.name) && (
                            <span
                              className="text-red-600 ml-1"
                              aria-hidden="true"
                            >
                              *
                            </span>
                          )}
                      </label>
                      <div className="text-lg text-gray-800 font-semibold pl-2 text-left">
                        <div className="flex items-center gap-3">
                          <input
                            id={`field-${field.fieldId}`}
                            type={
                              field.type === 'number'
                                ? 'number'
                                : field.type === 'boolean'
                                ? 'checkbox'
                                : 'text'
                            }
                            value={
                              field.type === 'boolean'
                                ? undefined
                                : String(values[field.fieldId] ?? '')
                            }
                            checked={
                              field.type === 'boolean'
                                ? !!values[field.fieldId]
                                : undefined
                            }
                            onChange={e => {
                              e.stopPropagation(); // 親のクリックイベントを防ぐ
                              handleChange(
                                field.fieldId,
                                field.type === 'boolean'
                                  ? e.currentTarget.checked
                                  : e.currentTarget.value
                              );
                            }}
                            onClick={e => e.stopPropagation()} // 親のクリックイベントを防ぐ
                            className={
                              field.type === 'boolean'
                                ? 'w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 focus:ring-offset-2 block'
                                : 'border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600'
                            }
                            aria-invalid={
                              formError && formError.includes(field.name)
                                ? 'true'
                                : 'false'
                            }
                            aria-describedby={
                              field.unit ? `${field.fieldId}-unit` : undefined
                            }
                            aria-label={
                              field.type === 'boolean'
                                ? `${field.name}をチェックする`
                                : `${field.name}を入力`
                            }
                          />
                          {field.unit && (
                            <span
                              id={`${field.fieldId}-unit`}
                              className="text-gray-600 font-medium"
                              aria-label={`単位: ${field.unit}`}
                            >
                              {field.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </fieldset>

                    {/* 前回値・編集・非表示ボタン（クリックで表示/非表示） */}
                    {fieldManagement.areButtonsShown(field.fieldId) && (
                      <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          className="bg-sky-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-600 transition-colors duration-200 font-medium flex items-center gap-2"
                          onClick={() =>
                            setValues(v => ({
                              ...v,
                              [field.fieldId]: getLastValue(field.fieldId),
                            }))
                          }
                        >
                          <HiClipboardDocumentList className="w-4 h-4" />
                          前回値
                        </button>
                        <button
                          type="button"
                          onClick={() => fieldManagement.handleEditField(field)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2"
                        >
                          <HiPencil className="w-4 h-4" />
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => fieldManagement.handleHideField(field)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-2"
                        >
                          <HiEyeSlash className="w-4 h-4" />
                          非表示
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

          {formError && (
            <div
              id="form-error"
              className="text-red-600 font-semibold bg-red-50 p-4 rounded-lg border border-red-200"
              role="alert"
              aria-live="polite"
            >
              <span className="sr-only">エラー: </span>
              {formError}
            </div>
          )}

          <button
            type="submit"
            className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-xl shadow-md hover:bg-green-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
            aria-describedby={formError ? 'form-error' : undefined}
          >
            <HiDocumentText className="w-6 h-6" aria-hidden="true" />
            記録する
          </button>
        </form>

        {/* 項目選択・管理セクション */}
        <div className="mb-8">
          {fieldManagement.showSelectField ? (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <HiClipboardDocumentList className="w-6 h-6 text-blue-600" />
                項目を選択・表示
              </h3>
              <div className="space-y-4">
                {fieldManagement.getHiddenFields().length > 0 && (
                  <>
                    <h4 className="text-xl font-medium text-gray-700 text-left">
                      既存の項目から選択:
                    </h4>
                    <div className="space-y-3">
                      {fieldManagement.getHiddenFields().map(field => (
                        <div
                          key={field.fieldId}
                          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                        >
                          {fieldManagement.editingExistingFieldId ===
                          field.fieldId ? (
                            <div className="space-y-4">
                              {/* 編集モード：左右分割レイアウト */}
                              <div className="grid grid-cols-2 gap-2 items-stretch">
                                <div className="text-right pr-2 border-r border-gray-200">
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
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                    placeholder="項目名"
                                  />
                                </div>
                                <div className="pl-2">
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
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                    placeholder="単位（例: kg）"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 justify-center pt-2 border-t border-gray-200">
                                <button
                                  type="button"
                                  onClick={
                                    fieldManagement.handleEditExistingFieldSave
                                  }
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium flex items-center gap-2"
                                >
                                  <HiCheckCircle className="w-4 h-4" />
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    fieldManagement.setEditingExistingFieldId(
                                      null
                                    );
                                    fieldManagement.clearSelectButtons(); // 選択ボタン表示をクリア
                                  }}
                                  className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2"
                                >
                                  <HiXMark className="w-4 h-4" />
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {/* 通常表示：左右分割レイアウト */}
                              <div
                                className="grid grid-cols-2 gap-2 items-stretch cursor-pointer"
                                onClick={() =>
                                  fieldManagement.toggleSelectButtons(
                                    field.fieldId
                                  )
                                }
                              >
                                <div className="text-xl font-medium text-gray-700 text-right pr-2 border-r border-gray-200">
                                  {field.name}
                                </div>
                                <div className="text-lg text-gray-800 font-semibold pl-2 text-left">
                                  {field.unit ? `(${field.unit})` : ''}
                                </div>
                              </div>

                              {/* 表示・追加・編集・削除ボタン（クリックで表示/非表示） */}
                              {fieldManagement.areSelectButtonsShown(
                                field.fieldId
                              ) && (
                                <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      fieldManagement.handleShowExistingFieldPermanently(
                                        field.fieldId
                                      )
                                    }
                                    className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-600 transition-colors duration-200 font-medium flex items-center gap-2"
                                  >
                                    <HiCheckCircle className="w-4 h-4" />
                                    表示
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      fieldManagement.handleShowExistingField(
                                        field.fieldId
                                      )
                                    }
                                    className="bg-teal-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-500 transition-colors duration-200 font-medium flex items-center gap-2"
                                  >
                                    <HiPlus className="w-4 h-4" />
                                    追加
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      fieldManagement.handleEditExistingField(
                                        field
                                      )
                                    }
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2"
                                  >
                                    <HiPencil className="w-4 h-4" />
                                    編集
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      fieldManagement.handleDeleteExistingField(
                                        field
                                      )
                                    }
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-2"
                                  >
                                    <HiTrash className="w-4 h-4" />
                                    削除
                                  </button>
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
                    className="bg-green-50 border border-green-200 rounded-lg p-4"
                  >
                    <h4 className="text-xl font-medium text-gray-700 mb-4 text-left flex items-center gap-2">
                      <HiPlus
                        className="w-6 h-6 text-green-600"
                        aria-hidden="true"
                      />
                      新しい項目を追加
                    </h4>
                    <fieldset className="space-y-4">
                      <legend className="sr-only">新規項目の詳細情報</legend>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label
                            htmlFor="new-field-name"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            項目名{' '}
                            <span className="text-red-600" aria-label="必須">
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            placeholder="例: 体重"
                            required
                            aria-required="true"
                            aria-describedby="new-field-name-desc"
                            aria-invalid={
                              fieldManagement.addFieldError &&
                              fieldManagement.addFieldError.includes('項目名')
                                ? 'true'
                                : 'false'
                            }
                          />
                          <div id="new-field-name-desc" className="sr-only">
                            記録したい項目の名前を入力してください
                          </div>
                        </div>
                        <div className="w-full sm:w-32">
                          <label
                            htmlFor="new-field-type"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            データ型{' '}
                            <span className="text-red-600" aria-label="必須">
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            required
                            aria-required="true"
                            aria-describedby="new-field-type-desc"
                          >
                            {FIELD_TYPES.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <div id="new-field-type-desc" className="sr-only">
                            項目に入力するデータの種類を選択してください
                          </div>
                        </div>
                        <div className="w-full sm:w-32">
                          <label
                            htmlFor="new-field-unit"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            単位（任意）
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            placeholder="例: kg"
                            aria-describedby="new-field-unit-desc"
                          />
                          <div id="new-field-unit-desc" className="sr-only">
                            項目の単位を入力してください（例: kg、mmHg）
                          </div>
                        </div>
                      </div>

                      {fieldManagement.addFieldError && (
                        <div
                          id="add-field-error"
                          className="text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-200"
                          role="alert"
                          aria-live="polite"
                        >
                          <span className="sr-only">エラー: </span>
                          {fieldManagement.addFieldError}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition-colors duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                          aria-describedby={
                            fieldManagement.addFieldError
                              ? 'add-field-error'
                              : undefined
                          }
                        >
                          <HiPlus className="w-4 h-4" aria-hidden="true" />
                          追加
                        </button>
                        <button
                          type="button"
                          onClick={() => fieldManagement.setShowAddField(false)}
                          className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        >
                          <HiXMark className="w-4 h-4" aria-hidden="true" />
                          キャンセル
                        </button>
                      </div>
                    </fieldset>
                  </form>
                )}
                <div className="flex gap-3 pt-4">
                  {!fieldManagement.showAddField && (
                    <button
                      type="button"
                      onClick={() => fieldManagement.setShowAddField(true)}
                      className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition-colors duration-200 font-medium flex items-center gap-2"
                    >
                      <HiPlus className="w-4 h-4" />
                      新しい項目を追加
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fieldManagement.setShowSelectField(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-600 transition-colors duration-200 font-medium flex items-center gap-2"
                  >
                    <HiArrowLeft className="w-5 h-5" />
                    戻る
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fieldManagement.setShowSelectField(true)}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2"
              >
                <HiClipboardDocumentList className="w-5 h-5" />
                項目を選択・表示
              </button>
              <button
                type="button"
                onClick={fieldManagement.handleOpenSortModal}
                className="bg-purple-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-purple-600 transition-colors duration-200 font-medium flex items-center gap-2"
              >
                <HiBars3 className="w-5 h-5" />
                並び替え
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
