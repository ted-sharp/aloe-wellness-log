import type { RecordItem, Field } from '../types/record';

const DB_NAME = 'aloe-wellness-log';
const DB_VERSION = 1;
const RECORDS_STORE = 'records';
const FIELDS_STORE = 'fields';

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
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

// 記録データの追加
export async function addRecord(record: RecordItem) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const store = tx.objectStore(RECORDS_STORE);
    store.add(record);
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
    request.onsuccess = () => resolve(request.result as RecordItem[]);
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
    request.onsuccess = () => resolve(request.result as Field[]);
    request.onerror = () => reject(request.error);
  });
} 