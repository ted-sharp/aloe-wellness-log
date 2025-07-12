import { useCallback, useState } from 'react';
import { getCurrentTimeString } from '../utils/dateUtils';

/**
 * 記録フォームの状態管理を行うフック
 */
interface UseRecordFormOptions<T> {
  initialValues: T;
  createRecord: (formData: T, date: string) => any;
  resetValues?: Partial<T>;
}

interface UseRecordFormReturn<T> {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  updateField: (field: keyof T, value: T[keyof T]) => void;
  resetForm: () => void;
  createRecordFromForm: (date: string) => any;
}

export function useRecordForm<T extends Record<string, any>>({
  initialValues,
  createRecord,
  resetValues,
}: UseRecordFormOptions<T>): UseRecordFormReturn<T> {
  const [formData, setFormData] = useState<T>(initialValues);

  // フィールド更新
  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // フォームリセット
  const resetForm = useCallback(() => {
    setFormData({
      ...initialValues,
      ...resetValues,
      time: getCurrentTimeString(), // 時刻は常に現在時刻にリセット
    } as T);
  }, [initialValues, resetValues]);

  // レコード作成
  const createRecordFromForm = useCallback((date: string) => {
    return createRecord(formData, date);
  }, [formData, createRecord]);

  return {
    formData,
    setFormData,
    updateField,
    resetForm,
    createRecordFromForm,
  };
}