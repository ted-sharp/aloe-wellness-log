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
  batchUpdateFields: vi.fn(),
  batchUpdateRecords: vi.fn(),
  // DbErrorクラスとDbErrorTypeのモック
  DbError: class DbError extends Error {
    constructor(
      public type: string,
      message: string,
      public originalError?: unknown,
      public retryable: boolean = true
    ) {
      super(message);
      this.name = 'DbError';
    }
  },
  DbErrorType: {
    CONNECTION_FAILED: 'connection_failed',
    TRANSACTION_FAILED: 'transaction_failed',
    DATA_CORRUPTED: 'data_corrupted',
    QUOTA_EXCEEDED: 'quota_exceeded',
    VERSION_ERROR: 'version_error',
    UNKNOWN: 'unknown',
  },
}));

import * as db from '../db/indexedDb';

// モックされたdbモジュール
const mockDb = vi.mocked(db);

describe('useRecordsStore', () => {
  beforeEach(() => {
    // ストアの状態をリセット
    useRecordsStore.setState({
      records: [],
      fields: [],
      recordsOperation: { loading: false, error: null },
      fieldsOperation: { loading: false, error: null },
    });

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
      mockDb.batchUpdateFields.mockResolvedValue(undefined);

      const { loadFields } = useRecordsStore.getState();
      await loadFields();

      expect(mockDb.getAllFields).toHaveBeenCalledTimes(1);
      expect(mockDb.batchUpdateFields).toHaveBeenCalledTimes(1); // バッチ更新による最適化

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

      expect(mockDb.batchUpdateFields).not.toHaveBeenCalled();
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
    it('楽観的更新でレコードを追加する', async () => {
      const newRecord: RecordItem = {
        id: 'test-1',
        date: '2024-01-01',
        time: '08:00',
        datetime: '2024-01-01T08:00:00.000Z',
        fieldId: 'weight',
        value: 65.5,
      };

      mockDb.addRecord.mockResolvedValue(undefined);

      const { addRecord } = useRecordsStore.getState();
      await addRecord(newRecord);

      expect(mockDb.addRecord).toHaveBeenCalledWith(newRecord);
      // 楽観的更新により、getAllRecordsは呼ばれない
      expect(mockDb.getAllRecords).not.toHaveBeenCalled();

      const { records } = useRecordsStore.getState();
      expect(records).toEqual([newRecord]);
    });

    it('エラー時にロールバックする', async () => {
      const newRecord: RecordItem = {
        id: 'test-1',
        date: '2024-01-01',
        time: '08:00',
        datetime: '2024-01-01T08:00:00.000Z',
        fieldId: 'weight',
        value: 65.5,
      };

      const error = new Error('Database error');
      mockDb.addRecord.mockRejectedValue(error);

      const { addRecord } = useRecordsStore.getState();

      await expect(addRecord(newRecord)).rejects.toThrow('Database error');

      // エラー時のロールバック確認
      const { records } = useRecordsStore.getState();
      expect(records).toEqual([]);
    });
  });

  describe('addField', () => {
    it('楽観的更新でフィールドを追加する', async () => {
      const newField: Field = {
        fieldId: 'test-field',
        name: 'テストフィールド',
        type: 'number',
        unit: 'kg',
        order: 1,
        defaultDisplay: true,
      };

      mockDb.addField.mockResolvedValue(undefined);

      const { addField } = useRecordsStore.getState();
      await addField(newField);

      expect(mockDb.addField).toHaveBeenCalledWith(newField);
      // 楽観的更新により、getAllFieldsは呼ばれない
      expect(mockDb.getAllFields).not.toHaveBeenCalled();

      const { fields } = useRecordsStore.getState();
      expect(fields).toEqual([newField]);
    });
  });

  describe('updateRecord', () => {
    it('楽観的更新でレコードを更新する', async () => {
      const originalRecord: RecordItem = {
        id: 'test-1',
        date: '2024-01-01',
        time: '08:00',
        datetime: '2024-01-01T08:00:00.000Z',
        fieldId: 'weight',
        value: 65.5,
      };

      const updatedRecord: RecordItem = {
        ...originalRecord,
        value: 66.0,
      };

      // 初期状態を設定
      useRecordsStore.setState({
        records: [originalRecord],
        recordsOperation: { loading: false, error: null },
        fieldsOperation: { loading: false, error: null },
      });

      mockDb.updateRecord.mockResolvedValue(undefined);

      const { updateRecord } = useRecordsStore.getState();
      await updateRecord(updatedRecord);

      expect(mockDb.updateRecord).toHaveBeenCalledWith(updatedRecord);
      // 楽観的更新により、getAllRecordsは呼ばれない
      expect(mockDb.getAllRecords).not.toHaveBeenCalled();

      const { records } = useRecordsStore.getState();
      expect(records[0].value).toBe(66.0);
    });
  });

  describe('deleteRecord', () => {
    it('楽観的更新でレコードを削除する', async () => {
      const recordToDelete: RecordItem = {
        id: 'test-1',
        date: '2024-01-01',
        time: '08:00',
        datetime: '2024-01-01T08:00:00.000Z',
        fieldId: 'weight',
        value: 65.5,
      };

      // 初期状態を設定
      useRecordsStore.setState({
        records: [recordToDelete],
        recordsOperation: { loading: false, error: null },
        fieldsOperation: { loading: false, error: null },
      });

      mockDb.deleteRecord.mockResolvedValue(undefined);

      const { deleteRecord } = useRecordsStore.getState();
      await deleteRecord('test-1');

      expect(mockDb.deleteRecord).toHaveBeenCalledWith('test-1');
      // 楽観的更新により、getAllRecordsは呼ばれない
      expect(mockDb.getAllRecords).not.toHaveBeenCalled();

      const { records } = useRecordsStore.getState();
      expect(records).toEqual([]);
    });
  });

  describe('initializeFields', () => {
    it('フィールドが空の場合、初期フィールドをバッチ追加する', async () => {
      mockDb.getAllFields.mockResolvedValue([]);
      mockDb.batchUpdateFields.mockResolvedValue(undefined);

      const { initializeFields } = useRecordsStore.getState();
      await initializeFields();

      // バッチ更新が使用されることを確認
      expect(mockDb.batchUpdateFields).toHaveBeenCalledTimes(1);
      expect(mockDb.addField).not.toHaveBeenCalled();

      // 初期フィールドの内容を確認
      const batchUpdateCall = mockDb.batchUpdateFields.mock.calls[0][0];
      expect(batchUpdateCall).toHaveLength(10); // initialFieldsの数
      expect(batchUpdateCall[0]).toEqual(
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

      expect(mockDb.batchUpdateFields).not.toHaveBeenCalled();
      expect(mockDb.addField).not.toHaveBeenCalled();
    });
  });

  describe('batchUpdateRecords', () => {
    it('複数のレコードを効率的に更新する', async () => {
      const records: RecordItem[] = [
        {
          id: 'test-1',
          date: '2024-01-01',
          time: '08:00',
          datetime: '2024-01-01T08:00:00.000Z',
          fieldId: 'weight',
          value: 65.5,
        },
        {
          id: 'test-2',
          date: '2024-01-01',
          time: '09:00',
          datetime: '2024-01-01T09:00:00.000Z',
          fieldId: 'exercise',
          value: true,
        },
      ];

      mockDb.batchUpdateRecords.mockResolvedValue(undefined);

      const { batchUpdateRecords } = useRecordsStore.getState();
      await batchUpdateRecords(records);

      expect(mockDb.batchUpdateRecords).toHaveBeenCalledWith(records);

      const { records: storeRecords } = useRecordsStore.getState();
      expect(storeRecords).toEqual(records);
    });
  });

  describe('deleteAllData', () => {
    it('楽観的更新で全データを削除する', async () => {
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
        recordsOperation: { loading: false, error: null },
        fieldsOperation: { loading: false, error: null },
      });

      mockDb.deleteAllData.mockResolvedValue(undefined);

      const { deleteAllData } = useRecordsStore.getState();
      await deleteAllData();

      expect(mockDb.deleteAllData).toHaveBeenCalledTimes(1);
      // 楽観的更新により、getAllRecords, getAllFieldsは呼ばれない
      expect(mockDb.getAllRecords).not.toHaveBeenCalled();
      expect(mockDb.getAllFields).not.toHaveBeenCalled();

      const { records, fields } = useRecordsStore.getState();
      expect(records).toEqual([]);
      expect(fields).toEqual([]);
    });
  });

  describe('操作状態管理', () => {
    it('レコード操作中のloading状態を管理する', async () => {
      const newRecord: RecordItem = {
        id: 'test-1',
        date: '2024-01-01',
        time: '08:00',
        datetime: '2024-01-01T08:00:00.000Z',
        fieldId: 'weight',
        value: 65.5,
      };

      let resolveAddRecord: () => void;
      const addRecordPromise = new Promise<void>(resolve => {
        resolveAddRecord = resolve;
      });
      mockDb.addRecord.mockReturnValue(addRecordPromise);

      const { addRecord } = useRecordsStore.getState();
      const operationPromise = addRecord(newRecord);

      // 操作中のloading状態を確認
      const { recordsOperation } = useRecordsStore.getState();
      expect(recordsOperation.loading).toBe(true);
      expect(recordsOperation.error).toBe(null);

      // 操作完了
      resolveAddRecord!();
      await operationPromise;

      // 完了後の状態を確認
      const { recordsOperation: finalState } = useRecordsStore.getState();
      expect(finalState.loading).toBe(false);
      expect(finalState.error).toBe(null);
    });

    it('エラー状態をクリアする', () => {
      const error = new mockDb.DbError(
        mockDb.DbErrorType.UNKNOWN,
        'Test error',
        undefined,
        true
      );

      // エラー状態を設定
      useRecordsStore.setState({
        recordsOperation: { loading: false, error },
      });

      const { clearRecordsError } = useRecordsStore.getState();
      clearRecordsError();

      const { recordsOperation } = useRecordsStore.getState();
      expect(recordsOperation.error).toBe(null);
    });
  });
});
