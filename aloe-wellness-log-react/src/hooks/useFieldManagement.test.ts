import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecordsStore } from '../store/records';
import { useToastStore } from '../store/toast';
import { useFieldManagement } from './useFieldManagement';

// モック設定
vi.mock('../store/records');
vi.mock('../store/toast');
vi.mock('./useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleAsyncError: vi.fn(async fn => {
      try {
        return await fn();
      } catch (error) {
        console.error('Mock error:', error);
        return null;
      }
    }),
  }),
}));

const mockFields = [
  {
    fieldId: 'weight',
    name: '体重',
    unit: 'kg',
    type: 'number' as const,
    order: 1,
    defaultDisplay: true,
  },
  {
    fieldId: 'systolic_bp',
    name: '収縮期血圧',
    unit: 'mmHg',
    type: 'number' as const,
    order: 2,
    defaultDisplay: false,
  },
  {
    fieldId: 'exercise',
    name: '運動有無(早歩き)',
    type: 'boolean' as const,
    order: 6,
    defaultDisplay: true,
  },
];

describe('useFieldManagement', () => {
  const mockLoadFields = vi.fn();
  const mockAddField = vi.fn();
  const mockUpdateField = vi.fn();
  const mockDeleteField = vi.fn();
  const mockShowSuccess = vi.fn();

  beforeEach(() => {
    // useRecordsStore のモック
    vi.mocked(useRecordsStore).mockReturnValue({
      fields: mockFields,
      records: [],
      loadFields: mockLoadFields,
      addField: mockAddField,
      updateField: mockUpdateField,
      deleteField: mockDeleteField,
      // その他のstore関数
      loadRecords: vi.fn(),
      addRecord: vi.fn(),
      initializeFields: vi.fn(),
      updateRecord: vi.fn(),
      deleteRecord: vi.fn(),
      deleteAllRecords: vi.fn(),
      deleteAllFields: vi.fn(),
      deleteAllData: vi.fn(),
    });

    // useToastStore のモック
    vi.mocked(useToastStore).mockReturnValue({
      toasts: [],
      showSuccess: mockShowSuccess,
      showError: vi.fn(),
      showWarning: vi.fn(),
      showInfo: vi.fn(),
      removeToast: vi.fn(),
      clearToasts: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useFieldManagement());

    expect(result.current.showSelectField).toBe(false);
    expect(result.current.showAddField).toBe(false);
    expect(result.current.newField).toEqual({
      name: '',
      type: 'number',
      unit: '',
    });
    expect(result.current.editFieldId).toBe(null);
    expect(result.current.addFieldError).toBe(null);
  });

  it('getHiddenFields が非表示項目を正しく返す', () => {
    const { result } = renderHook(() => useFieldManagement());

    const hiddenFields = result.current.getHiddenFields();

    expect(hiddenFields).toHaveLength(1);
    expect(hiddenFields[0].fieldId).toBe('systolic_bp');
    expect(hiddenFields[0].defaultDisplay).toBe(false);
  });

  it('setShowSelectField が状態を更新する', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.setShowSelectField(true);
    });

    expect(result.current.showSelectField).toBe(true);
  });

  it('setNewField が新規フィールド状態を更新する', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.setNewField({
        name: 'テスト項目',
        type: 'string',
        unit: 'test',
      });
    });

    expect(result.current.newField).toEqual({
      name: 'テスト項目',
      type: 'string',
      unit: 'test',
    });
  });

  it('handleEditField がフィールド編集状態を設定する', () => {
    const { result } = renderHook(() => useFieldManagement());

    const fieldToEdit = mockFields[0];

    act(() => {
      result.current.handleEditField(fieldToEdit);
    });

    expect(result.current.editFieldId).toBe('weight');
    expect(result.current.editField).toEqual({
      name: '体重',
      unit: 'kg',
    });
  });

  it('handleShowExistingField が一時表示フィールドを追加する', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.handleShowExistingField('systolic_bp');
    });

    expect(result.current.temporaryDisplayFields.has('systolic_bp')).toBe(true);
    expect(mockShowSuccess).toHaveBeenCalledWith(
      '項目を一時表示に追加しましたわ'
    );
  });

  it('toggleButtons がボタン表示状態を切り替える', () => {
    const { result } = renderHook(() => useFieldManagement());

    // 最初はfalse
    expect(result.current.areButtonsShown('weight')).toBe(false);

    act(() => {
      result.current.toggleButtons('weight');
    });

    expect(result.current.areButtonsShown('weight')).toBe(true);

    // もう一度実行で切り替わる
    act(() => {
      result.current.toggleButtons('weight');
    });

    expect(result.current.areButtonsShown('weight')).toBe(false);
  });

  it('setEditField が編集フィールド状態を更新する', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.setEditField({
        name: '更新された名前',
        unit: '更新された単位',
      });
    });

    expect(result.current.editField).toEqual({
      name: '更新された名前',
      unit: '更新された単位',
    });
  });

  it('setEditFieldId が編集フィールドIDを設定する', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.setEditFieldId('weight');
    });

    expect(result.current.editFieldId).toBe('weight');
  });

  it('複数の一時表示フィールドを管理できる', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.handleShowExistingField('systolic_bp');
      result.current.handleShowExistingField('heart_rate');
    });

    expect(result.current.temporaryDisplayFields.has('systolic_bp')).toBe(true);
    expect(result.current.temporaryDisplayFields.has('heart_rate')).toBe(true);
    expect(result.current.temporaryDisplayFields.size).toBe(2);
  });

  it('setShowAddField が新規追加フィールド表示状態を制御する', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.setShowAddField(true);
    });

    expect(result.current.showAddField).toBe(true);

    act(() => {
      result.current.setShowAddField(false);
    });

    expect(result.current.showAddField).toBe(false);
  });

  it('setShowSortModal がソートモーダル表示状態を制御する', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.setShowSortModal(true);
    });

    expect(result.current.showSortModal).toBe(true);
  });

  it('editingExistingFieldId が既存フィールド編集状態を管理する', () => {
    const { result } = renderHook(() => useFieldManagement());

    act(() => {
      result.current.setEditingExistingFieldId('weight');
    });

    expect(result.current.editingExistingFieldId).toBe('weight');
  });

  it('editingExistingField が既存フィールド編集内容を管理する', () => {
    const { result } = renderHook(() => useFieldManagement());

    const editContent = { name: '編集中の体重', unit: 'kg' };

    act(() => {
      result.current.setEditingExistingField(editContent);
    });

    expect(result.current.editingExistingField).toEqual(editContent);
  });

  it('handleEditExistingField が既存フィールドの編集状態を設定する', () => {
    const { result } = renderHook(() => useFieldManagement());

    const fieldToEdit = mockFields[1]; // systolic_bp

    act(() => {
      result.current.handleEditExistingField(fieldToEdit);
    });

    expect(result.current.editingExistingFieldId).toBe('systolic_bp');
    expect(result.current.editingExistingField).toEqual({
      name: '収縮期血圧',
      unit: 'mmHg',
    });
  });

  it('areSelectButtonsShown が選択ボタン表示状態を正しく返す', () => {
    const { result } = renderHook(() => useFieldManagement());

    // 初期状態
    expect(result.current.areSelectButtonsShown('weight')).toBe(false);

    // 表示状態に切り替え
    act(() => {
      result.current.toggleSelectButtons('weight');
    });

    expect(result.current.areSelectButtonsShown('weight')).toBe(true);
  });
});
