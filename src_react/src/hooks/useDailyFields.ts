import { useState, useCallback, useEffect } from 'react';
import {
  addDailyField,
  deleteDailyField,
  getAllDailyFields,
  updateDailyField,
} from '../db';
import type { DailyFieldV2 } from '../types/record';

// デフォルトフィールドの定義
const DEFAULT_FIELDS: Omit<DailyFieldV2, 'fieldId'>[] = [
  { name: '運動', order: 1, display: true },
  { name: '朝食', order: 2, display: true },
  { name: '昼食', order: 3, display: true },
  { name: '夕食', order: 4, display: true },
  { name: '睡眠', order: 5, display: true },
  { name: '禁煙', order: 6, display: true },
  { name: '禁酒', order: 7, display: true },
];

/**
 * 日課フィールド管理フック
 * フィールドの CRUD 操作、バリデーション、デフォルト初期化を管理
 */
export const useDailyFields = () => {
  // 状態管理
  const [fields, setFields] = useState<DailyFieldV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィールド追加用の状態
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [addFieldError, setAddFieldError] = useState<string | null>(null);

  /**
   * 全フィールドの読み込み
   */
  const loadFields = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allFields = await getAllDailyFields();
      
      // フィールドが存在しない場合はデフォルトフィールドを作成
      if (allFields.length === 0) {
        await initializeDefaultFields();
        return;
      }
      
      // 表示順でソート（displayOrderがない場合はorderを使用）
      const sortedFields = allFields.sort((a, b) => (a.displayOrder ?? a.order) - (b.displayOrder ?? b.order));
      setFields(sortedFields);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '日課フィールドの読み込みに失敗しました';
      setError(errorMessage);
      console.error('Error loading daily fields:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * デフォルトフィールドの初期化
   */
  const initializeDefaultFields = useCallback(async () => {
    try {
      const createdFields: DailyFieldV2[] = [];
      
      for (const fieldData of DEFAULT_FIELDS) {
        const fieldId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const field: DailyFieldV2 = {
          ...fieldData,
          fieldId,
        };
        
        await addDailyField(field);
        createdFields.push(field);
      }
      
      setFields(createdFields);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'デフォルトフィールドの作成に失敗しました';
      setError(errorMessage);
      console.error('Error initializing default fields:', err);
    }
  }, []);

  /**
   * 新しいフィールドの追加
   */
  const addField = useCallback(async (fieldName: string): Promise<boolean> => {
    try {
      setAddFieldError(null);
      
      // バリデーション
      const trimmedName = fieldName.trim();
      if (!trimmedName) {
        setAddFieldError('フィールド名を入力してください');
        return false;
      }
      
      if (trimmedName.length > 20) {
        setAddFieldError('フィールド名は20文字以内で入力してください');
        return false;
      }
      
      // 重複チェック（fieldNameまたはnameを使用）
      const isDuplicate = fields.some(field => 
        (field.fieldName ?? field.name).toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (isDuplicate) {
        setAddFieldError('同じ名前のフィールドが既に存在します');
        return false;
      }
      
      // 新しいフィールドの作成
      const fieldId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const maxOrder = Math.max(...fields.map(f => f.displayOrder ?? f.order), 0);
      
      const newField: DailyFieldV2 = {
        fieldId,
        name: trimmedName,
        order: maxOrder + 1,
        display: true,
        fieldName: trimmedName,
        displayOrder: maxOrder + 1,
        isDefault: false,
      };
      
      await addDailyField(newField);
      setFields(prev => [...prev, newField]);
      
      // フォーム状態をリセット
      setNewFieldName('');
      setIsAddingField(false);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'フィールドの追加に失敗しました';
      setAddFieldError(errorMessage);
      console.error('Error adding field:', err);
      return false;
    }
  }, [fields]);

  /**
   * フィールドの更新
   */
  const updateField = useCallback(async (fieldId: string, updates: Partial<DailyFieldV2>): Promise<boolean> => {
    try {
      setError(null);
      
      const fieldToUpdate = fields.find(f => f.fieldId === fieldId);
      if (!fieldToUpdate) {
        setError('更新対象のフィールドが見つかりません');
        return false;
      }
      
      const updatedField = { ...fieldToUpdate, ...updates };
      
      // フィールド名の重複チェック（名前が変更された場合）
      if (updates.fieldName) {
        const trimmedName = updates.fieldName.trim();
        const isDuplicate = fields.some(field => 
          field.fieldId !== fieldId && 
          (field.fieldName ?? field.name).toLowerCase() === trimmedName.toLowerCase()
        );
        
        if (isDuplicate) {
          setError('同じ名前のフィールドが既に存在します');
          return false;
        }
      }
      
      await updateDailyField(updatedField);
      setFields(prev => 
        prev.map(field => 
          field.fieldId === fieldId ? updatedField : field
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'フィールドの更新に失敗しました';
      setError(errorMessage);
      console.error('Error updating field:', err);
      return false;
    }
  }, [fields]);

  /**
   * フィールドの削除
   */
  const deleteField = useCallback(async (fieldId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const fieldToDelete = fields.find(f => f.fieldId === fieldId);
      if (!fieldToDelete) {
        setError('削除対象のフィールドが見つかりません');
        return false;
      }
      
      // デフォルトフィールドの削除を防ぐ
      if (fieldToDelete.isDefault) {
        setError('デフォルトフィールドは削除できません');
        return false;
      }
      
      await deleteDailyField(fieldId);
      setFields(prev => prev.filter(field => field.fieldId !== fieldId));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'フィールドの削除に失敗しました';
      setError(errorMessage);
      console.error('Error deleting field:', err);
      return false;
    }
  }, [fields]);

  /**
   * フィールドの並び順を更新
   */
  const reorderFields = useCallback(async (newOrder: DailyFieldV2[]): Promise<boolean> => {
    try {
      setError(null);
      
      // 各フィールドの displayOrder を更新
      const updatedFields = newOrder.map((field, index) => ({
        ...field,
        displayOrder: index + 1,
      }));
      
      // 全フィールドを更新
      for (const field of updatedFields) {
        await updateDailyField(field);
      }
      
      setFields(updatedFields);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'フィールドの並び替えに失敗しました';
      setError(errorMessage);
      console.error('Error reordering fields:', err);
      return false;
    }
  }, []);

  /**
   * フィールド追加フォームの状態管理
   */
  const addFormActions = {
    open: () => setIsAddingField(true),
    close: () => {
      setIsAddingField(false);
      setNewFieldName('');
      setAddFieldError(null);
    },
    setName: setNewFieldName,
    submit: () => addField(newFieldName),
  };

  /**
   * エラー状態のクリア
   */
  const clearError = useCallback(() => {
    setError(null);
    setAddFieldError(null);
  }, []);

  // 初期化
  useEffect(() => {
    loadFields();
  }, [loadFields]);

  return {
    // 状態
    fields,
    isLoading,
    error,
    
    // フィールド追加フォーム
    isAddingField,
    newFieldName,
    addFieldError,
    
    // 操作
    loadFields,
    addField,
    updateField,
    deleteField,
    reorderFields,
    
    // フォーム操作
    addFormActions,
    
    // エラー管理
    clearError,
    
    // 便利な計算プロパティ
    hasFields: fields.length > 0,
    sortedFields: fields.sort((a, b) => (a.displayOrder ?? a.order) - (b.displayOrder ?? b.order)),
  };
};