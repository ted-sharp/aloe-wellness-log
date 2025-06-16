import { create } from 'zustand';
import type { RecordItem, Field } from '../types/record';
import * as db from '../db/indexedDb';

const initialFields: Field[] = [
  { fieldId: "weight", name: "体重", unit: "kg", type: "number" },
  { fieldId: "blood_pressure", name: "血圧", unit: "mmHg", type: "string" },
  { fieldId: "exercise", name: "運動有無(通勤時の早歩き)", type: "boolean" },
  { fieldId: "meal", name: "食事有無(80kcal減)", type: "boolean" },
  { fieldId: "sleep", name: "睡眠有無(0時までに寝る)", type: "boolean" }
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
    const fields = await db.getAllFields();
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