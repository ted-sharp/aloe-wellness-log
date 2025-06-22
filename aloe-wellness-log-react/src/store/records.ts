import { create } from 'zustand';
import * as db from '../db/indexedDb';
import { DbError, DbErrorType } from '../db/indexedDb';
import type { Field, RecordItem } from '../types/record';

// フィールドIDと基本構造の定義（翻訳なし）
const baseFieldStructure = [
  {
    fieldId: 'weight',
    unit: 'kg',
    type: 'number' as const,
    order: 1,
    defaultDisplay: true,
  },
  {
    fieldId: 'systolic_bp',
    unit: 'mmHg',
    type: 'number' as const,
    order: 2,
    defaultDisplay: true,
  },
  {
    fieldId: 'diastolic_bp',
    unit: 'mmHg',
    type: 'number' as const,
    order: 3,
    defaultDisplay: true,
  },
  {
    fieldId: 'heart_rate',
    unit: 'bpm',
    type: 'number' as const,
    order: 4,
    defaultDisplay: false,
  },
  {
    fieldId: 'body_temperature',
    unit: '℃',
    type: 'number' as const,
    order: 5,
    defaultDisplay: false,
  },
  {
    fieldId: 'exercise',
    type: 'boolean' as const,
    order: 6,
    defaultDisplay: true,
  },
  {
    fieldId: 'meal',
    type: 'boolean' as const,
    order: 7,
    defaultDisplay: true,
  },
  {
    fieldId: 'sleep',
    type: 'boolean' as const,
    order: 8,
    defaultDisplay: true,
  },
  {
    fieldId: 'smoke',
    type: 'boolean' as const,
    order: 9,
    defaultDisplay: false,
  },
  {
    fieldId: 'alcohol',
    type: 'boolean' as const,
    order: 10,
    defaultDisplay: false,
  },
];

// 後方互換性のための既存のinitialFields（廃止予定）
const initialFields: Field[] = [
  {
    fieldId: 'weight',
    name: '体重',
    unit: 'kg',
    type: 'number',
    order: 1,
    defaultDisplay: true,
  },
  {
    fieldId: 'systolic_bp',
    name: '最高血圧',
    unit: 'mmHg',
    type: 'number',
    order: 2,
    defaultDisplay: true,
  },
  {
    fieldId: 'diastolic_bp',
    name: '最低血圧',
    unit: 'mmHg',
    type: 'number',
    order: 3,
    defaultDisplay: true,
  },
  {
    fieldId: 'heart_rate',
    name: '心拍数',
    unit: 'bpm',
    type: 'number',
    order: 4,
    defaultDisplay: false,
  },
  {
    fieldId: 'body_temperature',
    name: '体温',
    unit: '℃',
    type: 'number',
    order: 5,
    defaultDisplay: false,
  },
  {
    fieldId: 'exercise',
    name: '運動(早歩き)',
    type: 'boolean',
    order: 6,
    defaultDisplay: true,
  },
  {
    fieldId: 'meal',
    name: '減食',
    type: 'boolean',
    order: 7,
    defaultDisplay: true,
  },
  {
    fieldId: 'sleep',
    name: '睡眠(早寝)',
    type: 'boolean',
    order: 8,
    defaultDisplay: true,
  },
  {
    fieldId: 'smoke',
    name: '禁酒',
    type: 'boolean',
    order: 9,
    defaultDisplay: false,
  },
  {
    fieldId: 'alcohol',
    name: '節酒',
    type: 'boolean',
    order: 10,
    defaultDisplay: false,
  },
];

// 翻訳関数の型定義
type TranslateFn = (fieldId: string) => string;

// 操作状態の定義
interface OperationState {
  loading: boolean;
  error: DbError | null;
}

type RecordsState = {
  records: RecordItem[];
  fields: Field[];

  // 操作状態
  recordsOperation: OperationState;
  fieldsOperation: OperationState;

  // 基本操作
  loadRecords: () => Promise<void>;
  addRecord: (record: RecordItem) => Promise<void>;
  loadFields: () => Promise<void>;
  addField: (field: Field) => Promise<void>;
  initializeFields: () => Promise<void>;
  initializeFieldsWithTranslation: (
    translateFieldName: TranslateFn
  ) => Promise<void>;
  updateField: (field: Field) => Promise<void>;
  updateRecord: (record: RecordItem) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
  deleteAllRecords: () => Promise<void>;
  deleteAllFields: () => Promise<void>;
  deleteAllData: () => Promise<void>;

  // バッチ操作
  batchUpdateRecords: (records: RecordItem[]) => Promise<void>;
  batchUpdateFields: (fields: Field[]) => Promise<void>;

  // エラー状態クリア
  clearRecordsError: () => void;
  clearFieldsError: () => void;
};

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  fields: [],

  recordsOperation: { loading: false, error: null },
  fieldsOperation: { loading: false, error: null },

  // エラー状態クリア
  clearRecordsError: () => {
    set(state => ({
      recordsOperation: { ...state.recordsOperation, error: null },
    }));
  },

  clearFieldsError: () => {
    set(state => ({
      fieldsOperation: { ...state.fieldsOperation, error: null },
    }));
  },

  loadRecords: async () => {
    set(_state => ({
      recordsOperation: { loading: true, error: null },
    }));

    try {
      const records = await db.getAllRecords();
      set({
        records,
        recordsOperation: { loading: false, error: null },
      });
    } catch (error) {
      const dbError =
        error instanceof DbError
          ? error
          : new DbError(
              DbErrorType.UNKNOWN,
              'レコード読み込みに失敗しました',
              error
            );
      set(_state => ({
        recordsOperation: { loading: false, error: dbError },
      }));
      throw dbError;
    }
  },

  addRecord: async (record: RecordItem) => {
    // 楽観的更新：即座にUIに反映
    set(_state => ({
      records: [..._state.records, record],
      recordsOperation: { loading: true, error: null },
    }));

    try {
      await db.addRecord(record);
      set(_state => ({
        recordsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // エラー時のロールバック
      set(_state => ({
        records: _state.records.filter(r => r.id !== record.id),
        recordsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  'レコード追加に失敗しました',
                  error
                ),
        },
      }));
      throw error;
    }
  },

  loadFields: async () => {
    set(_state => ({
      fieldsOperation: { loading: true, error: null },
    }));

    try {
      let fields = await db.getAllFields();

      // order属性とdefaultDisplay属性のマイグレーションを実行
      let needsUpdate = false;
      const orderMapping: Record<string, number> = {
        weight: 1,
        systolic_bp: 2,
        diastolic_bp: 3,
        heart_rate: 4,
        body_temperature: 5,
        exercise: 6,
        meal: 7,
        sleep: 8,
        smoke: 9,
        alcohol: 10,
      };

      const updatedFields = fields.map(field => {
        const updatedField = { ...field };

        // order属性のマイグレーション（未設定の場合のみ）
        if (field.order === undefined) {
          const expectedOrder = orderMapping[field.fieldId];
          needsUpdate = true;
          updatedField.order = expectedOrder || 999;
        }

        // defaultDisplay属性のマイグレーション（既存フィールドはデフォルトで表示）
        if (field.defaultDisplay === undefined) {
          needsUpdate = true;
          updatedField.defaultDisplay = true;
        }

        return updatedField;
      });

      if (needsUpdate) {
        // バッチ更新を使用してパフォーマンス向上
        await db.batchUpdateFields(updatedFields);
        fields = updatedFields;
      }

      set({
        fields,
        fieldsOperation: { loading: false, error: null },
      });
    } catch (error) {
      const dbError =
        error instanceof DbError
          ? error
          : new DbError(
              DbErrorType.UNKNOWN,
              'フィールド読み込みに失敗しました',
              error
            );
      set(_state => ({
        fieldsOperation: { loading: false, error: dbError },
      }));
      throw dbError;
    }
  },

  addField: async (field: Field) => {
    // 楽観的更新
    set(_state => ({
      fields: [..._state.fields, field],
      fieldsOperation: { loading: true, error: null },
    }));

    try {
      await db.addField(field);
      set(_state => ({
        fieldsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set(_state => ({
        fields: _state.fields.filter(f => f.fieldId !== field.fieldId),
        fieldsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  'フィールド追加に失敗しました',
                  error
                ),
        },
      }));
      throw error;
    }
  },

  initializeFields: async () => {
    const fields = await db.getAllFields();
    if (fields.length === 0) {
      // バッチ操作で初期フィールドを追加
      await db.batchUpdateFields(initialFields);
      set({ fields: initialFields });
    }
  },

  initializeFieldsWithTranslation: async (translateFieldName: TranslateFn) => {
    const fields = await db.getAllFields();
    if (fields.length === 0) {
      // バッチ操作で初期フィールドを追加
      await db.batchUpdateFields(
        baseFieldStructure.map(field => ({
          ...field,
          name: translateFieldName(field.fieldId),
        }))
      );
      set({
        fields: baseFieldStructure.map(field => ({
          ...field,
          name: translateFieldName(field.fieldId),
        })),
      });
    }
  },

  updateField: async (field: Field) => {
    // 楽観的更新
    const prevFields = get().fields;
    set(_state => ({
      fields: _state.fields.map(f => (f.fieldId === field.fieldId ? field : f)),
      fieldsOperation: { loading: true, error: null },
    }));

    try {
      await db.updateField(field);
      set(_state => ({
        fieldsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set({
        fields: prevFields,
        fieldsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  'フィールド更新に失敗しました',
                  error
                ),
        },
      });
      throw error;
    }
  },

  updateRecord: async (record: RecordItem) => {
    // 楽観的更新
    const prevRecords = get().records;
    set(_state => ({
      records: _state.records.map(r => (r.id === record.id ? record : r)),
      recordsOperation: { loading: true, error: null },
    }));

    try {
      await db.updateRecord(record);
      set(_state => ({
        recordsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set({
        records: prevRecords,
        recordsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  'レコード更新に失敗しました',
                  error
                ),
        },
      });
      throw error;
    }
  },

  deleteRecord: async (id: string) => {
    // 楽観的更新
    const prevRecords = get().records;
    const deletedRecord = prevRecords.find(r => r.id === id);

    set(_state => ({
      records: _state.records.filter(r => r.id !== id),
      recordsOperation: { loading: true, error: null },
    }));

    try {
      await db.deleteRecord(id);
      set(_state => ({
        recordsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set({
        records: deletedRecord ? [...prevRecords] : prevRecords,
        recordsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  'レコード削除に失敗しました',
                  error
                ),
        },
      });
      throw error;
    }
  },

  deleteField: async (fieldId: string) => {
    // 楽観的更新
    const prevFields = get().fields;
    const deletedField = prevFields.find(f => f.fieldId === fieldId);

    set(_state => ({
      fields: _state.fields.filter(f => f.fieldId !== fieldId),
      fieldsOperation: { loading: true, error: null },
    }));

    try {
      await db.deleteField(fieldId);
      set(_state => ({
        fieldsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set({
        fields: deletedField ? [...prevFields] : prevFields,
        fieldsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  'フィールド削除に失敗しました',
                  error
                ),
        },
      });
      throw error;
    }
  },

  deleteAllRecords: async () => {
    // 楽観的更新
    const prevRecords = get().records;
    set({
      records: [],
      recordsOperation: { loading: true, error: null },
    });

    try {
      await db.deleteAllRecords();
      set(_state => ({
        recordsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set({
        records: prevRecords,
        recordsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  '全レコード削除に失敗しました',
                  error
                ),
        },
      });
      throw error;
    }
  },

  deleteAllFields: async () => {
    // 楽観的更新
    const prevFields = get().fields;
    set({
      fields: [],
      fieldsOperation: { loading: true, error: null },
    });

    try {
      await db.deleteAllFields();
      set(_state => ({
        fieldsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set({
        fields: prevFields,
        fieldsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  '全フィールド削除に失敗しました',
                  error
                ),
        },
      });
      throw error;
    }
  },

  deleteAllData: async () => {
    // 楽観的更新
    const prevRecords = get().records;
    const prevFields = get().fields;

    set({
      records: [],
      fields: [],
      recordsOperation: { loading: true, error: null },
      fieldsOperation: { loading: true, error: null },
    });

    try {
      await db.deleteAllData();
      set({
        recordsOperation: { loading: false, error: null },
        fieldsOperation: { loading: false, error: null },
      });
    } catch (error) {
      // ロールバック
      const dbError =
        error instanceof DbError
          ? error
          : new DbError(
              DbErrorType.UNKNOWN,
              '全データ削除に失敗しました',
              error
            );

      set({
        records: prevRecords,
        fields: prevFields,
        recordsOperation: { loading: false, error: dbError },
        fieldsOperation: { loading: false, error: dbError },
      });
      throw error;
    }
  },

  // バッチ操作
  batchUpdateRecords: async (records: RecordItem[]) => {
    // 楽観的更新
    const prevRecords = get().records;
    const recordMap = new Map(prevRecords.map(r => [r.id, r]));

    // 新しいレコードまたは更新されたレコードをマージ
    records.forEach(record => {
      recordMap.set(record.id, record);
    });

    set({
      records: Array.from(recordMap.values()),
      recordsOperation: { loading: true, error: null },
    });

    try {
      await db.batchUpdateRecords(records);
      set(_state => ({
        recordsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set({
        records: prevRecords,
        recordsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  'バッチレコード更新に失敗しました',
                  error
                ),
        },
      });
      throw error;
    }
  },

  batchUpdateFields: async (fields: Field[]) => {
    // 楽観的更新
    const prevFields = get().fields;
    const fieldMap = new Map(prevFields.map(f => [f.fieldId, f]));

    // 新しいフィールドまたは更新されたフィールドをマージ
    fields.forEach(field => {
      fieldMap.set(field.fieldId, field);
    });

    set({
      fields: Array.from(fieldMap.values()),
      fieldsOperation: { loading: true, error: null },
    });

    try {
      await db.batchUpdateFields(fields);
      set(_state => ({
        fieldsOperation: { loading: false, error: null },
      }));
    } catch (error) {
      // ロールバック
      set({
        fields: prevFields,
        fieldsOperation: {
          loading: false,
          error:
            error instanceof DbError
              ? error
              : new DbError(
                  DbErrorType.UNKNOWN,
                  'バッチフィールド更新に失敗しました',
                  error
                ),
        },
      });
      throw error;
    }
  },
}));
