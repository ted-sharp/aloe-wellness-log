import type {
  DateString,
  Field,
  FieldType,
  FieldValidationRule,
  FieldValueMap,
  RecordItem,
  TimeString,
  ValidationResult,
} from '../types/record';

/**
 * 日付文字列のバリデーション (YYYY-MM-DD形式)
 */
export function validateDateString(value: string): value is DateString {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return false;
  }

  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * 時刻文字列のバリデーション (HH:mm形式)
 */
export function validateTimeString(value: string): value is TimeString {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(value);
}

/**
 * フィールド値の型安全なバリデーション
 */
export function validateFieldValue<T extends FieldType>(
  value: unknown,
  fieldType: T,
  rules?: FieldValidationRule
): ValidationResult<FieldValueMap[T]> {
  const errors: string[] = [];

  // 必須チェック
  if (
    rules?.required &&
    (value === null || value === undefined || value === '')
  ) {
    errors.push('この項目は必須です');
    return { isValid: false, errors };
  }

  // 型チェック
  let typedValue: FieldValueMap[T];

  try {
    switch (fieldType) {
      case 'number':
        if (typeof value === 'string' && value.trim() === '') {
          typedValue = undefined as unknown as FieldValueMap[T];
        } else {
          const numValue =
            typeof value === 'string' ? parseFloat(value) : Number(value);
          if (isNaN(numValue)) {
            errors.push('数値を入力してください');
            return { isValid: false, errors };
          }
          typedValue = numValue as FieldValueMap[T];
        }
        break;

      case 'string':
        typedValue = String(value) as FieldValueMap[T];
        break;

      case 'boolean':
        if (typeof value === 'boolean') {
          typedValue = value as FieldValueMap[T];
        } else if (typeof value === 'string') {
          typedValue = (value === 'true' || value === '1') as FieldValueMap[T];
        } else {
          typedValue = Boolean(value) as FieldValueMap[T];
        }
        break;

      default:
        errors.push('未知のフィールドタイプです');
        return { isValid: false, errors };
    }
  } catch (error) {
    errors.push('値の変換に失敗しました');
    return { isValid: false, errors };
  }

  // 範囲チェック（数値のみ）
  if (fieldType === 'number' && typeof typedValue === 'number') {
    if (rules?.min !== undefined && typedValue < rules.min) {
      errors.push(`${rules.min}以上の値を入力してください`);
    }
    if (rules?.max !== undefined && typedValue > rules.max) {
      errors.push(`${rules.max}以下の値を入力してください`);
    }
  }

  // パターンチェック（文字列のみ）
  if (
    fieldType === 'string' &&
    typeof typedValue === 'string' &&
    rules?.pattern
  ) {
    if (!rules.pattern.test(typedValue)) {
      errors.push('入力形式が正しくありません');
    }
  }

  // カスタムバリデーション
  if (rules?.customValidator) {
    const customError = rules.customValidator(typedValue);
    if (customError) {
      errors.push(customError);
    }
  }

  return {
    isValid: errors.length === 0,
    data: typedValue,
    errors,
  };
}

/**
 * RecordItemの完全バリデーション
 */
export function validateRecordItem(
  data: unknown
): ValidationResult<RecordItem> {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push('レコードデータが無効です');
    return { isValid: false, errors };
  }

  const record = data as Record<string, unknown>;

  // ID チェック
  if (typeof record.id !== 'string' || record.id.length === 0) {
    errors.push('IDが無効です');
  }

  // 日付チェック
  if (typeof record.date !== 'string' || !validateDateString(record.date)) {
    errors.push('日付形式が無効です (YYYY-MM-DD)');
  }

  // 時刻チェック
  if (typeof record.time !== 'string' || !validateTimeString(record.time)) {
    errors.push('時刻形式が無効です (HH:mm)');
  }

  // 日時チェック
  if (typeof record.datetime !== 'string' || record.datetime.length === 0) {
    errors.push('日時が無効です');
  }

  // フィールドID チェック
  if (typeof record.fieldId !== 'string' || record.fieldId.length === 0) {
    errors.push('フィールドIDが無効です');
  }

  // 値チェック
  if (record.value === undefined) {
    errors.push('値が設定されていません');
  } else if (
    typeof record.value !== 'number' &&
    typeof record.value !== 'string' &&
    typeof record.value !== 'boolean'
  ) {
    errors.push('値の型が無効です');
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? (record as RecordItem) : undefined,
    errors,
  };
}

/**
 * Fieldの完全バリデーション
 */
export function validateField(data: unknown): ValidationResult<Field> {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push('フィールドデータが無効です');
    return { isValid: false, errors };
  }

  const field = data as Record<string, unknown>;

  // フィールドID チェック
  if (typeof field.fieldId !== 'string' || field.fieldId.length === 0) {
    errors.push('フィールドIDが無効です');
  }

  // 名前チェック
  if (typeof field.name !== 'string' || field.name.length === 0) {
    errors.push('フィールド名が無効です');
  }

  // 型チェック
  if (
    typeof field.type !== 'string' ||
    !['number', 'string', 'boolean'].includes(field.type)
  ) {
    errors.push('フィールドタイプが無効です');
  }

  // 単位チェック（オプショナル）
  if (field.unit !== undefined && typeof field.unit !== 'string') {
    errors.push('単位が無効です');
  }

  // 順序チェック（オプショナル）
  if (field.order !== undefined && typeof field.order !== 'number') {
    errors.push('表示順序が無効です');
  }

  // デフォルト表示チェック（オプショナル）
  if (
    field.defaultDisplay !== undefined &&
    typeof field.defaultDisplay !== 'boolean'
  ) {
    errors.push('デフォルト表示設定が無効です');
  }

  // デフォルト値チェック（オプショナル、型との整合性）
  if (field.default !== undefined && typeof field.type === 'string') {
    const fieldType = field.type as FieldType;
    switch (fieldType) {
      case 'number':
        if (typeof field.default !== 'number') {
          errors.push('デフォルト値が数値型と一致しません');
        }
        break;
      case 'string':
        if (typeof field.default !== 'string') {
          errors.push('デフォルト値が文字列型と一致しません');
        }
        break;
      case 'boolean':
        if (typeof field.default !== 'boolean') {
          errors.push('デフォルト値がブール型と一致しません');
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? (field as Field) : undefined,
    errors,
  };
}

/**
 * 配列データの一括バリデーション
 */
export function validateRecordArray(
  data: unknown[]
): ValidationResult<RecordItem[]> {
  const errors: string[] = [];
  const validRecords: RecordItem[] = [];

  data.forEach((item, index) => {
    const result = validateRecordItem(item);
    if (result.isValid && result.data) {
      validRecords.push(result.data);
    } else {
      errors.push(`レコード[${index}]: ${result.errors.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    data: validRecords,
    errors,
  };
}

/**
 * フィールド配列の一括バリデーション
 */
export function validateFieldArray(data: unknown[]): ValidationResult<Field[]> {
  const errors: string[] = [];
  const validFields: Field[] = [];

  data.forEach((item, index) => {
    const result = validateField(item);
    if (result.isValid && result.data) {
      validFields.push(result.data);
    } else {
      errors.push(`フィールド[${index}]: ${result.errors.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    data: validFields,
    errors,
  };
}
