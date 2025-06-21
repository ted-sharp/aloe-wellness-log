import type { RecordItem, Field } from '../types/record';

const DB_NAME = 'aloe-wellness-log';
const DB_VERSION = 1;
const RECORDS_STORE = 'records';
const FIELDS_STORE = 'fields';

// 型ガード関数
function isRecordItem(obj: unknown): obj is RecordItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as RecordItem).id === 'string' &&
    typeof (obj as RecordItem).date === 'string' &&
    typeof (obj as RecordItem).time === 'string' &&
    typeof (obj as RecordItem).datetime === 'string' &&
    typeof (obj as RecordItem).fieldId === 'string' &&
    ((obj as RecordItem).value !== undefined)
  );
}

function isField(obj: unknown): obj is Field {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Field).fieldId === 'string' &&
    typeof (obj as Field).name === 'string' &&
    ['number', 'string', 'boolean'].includes((obj as Field).type)
  );
}

function validateRecords(data: unknown[]): RecordItem[] {
  const validRecords: RecordItem[] = [];
  for (const item of data) {
    if (isRecordItem(item)) {
      validRecords.push(item);
    } else {
      console.warn('Invalid record item found:', item);
    }
  }
  return validRecords;
}

function validateFields(data: unknown[]): Field[] {
  const validFields: Field[] = [];
  for (const item of data) {
    if (isField(item)) {
      validFields.push(item);
    } else {
      console.warn('Invalid field item found:', item);
    }
  }
  return validFields;
}

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FIELDS_STORE)) {
        db.createObjectStore(FIELDS_STORE, { keyPath: 'fieldId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 記録データの追加（既存の場合は更新）
export async function addRecord(record: RecordItem) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const store = tx.objectStore(RECORDS_STORE);
    store.put(record); // addをputに変更して既存レコードの更新を可能にする
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 記録データの全件取得
export async function getAllRecords(): Promise<RecordItem[]> {
  const db = await openDb();
  const tx = db.transaction(RECORDS_STORE, 'readonly');
  const store = tx.objectStore(RECORDS_STORE);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const data = request.result;
      if (Array.isArray(data)) {
        resolve(validateRecords(data));
      } else {
        resolve([]);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// 記録項目の追加
export async function addField(field: Field) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FIELDS_STORE, 'readwrite');
    const store = tx.objectStore(FIELDS_STORE);
    store.add(field);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 記録項目の全件取得
export async function getAllFields(): Promise<Field[]> {
  const db = await openDb();
  const tx = db.transaction(FIELDS_STORE, 'readonly');
  const store = tx.objectStore(FIELDS_STORE);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const data = request.result;
      if (Array.isArray(data)) {
        resolve(validateFields(data));
      } else {
        resolve([]);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// 記録項目の更新
export async function updateField(field: Field) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FIELDS_STORE, 'readwrite');
    const store = tx.objectStore(FIELDS_STORE);
    store.put(field);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 記録データの更新
export async function updateRecord(record: RecordItem) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const store = tx.objectStore(RECORDS_STORE);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 記録データの削除
export async function deleteRecord(id: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const store = tx.objectStore(RECORDS_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// フィールド（項目）の削除
export async function deleteField(fieldId: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FIELDS_STORE, 'readwrite');
    const store = tx.objectStore(FIELDS_STORE);
    store.delete(fieldId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 全記録データの削除
export async function deleteAllRecords() {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const store = tx.objectStore(RECORDS_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 全項目データの削除
export async function deleteAllFields() {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FIELDS_STORE, 'readwrite');
    const store = tx.objectStore(FIELDS_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 全データ削除（記録と項目の両方）
export async function deleteAllData() {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([RECORDS_STORE, FIELDS_STORE], 'readwrite');
    const recordStore = tx.objectStore(RECORDS_STORE);
    const fieldStore = tx.objectStore(FIELDS_STORE);
    recordStore.clear();
    fieldStore.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
