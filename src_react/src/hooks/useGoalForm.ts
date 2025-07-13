import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGoalStore } from '../store/goal';
import { getAllWeightRecords } from '../db';
import type { GoalData } from '../types/goal';
import type { WeightRecordV2 } from '../types/record';
import { useYearValidation, useHeightValidation, useWeightValidation } from './useNumericValidation';
import { VALIDATION_MESSAGES } from '../constants/goalExamples';

// フォーム状態の型定義
export interface GoalFormData {
  // 個人情報
  gender: string;
  birthYear: string;
  height: string;
  
  // 体重情報
  startWeight: string;
  targetWeight: string;
  
  // 期間設定
  targetStart: string;
  targetEnd: string;
  
  // 目標テキスト
  exerciseGoal: string;
  dietGoal: string;
  sleepGoal: string;
  smokingGoal: string;
  alcoholGoal: string;
}

// バリデーションエラーの型定義
export interface GoalFormErrors {
  gender?: string;
  birthYear?: string;
  height?: string;
  startWeight?: string;
  targetWeight?: string;
  targetStart?: string;
  targetEnd?: string;
  exerciseGoal?: string;
  dietGoal?: string;
  sleepGoal?: string;
  smokingGoal?: string;
  alcoholGoal?: string;
}

// 体重記録情報の型定義
export interface WeightRecordInfo {
  latest: WeightRecordV2 | null;
  oldest: WeightRecordV2 | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 目標設定フォームの統合管理フック
 * フォーム状態、バリデーション、自動保存、体重記録取得を一元管理
 */
export const useGoalForm = () => {
  // フォーム状態
  const [formData, setFormData] = useState<GoalFormData>({
    gender: '',
    birthYear: '',
    height: '',
    startWeight: '',
    targetWeight: '',
    targetStart: '',
    targetEnd: '',
    exerciseGoal: '',
    dietGoal: '',
    sleepGoal: '',
    smokingGoal: '',
    alcoholGoal: '',
  });

  // バリデーション状態
  const [errors, setErrors] = useState<GoalFormErrors>({});
  const [isTouched, setIsTouched] = useState(false);

  // 保存状態
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 体重記録情報
  const [weightRecords, setWeightRecords] = useState<WeightRecordInfo>({
    latest: null,
    oldest: null,
    isLoading: false,
    error: null,
  });

  // 目標ストア
  const { goal, setGoal, loadGoal } = useGoalStore();

  // バリデーションフック
  const yearValidation = useYearValidation(formData.birthYear, '生年');
  const heightValidation = useHeightValidation(formData.height, '身長');
  const startWeightValidation = useWeightValidation(formData.startWeight, '開始時体重');
  const targetWeightValidation = useWeightValidation(formData.targetWeight, '目標体重');

  /**
   * 日付のバリデーション
   */
  const validateDate = useCallback((dateStr: string, fieldName: string): string | null => {
    if (!dateStr) {
      return `${fieldName}${VALIDATION_MESSAGES.required}`;
    }

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(date.getTime())) {
      return VALIDATION_MESSAGES.invalidDateFormat;
    }

    if (date < today) {
      return VALIDATION_MESSAGES.futureDateRequired;
    }

    return null;
  }, []);

  /**
   * 日付範囲のバリデーション
   */
  const validateDateRange = useCallback((startDate: string, endDate: string): string | null => {
    if (!startDate || !endDate) {
      return null; // 個別フィールドでエラーを表示
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return VALIDATION_MESSAGES.invalidDateRange;
    }

    return null;
  }, []);

  /**
   * フォーム全体のバリデーション
   */
  const validateForm = useCallback((): GoalFormErrors => {
    const newErrors: GoalFormErrors = {};

    // 必須フィールドのチェック
    if (!formData.gender) newErrors.gender = VALIDATION_MESSAGES.required;

    // 数値フィールドのバリデーション
    if (yearValidation) newErrors.birthYear = yearValidation;
    if (heightValidation) newErrors.height = heightValidation;
    if (startWeightValidation) newErrors.startWeight = startWeightValidation;
    if (targetWeightValidation) newErrors.targetWeight = targetWeightValidation;

    // 日付フィールドのバリデーション
    const startDateError = validateDate(formData.targetStart, '目標開始日');
    if (startDateError) newErrors.targetStart = startDateError;

    const endDateError = validateDate(formData.targetEnd, '目標終了日');
    if (endDateError) newErrors.targetEnd = endDateError;

    // 日付範囲のバリデーション
    const dateRangeError = validateDateRange(formData.targetStart, formData.targetEnd);
    if (dateRangeError) {
      newErrors.targetEnd = dateRangeError;
    }

    return newErrors;
  }, [
    formData,
    yearValidation,
    heightValidation,
    startWeightValidation,
    targetWeightValidation,
    validateDate,
    validateDateRange,
  ]);

  /**
   * フィールド値の更新
   */
  const updateField = useCallback(<K extends keyof GoalFormData>(
    field: K,
    value: GoalFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsTouched(true);

    // フィールド単位でのリアルタイムバリデーション
    if (isTouched) {
      const newErrors = validateForm();
      setErrors(newErrors);
    }
  }, [isTouched, validateForm]);

  /**
   * 複数フィールドの一括更新
   */
  const updateFields = useCallback((updates: Partial<GoalFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsTouched(true);
  }, []);

  /**
   * 体重記録の読み込み
   */
  const loadWeightRecords = useCallback(async () => {
    try {
      setWeightRecords(prev => ({ ...prev, isLoading: true, error: null }));
      
      const records = await getAllWeightRecords();
      
      if (records.length === 0) {
        setWeightRecords({
          latest: null,
          oldest: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // 日付でソート
      const sortedRecords = records.sort((a, b) => a.date.localeCompare(b.date));
      const latest = sortedRecords[sortedRecords.length - 1];
      const oldest = sortedRecords[0];

      setWeightRecords({
        latest,
        oldest,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setWeightRecords(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '体重記録の取得に失敗しました',
      }));
    }
  }, []);

  /**
   * 現在の年齢を計算
   */
  const calculateAge = useCallback((): number | null => {
    const year = parseInt(formData.birthYear);
    if (isNaN(year)) return null;
    
    const currentYear = new Date().getFullYear();
    return currentYear - year;
  }, [formData.birthYear]);

  /**
   * フォームデータをGoalDataに変換
   */
  const convertToGoalData = useCallback((): GoalData => {
    const age = calculateAge();
    
    return {
      gender: formData.gender as 'male' | 'female' | 'unknown' | undefined,
      age,
      height: parseFloat(formData.height) || undefined,
      currentWeight: parseFloat(formData.startWeight) || undefined,
      targetWeight: parseFloat(formData.targetWeight),
      targetDate: formData.targetEnd,
      targetStart: formData.targetStart,
      exerciseGoal: formData.exerciseGoal,
      dietGoal: formData.dietGoal,
      sleepGoal: formData.sleepGoal,
      smokingGoal: formData.smokingGoal,
      alcoholGoal: formData.alcoholGoal,
    };
  }, [formData, calculateAge]);

  /**
   * 自動保存の実行
   */
  const autoSave = useCallback(async (): Promise<boolean> => {
    try {
      setIsSaving(true);
      
      const validationErrors = validateForm();
      
      // 基本フィールドに必須エラーがある場合は保存しない
      const hasRequiredErrors = validationErrors.gender || 
                               validationErrors.targetWeight ||
                               validationErrors.targetStart ||
                               validationErrors.targetEnd;
      
      if (hasRequiredErrors) {
        return false;
      }

      const goalData = convertToGoalData();
      await setGoal(goalData);
      setLastSaved(new Date());
      
      return true;
    } catch (error) {
      console.error('Auto-save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [validateForm, convertToGoalData, setGoal]);

  /**
   * 手動保存の実行
   */
  const saveForm = useCallback(async (): Promise<{ success: boolean; errors?: GoalFormErrors }> => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return { success: false, errors: validationErrors };
    }

    const success = await autoSave();
    return { success };
  }, [validateForm, autoSave]);

  /**
   * フォームのリセット
   */
  const resetForm = useCallback(() => {
    setFormData({
      gender: '',
      birthYear: '',
      height: '',
      startWeight: '',
      targetWeight: '',
      targetStart: '',
      targetEnd: '',
      exerciseGoal: '',
      dietGoal: '',
      sleepGoal: '',
      smokingGoal: '',
      alcoholGoal: '',
    });
    setErrors({});
    setIsTouched(false);
    setLastSaved(null);
  }, []);

  /**
   * 既存目標データの読み込み
   */
  const loadExistingGoal = useCallback(async () => {
    try {
      await loadGoal();
      
      if (goal) {
        const currentYear = new Date().getFullYear();
        const birthYear = goal.age ? (currentYear - goal.age).toString() : '';
        
        setFormData({
          gender: goal.gender || '',
          birthYear,
          height: goal.height?.toString() || '',
          startWeight: goal.currentWeight?.toString() || '',
          targetWeight: goal.targetWeight?.toString() || '',
          targetStart: goal.targetStart || '',
          targetEnd: goal.targetDate || '',
          exerciseGoal: goal.exerciseGoal || '',
          dietGoal: goal.dietGoal || '',
          sleepGoal: goal.sleepGoal || '',
          smokingGoal: goal.smokingGoal || '',
          alcoholGoal: goal.alcoholGoal || '',
        });
      }
    } catch (error) {
      console.error('Failed to load existing goal:', error);
    }
  }, [loadGoal, goal]);

  // 計算されたプロパティ
  const computed = useMemo(() => {
    const currentAge = calculateAge();
    const isFormValid = Object.keys(validateForm()).length === 0;
    const hasUnsavedChanges = isTouched && (!lastSaved || new Date().getTime() - lastSaved.getTime() > 5000);
    
    return {
      currentAge,
      isFormValid,
      hasUnsavedChanges,
    };
  }, [calculateAge, validateForm, isTouched, lastSaved]);

  // 初期化とオートセーブのエフェクト
  useEffect(() => {
    loadExistingGoal();
    loadWeightRecords();
  }, [loadExistingGoal, loadWeightRecords]);

  // 自動保存のエフェクト（5秒後）
  useEffect(() => {
    if (!isTouched) return;

    const timer = setTimeout(() => {
      autoSave();
    }, 5000);

    return () => clearTimeout(timer);
  }, [formData, isTouched, autoSave]);

  return {
    // フォーム状態
    formData,
    errors,
    isTouched,
    isSaving,
    lastSaved,
    
    // 体重記録情報
    weightRecords,
    
    // 計算されたプロパティ
    ...computed,
    
    // アクション
    updateField,
    updateFields,
    saveForm,
    resetForm,
    loadWeightRecords,
    
    // ヘルパー関数
    calculateAge,
    
    // バリデーション
    validateForm,
  };
};