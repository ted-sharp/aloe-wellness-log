import { create } from 'zustand';
import type { RecordItem, Field } from '../types/record';
import * as db from '../db/indexedDb';

const initialFields: Field[] = [
  { fieldId: "weight", name: "体重", unit: "kg", type: "number", order: 1 },
  { fieldId: "systolic_bp", name: "収縮期血圧(最高血圧)", unit: "mmHg", type: "number", order: 2 },
  { fieldId: "diastolic_bp", name: "拡張期血圧(最低血圧)", unit: "mmHg", type: "number", order: 3 },
  { fieldId: "heart_rate", name: "心拍数", unit: "bpm", type: "number", order: 4 },
  { fieldId: "body_temperature", name: "体温", unit: "℃", type: "number", order: 5 },
  { fieldId: "exercise", name: "運動有無(早歩き)", type: "boolean", order: 6 },
  { fieldId: "meal", name: "食事有無(-80kcal)", type: "boolean", order: 7 },
  { fieldId: "sleep", name: "睡眠有無(早寝)", type: "boolean", order: 8 }
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

    // order属性のマイグレーションを実行
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
      const expectedOrder = orderMapping[field.fieldId];
      if (field.order === undefined || (expectedOrder && field.order !== expectedOrder)) {
        needsUpdate = true;
        return { ...field, order: expectedOrder || 999 };
      }
      return field;
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

}));
