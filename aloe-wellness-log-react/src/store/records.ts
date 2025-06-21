import { create } from 'zustand';
import type { RecordItem, Field } from '../types/record';
import * as db from '../db/indexedDb';

const initialFields: Field[] = [
  { fieldId: "weight", name: "体重", unit: "kg", type: "number", order: 1, defaultDisplay: true },
  { fieldId: "systolic_bp", name: "最高血圧", unit: "mmHg", type: "number", order: 2, defaultDisplay: true },
  { fieldId: "diastolic_bp", name: "最低血圧", unit: "mmHg", type: "number", order: 3, defaultDisplay: true },
  { fieldId: "heart_rate", name: "心拍数", unit: "bpm", type: "number", order: 4, defaultDisplay: false },
  { fieldId: "body_temperature", name: "体温", unit: "℃", type: "number", order: 5, defaultDisplay: false },
  { fieldId: "exercise", name: "運動(早歩き)", type: "boolean", order: 6, defaultDisplay: true },
  { fieldId: "meal", name: "減食", type: "boolean", order: 7, defaultDisplay: true },
  { fieldId: "sleep", name: "睡眠(早寝)", type: "boolean", order: 8, defaultDisplay: true },
  { fieldId: "smoke", name: "禁酒", type: "boolean", order: 9, defaultDisplay: false },
  { fieldId: "alcohol", name: "節酒", type: "boolean", order: 10, defaultDisplay: false }
];

type RecordsState = {
  records: RecordItem[];
  fields: Field[];
  loadRecords: () => Promise<void>;
  addRecord: (record: RecordItem) => Promise<void>;
  loadFields: () => Promise<void>;
  addField: (field: Field) => Promise<void>;
  initializeFields: () => Promise<void>;
  updateField: (field: Field) => Promise<void>;
  updateRecord: (record: RecordItem) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
  deleteAllRecords: () => Promise<void>;
  deleteAllFields: () => Promise<void>;
  deleteAllData: () => Promise<void>;

  // 今後、fieldsの追加・取得もここに追加できますわ
};

export const useRecordsStore = create<RecordsState>((set) => ({
  records: [],
  fields: [],
  loadRecords: async () => {
    const records = await db.getAllRecords();
    console.log('📋 読み込まれた記録数:', records.length);
    console.log('📋 読み込まれた記録:', records);
    set({ records });
  },
  addRecord: async (record) => {
    console.log('💾 記録を保存中:', record);
    await db.addRecord(record);
    const records = await db.getAllRecords();
    console.log('💾 保存後の記録数:', records.length);
    set({ records });
  },
    loadFields: async () => {
    let fields = await db.getAllFields();

    // order属性とdefaultDisplay属性のマイグレーションを実行
    // ただし、orderが既に設定済みの場合は変更しない（並び替え機能との競合を防ぐ）
    let needsUpdate = false;
    const orderMapping: Record<string, number> = {
      'weight': 1,
      'systolic_bp': 2,
      'diastolic_bp': 3,
      'heart_rate': 4,
      'body_temperature': 5,
      'exercise': 6,
      'meal': 7,
      'sleep': 8,
      // 旧フィールドとの互換性（既存データがある場合）
      'blood_pressure': 2
    };

    const updatedFields = fields.map((field) => {
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
      for (const field of updatedFields) {
        await db.updateField(field);
      }
      fields = updatedFields;
    }

    set({ fields });
  },
  addField: async (field) => {
    await db.addField(field);
    const fields = await db.getAllFields();
    set({ fields });
  },
  initializeFields: async () => {
    const fields = await db.getAllFields();
    if (fields.length === 0) {
      for (const field of initialFields) {
        await db.addField(field);
      }
    }
  },
  updateField: async (field) => {
    await db.updateField(field);
    const fields = await db.getAllFields();
    set({ fields });
  },
  updateRecord: async (record) => {
    await db.updateRecord(record);
    const records = await db.getAllRecords();
    set({ records });
  },
  deleteRecord: async (id) => {
    await db.deleteRecord(id);
    const records = await db.getAllRecords();
    set({ records });
  },
  deleteField: async (fieldId) => {
    await db.deleteField(fieldId);
    const fields = await db.getAllFields();
    set({ fields });
  },
  deleteAllRecords: async () => {
    await db.deleteAllRecords();
    const records = await db.getAllRecords();
    set({ records });
  },
  deleteAllFields: async () => {
    await db.deleteAllFields();
    const fields = await db.getAllFields();
    set({ fields });
  },
  deleteAllData: async () => {
    await db.deleteAllData();
    const records = await db.getAllRecords();
    const fields = await db.getAllFields();
    set({ records, fields });
  },
}));
