import { useState, useCallback, useMemo } from 'react';
import { getCurrentTimeString } from '../utils/dateUtils';
import type { WeightRecordV2 } from '../types/record';

// フォームの初期値
const initialFormValues = {
  weight: '',
  bodyFat: '',
  waist: '',
  time: getCurrentTimeString(),
  note: '',
  excludeFromGraph: false,
};

export interface WeightRecordFormState {
  weight: string;
  bodyFat: string;
  waist: string;
  time: string;
  note: string;
  excludeFromGraph: boolean;
}

export interface WeightRecordUIState {
  sparkleOpen: boolean;
  noteMenuOpen: boolean;
  isSubmitting: boolean;
  validationErrors: Partial<Record<keyof WeightRecordFormState, string>>;
}

export interface WeightRecordEditState {
  editingRecord: WeightRecordV2 | null;
  isEditing: boolean;
}

/**
 * WeightRecordページの状態管理を統合するカスタムフック
 */
export const useWeightRecordState = () => {
  // フォーム状態
  const [formData, setFormData] = useState<WeightRecordFormState>(initialFormValues);
  
  // UI状態
  const [uiState, setUIState] = useState<WeightRecordUIState>({
    sparkleOpen: false,
    noteMenuOpen: false,
    isSubmitting: false,
    validationErrors: {},
  });
  
  // 編集状態
  const [editState, setEditState] = useState<WeightRecordEditState>({
    editingRecord: null,
    isEditing: false,
  });

  // フォームフィールド更新
  const updateFormField = useCallback(<K extends keyof WeightRecordFormState>(
    field: K,
    value: WeightRecordFormState[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // バリデーションエラーをクリア
    if (uiState.validationErrors[field]) {
      setUIState(prev => ({
        ...prev,
        validationErrors: {
          ...prev.validationErrors,
          [field]: undefined,
        },
      }));
    }
  }, [uiState.validationErrors]);

  // UI状態更新
  const updateUIState = useCallback(<K extends keyof WeightRecordUIState>(
    field: K,
    value: WeightRecordUIState[K]
  ) => {
    setUIState(prev => ({ ...prev, [field]: value }));
  }, []);

  // 編集開始
  const startEditing = useCallback((record: WeightRecordV2) => {
    setFormData({
      weight: record.weight.toString(),
      bodyFat: record.bodyFat?.toString() || '',
      waist: record.waist?.toString() || '',
      time: record.time || getCurrentTimeString(),
      note: record.note || '',
      excludeFromGraph: record.excludeFromGraph || false,
    });
    
    setEditState({
      editingRecord: record,
      isEditing: true,
    });
  }, []);

  // 編集キャンセル
  const cancelEditing = useCallback(() => {
    setFormData(initialFormValues);
    setEditState({
      editingRecord: null,
      isEditing: false,
    });
    setUIState(prev => ({ ...prev, validationErrors: {} }));
  }, []);

  // フォームリセット
  const resetForm = useCallback(() => {
    setFormData(initialFormValues);
    setUIState(prev => ({ 
      ...prev, 
      validationErrors: {},
      sparkleOpen: false,
    }));
  }, []);

  // フォームバリデーション
  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof WeightRecordFormState, string>> = {};
    
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      errors.weight = '体重を入力してください';
    }
    
    if (formData.bodyFat && (parseFloat(formData.bodyFat) <= 0 || parseFloat(formData.bodyFat) > 100)) {
      errors.bodyFat = '体脂肪率は1-100%の範囲で入力してください';
    }
    
    if (formData.waist && parseFloat(formData.waist) <= 0) {
      errors.waist = 'ウエストは正の数値で入力してください';
    }

    setUIState(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  }, [formData]);

  // 計算されたプロパティ
  const computedProperties = useMemo(() => {
    const weight = parseFloat(formData.weight);
    const bodyFat = formData.bodyFat ? parseFloat(formData.bodyFat) : null;
    const waist = formData.waist ? parseFloat(formData.waist) : null;
    
    return {
      isFormValid: weight > 0,
      hasChanges: editState.isEditing 
        ? JSON.stringify(formData) !== JSON.stringify({
            weight: editState.editingRecord?.weight.toString() || '',
            bodyFat: editState.editingRecord?.bodyFat?.toString() || '',
            waist: editState.editingRecord?.waist?.toString() || '',
            time: editState.editingRecord?.time || getCurrentTimeString(),
            note: editState.editingRecord?.note || '',
            excludeFromGraph: editState.editingRecord?.excludeFromGraph || false,
          })
        : Object.values(formData).some(value => 
            typeof value === 'string' ? value.trim() !== '' : value !== false
          ),
      weight,
      bodyFat,
      waist,
    };
  }, [formData, editState]);

  // UI状態の便利なアクセサ
  const uiActions = {
    openSparkle: () => updateUIState('sparkleOpen', true),
    closeSparkle: () => updateUIState('sparkleOpen', false),
    openNoteMenu: () => updateUIState('noteMenuOpen', true),
    closeNoteMenu: () => updateUIState('noteMenuOpen', false),
    setSubmitting: (submitting: boolean) => updateUIState('isSubmitting', submitting),
  };

  return {
    // 状態
    formData,
    uiState,
    editState,
    
    // 計算されたプロパティ
    ...computedProperties,
    
    // アクション
    updateFormField,
    updateUIState,
    startEditing,
    cancelEditing,
    resetForm,
    validateForm,
    
    // UI アクション
    ...uiActions,
  };
};