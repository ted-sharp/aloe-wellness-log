import { create } from 'zustand';
import type { RecordItem, Field } from '../types/record';
import * as db from '../db/indexedDb';

const initialFields: Field[] = [
  { fieldId: "weight", name: "体重", unit: "kg", type: "number", order: 1 },
  { fieldId: "blood_pressure", name: "血圧", unit: "mmHg", type: "string", order: 2 },
  { fieldId: "exercise", name: "運動有無(通勤時の早歩き)", type: "boolean", order: 3 },
  { fieldId: "meal", name: "食事有無(80kcal減)", type: "boolean", order: 4 },
  { fieldId: "sleep", name: "睡眠有無(0時までに寝る)", type: "boolean", order: 5 }
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
    set({ records });
  },
  addRecord: async (record) => {
    await db.addRecord(record);
    const records = await db.getAllRecords();
    set({ records });
  },
    loadFields: async () => {
    let fields = await db.getAllFields();

    // order属性のマイグレーションを実行
    let needsUpdate = false;
    const orderMapping: Record<string, number> = {
      'weight': 1,
      'blood_pressure': 2,
      'exercise': 3,
      'meal': 4,
      'sleep': 5
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
