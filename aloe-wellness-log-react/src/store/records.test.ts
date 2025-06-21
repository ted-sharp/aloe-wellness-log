import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Field, RecordItem } from '../types/record';
import { useRecordsStore } from './records';

// IndexedDBのモック
vi.mock('../db/indexedDb', () => ({
  getAllRecords: vi.fn(),
  getAllFields: vi.fn(),
  addRecord: vi.fn(),
  addField: vi.fn(),
  updateField: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  deleteField: vi.fn(),
  deleteAllRecords: vi.fn(),
  deleteAllFields: vi.fn(),
  deleteAllData: vi.fn(),
}));

import * as db from '../db/indexedDb';

// モックされたdbモジュール
const mockDb = vi.mocked(db);

describe('useRecordsStore', () => {
  beforeEach(() => {
    // ストアの状態をリセット
    useRecordsStore.setState({ records: [], fields: [] });

    // モックをリセット
    vi.clearAllMocks();
  });

  describe('loadFields', () => {
    it('フィールドをロードし、order属性のマイグレーションを実行する', async () => {
      const mockFields: Field[] = [
        { fieldId: 'weight', name: '体重', type: 'number', unit: 'kg' },
        { fieldId: 'exercise', name: '運動', type: 'boolean' },
      ];

      mockDb.getAllFields.mockResolvedValue(mockFields);
      mockDb.updateField.mockResolvedValue(undefined);

      const { loadFields } = useRecordsStore.getState();
      await loadFields();

      expect(mockDb.getAllFields).toHaveBeenCalledTimes(1);
      expect(mockDb.updateField).toHaveBeenCalledTimes(2); // order属性のマイグレーション

      const { fields } = useRecordsStore.getState();
      expect(fields).toHaveLength(2);
      expect(fields[0].order).toBeDefined();
      expect(fields[0].defaultDisplay).toBeDefined();
    });

    it('既にorder属性が設定されている場合はマイグレーションしない', async () => {
      const mockFields: Field[] = [
        {
          fieldId: 'weight',
          name: '体重',
          type: 'number',
          unit: 'kg',
          order: 1,
          defaultDisplay: true,
        },
      ];

      mockDb.getAllFields.mockResolvedValue(mockFields);

      const { loadFields } = useRecordsStore.getState();
      await loadFields();

      expect(mockDb.updateField).not.toHaveBeenCalled();
    });
  });

  describe('loadRecords', () => {
    it('レコードを正常にロードする', async () => {
      const mockRecords: RecordItem[] = [
        {
          id: 'test-1',
          date: '2024-01-01',
          time: '08:00',
          datetime: '2024-01-01T08:00:00.000Z',
          fieldId: 'weight',
          value: 65.5,
        },
      ];

      mockDb.getAllRecords.mockResolvedValue(mockRecords);

      const { loadRecords } = useRecordsStore.getState();
      await loadRecords();

      expect(mockDb.getAllRecords).toHaveBeenCalledTimes(1);

      const { records } = useRecordsStore.getState();
      expect(records).toEqual(mockRecords);
    });
  });

  describe('addRecord', () => {
    it('レコードを追加してリロードする', async () => {
      const newRecord: RecordItem = {
        id: 'test-1',
        date: '2024-01-01',
        time: '08:00',
        datetime: '2024-01-01T08:00:00.000Z',
        fieldId: 'weight',
        value: 65.5,
      };

      mockDb.addRecord.mockResolvedValue(undefined);
      mockDb.getAllRecords.mockResolvedValue([newRecord]);

      const { addRecord } = useRecordsStore.getState();
      await addRecord(newRecord);

      expect(mockDb.addRecord).toHaveBeenCalledWith(newRecord);
      expect(mockDb.getAllRecords).toHaveBeenCalledTimes(1);

      const { records } = useRecordsStore.getState();
      expect(records).toEqual([newRecord]);
    });
  });

  describe('addField', () => {
    it('フィールドを追加してリロードする', async () => {
      const newField: Field = {
        fieldId: 'test-field',
        name: 'テストフィールド',
        type: 'number',
        unit: 'kg',
        order: 1,
        defaultDisplay: true,
      };

      mockDb.addField.mockResolvedValue(undefined);
      mockDb.getAllFields.mockResolvedValue([newField]);

      const { addField } = useRecordsStore.getState();
      await addField(newField);

      expect(mockDb.addField).toHaveBeenCalledWith(newField);
      expect(mockDb.getAllFields).toHaveBeenCalledTimes(1);

      const { fields } = useRecordsStore.getState();
      expect(fields).toEqual([newField]);
    });
  });

  describe('updateRecord', () => {
    it('レコードを更新してリロードする', async () => {
      const updatedRecord: RecordItem = {
        id: 'test-1',
        date: '2024-01-01',
        time: '08:00',
        datetime: '2024-01-01T08:00:00.000Z',
        fieldId: 'weight',
        value: 66.0,
      };

      mockDb.updateRecord.mockResolvedValue(undefined);
      mockDb.getAllRecords.mockResolvedValue([updatedRecord]);

      const { updateRecord } = useRecordsStore.getState();
      await updateRecord(updatedRecord);

      expect(mockDb.updateRecord).toHaveBeenCalledWith(updatedRecord);
      expect(mockDb.getAllRecords).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteRecord', () => {
    it('レコードを削除してリロードする', async () => {
      const recordId = 'test-1';

      mockDb.deleteRecord.mockResolvedValue(undefined);
      mockDb.getAllRecords.mockResolvedValue([]);

      const { deleteRecord } = useRecordsStore.getState();
      await deleteRecord(recordId);

      expect(mockDb.deleteRecord).toHaveBeenCalledWith(recordId);
      expect(mockDb.getAllRecords).toHaveBeenCalledTimes(1);

      const { records } = useRecordsStore.getState();
      expect(records).toEqual([]);
    });
  });

  describe('initializeFields', () => {
    it('フィールドが空の場合、初期フィールドを追加する', async () => {
      mockDb.getAllFields.mockResolvedValue([]);
      mockDb.addField.mockResolvedValue(undefined);

      const { initializeFields } = useRecordsStore.getState();
      await initializeFields();

      // 初期フィールドの数だけaddFieldが呼ばれることを確認
      expect(mockDb.addField).toHaveBeenCalledTimes(10); // initialFieldsの数

      // 初期フィールドの内容を確認
      const addFieldCalls = mockDb.addField.mock.calls;
      expect(addFieldCalls[0][0]).toEqual(
        expect.objectContaining({
          fieldId: 'weight',
          name: '体重',
          unit: 'kg',
          type: 'number',
        })
      );
    });

    it('フィールドが既に存在する場合、何もしない', async () => {
      const existingFields: Field[] = [
        { fieldId: 'weight', name: '体重', type: 'number', unit: 'kg' },
      ];

      mockDb.getAllFields.mockResolvedValue(existingFields);

      const { initializeFields } = useRecordsStore.getState();
      await initializeFields();

      expect(mockDb.addField).not.toHaveBeenCalled();
    });
  });

  describe('deleteAllData', () => {
    it('全データを削除してストアをリセットする', async () => {
      // 初期状態でデータがある状態を設定
      useRecordsStore.setState({
        records: [
          {
            id: 'test',
            date: '2024-01-01',
            time: '08:00',
            datetime: '2024-01-01T08:00:00.000Z',
            fieldId: 'weight',
            value: 65,
          },
        ],
        fields: [{ fieldId: 'weight', name: '体重', type: 'number' }],
      });

      mockDb.deleteAllData.mockResolvedValue(undefined);
      mockDb.getAllRecords.mockResolvedValue([]);
      mockDb.getAllFields.mockResolvedValue([]);

      const { deleteAllData } = useRecordsStore.getState();
      await deleteAllData();

      expect(mockDb.deleteAllData).toHaveBeenCalledTimes(1);

      const { records, fields } = useRecordsStore.getState();
      expect(records).toEqual([]);
      expect(fields).toEqual([]);
    });
  });
});
