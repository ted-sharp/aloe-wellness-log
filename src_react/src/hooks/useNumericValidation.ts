import { useMemo } from 'react';

/**
 * 数値バリデーション用のオプション
 */
interface NumericValidationOptions {
  min: number;
  max: number;
  required?: boolean;
  fieldName: string;
  step?: number;
}

/**
 * 数値範囲バリデーションフック
 * 
 * @param value バリデーション対象の値（文字列）
 * @param options バリデーションオプション
 * @returns エラーメッセージまたはnull
 */
export function useNumericValidation(
  value: string,
  options: NumericValidationOptions
): string | null {
  return useMemo(() => {
    // 必須チェック
    if (options.required && !value.trim()) {
      return `${options.fieldName}は必須です。`;
    }
    
    // 空文字の場合、必須でなければOK
    if (!value.trim()) {
      return null;
    }
    
    // 数値チェック
    if (isNaN(Number(value))) {
      return `${options.fieldName}は数値で入力してください。`;
    }
    
    const num = Number(value);
    
    // 範囲チェック
    if (num < options.min || num > options.max) {
      return `${options.fieldName}は${options.min}～${options.max}の範囲で入力してください。`;
    }
    
    // ステップチェック（指定されている場合）
    if (options.step && options.step !== 1) {
      const remainder = (num * 10) % (options.step * 10);
      if (Math.abs(remainder) > 0.0001) { // 浮動小数点の誤差を考慮
        return `${options.fieldName}は${options.step}刻みで入力してください。`;
      }
    }
    
    return null;
  }, [value, options.min, options.max, options.required, options.fieldName, options.step]);
}

/**
 * 年バリデーション用のヘルパー
 */
export function useYearValidation(value: string, fieldName: string = '生年') {
  const currentYear = new Date().getFullYear();
  return useNumericValidation(value, {
    min: 1900,
    max: currentYear,
    required: true,
    fieldName,
  });
}

/**
 * 身長バリデーション用のヘルパー
 */
export function useHeightValidation(value: string, fieldName: string = '身長') {
  return useNumericValidation(value, {
    min: 100,
    max: 250,
    required: true,
    fieldName: `${fieldName}[cm]`,
    step: 0.1,
  });
}

/**
 * 体重バリデーション用のヘルパー
 */
export function useWeightValidation(value: string, fieldName: string = '体重') {
  return useNumericValidation(value, {
    min: 30,
    max: 200,
    required: true,
    fieldName: `${fieldName}[kg]`,
    step: 0.1,
  });
}