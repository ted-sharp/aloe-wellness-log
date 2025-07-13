import { useState, useCallback, useMemo } from 'react';

export interface FormFieldValidation<T> {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T[keyof T]) => string | undefined;
}

export type FormValidationSchema<T> = {
  [K in keyof T]?: FormFieldValidation<T>;
};

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

export interface FormActions<T> {
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setError: <K extends keyof T>(field: K, error: string) => void;
  clearError: <K extends keyof T>(field: K) => void;
  clearErrors: () => void;
  setTouched: <K extends keyof T>(field: K, touched?: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  validate: () => boolean;
  validateField: <K extends keyof T>(field: K) => boolean;
  reset: () => void;
  resetToValues: (values: T) => void;
}

/**
 * 汎用的なフォーム状態管理フック
 * バリデーション、エラーハンドリング、フィールド追跡機能を提供
 */
export const useFormState = <T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: FormValidationSchema<T>
): FormState<T> & FormActions<T> => {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 単一フィールドのバリデーション
  const validateSingleField = useCallback(<K extends keyof T>(
    field: K,
    value: T[K],
    schema?: FormFieldValidation<T>
  ): string | undefined => {
    if (!schema) return undefined;

    // 必須チェック
    if (schema.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${String(field)}は必須です`;
    }

    // 数値範囲チェック
    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
      const numValue = Number(value);
      if (schema.min !== undefined && numValue < schema.min) {
        return `${String(field)}は${schema.min}以上である必要があります`;
      }
      if (schema.max !== undefined && numValue > schema.max) {
        return `${String(field)}は${schema.max}以下である必要があります`;
      }
    }

    // パターンチェック
    if (schema.pattern && typeof value === 'string' && !schema.pattern.test(value)) {
      return `${String(field)}の形式が正しくありません`;
    }

    // カスタムバリデーション
    if (schema.custom) {
      return schema.custom(value);
    }

    return undefined;
  }, []);

  // フォーム全体のバリデーション
  const validate = useCallback((): boolean => {
    if (!validationSchema) return true;

    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(fieldKey => {
      const field = fieldKey as keyof T;
      const fieldSchema = validationSchema[field];
      const error = validateSingleField(field, values[field], fieldSchema);
      
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrorsState(newErrors);
    return isValid;
  }, [values, validationSchema, validateSingleField]);

  // 単一フィールドのバリデーション
  const validateField = useCallback(<K extends keyof T>(field: K): boolean => {
    if (!validationSchema?.[field]) return true;

    const error = validateSingleField(field, values[field], validationSchema[field]);
    
    if (error) {
      setErrorsState(prev => ({ ...prev, [field]: error }));
      return false;
    } else {
      setErrorsState(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }
  }, [values, validationSchema, validateSingleField]);

  // フィールド値の更新
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    
    // タッチ状態を更新
    setTouchedState(prev => ({ ...prev, [field]: true }));
    
    // リアルタイムバリデーション（タッチされている場合のみ）
    if (touched[field] && validationSchema?.[field]) {
      const error = validateSingleField(field, value, validationSchema[field]);
      if (error) {
        setErrorsState(prev => ({ ...prev, [field]: error }));
      } else {
        setErrorsState(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  }, [touched, validationSchema, validateSingleField]);

  // 複数フィールドの更新
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  // エラー設定
  const setError = useCallback(<K extends keyof T>(field: K, error: string) => {
    setErrorsState(prev => ({ ...prev, [field]: error }));
  }, []);

  // エラークリア
  const clearError = useCallback(<K extends keyof T>(field: K) => {
    setErrorsState(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // 全エラークリア
  const clearErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  // タッチ状態設定
  const setTouched = useCallback(<K extends keyof T>(field: K, touchedValue = true) => {
    setTouchedState(prev => ({ ...prev, [field]: touchedValue }));
  }, []);

  // 送信状態設定
  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  // リセット
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrorsState({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  // 特定の値にリセット
  const resetToValues = useCallback((newValues: T) => {
    setValuesState(newValues);
    setErrorsState({});
    setTouchedState({});
    setIsSubmitting(false);
  }, []);

  // 計算されたプロパティ
  const computedState = useMemo(() => {
    const isValid = Object.keys(errors).length === 0;
    const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
    
    return { isValid, isDirty };
  }, [values, errors, initialValues]);

  return {
    // 状態
    values,
    errors,
    touched,
    isSubmitting,
    ...computedState,
    
    // アクション
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    setTouched,
    setSubmitting,
    validate,
    validateField,
    reset,
    resetToValues,
  };
};