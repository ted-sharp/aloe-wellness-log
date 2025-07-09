

// 日付フォーマット型
export type DateString = `${number}-${number}-${number}`; // YYYY-MM-DD
export type TimeString = `${number}:${number}`; // HH:mm
export type DateTimeString = string; // ISO8601

// バリデーション結果型
export type ValidationResult<T = unknown> = {
  isValid: boolean;
  data?: T;
  errors: string[];
};

// フィールドバリデーションのルール
export type FieldValidationRule = {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => string | null;
};

// エラー型の定義
export type RecordError = {
  type: 'validation' | 'database' | 'network' | 'unknown';
  message: string;
  fieldId?: string;
  timestamp: string;
};

// 新しい体重記録（V2）型
export type WeightRecordV2 = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  weight: number;
  bodyFat?: number | null;
  waist?: number | null;
  note?: string | null;
  excludeFromGraph?: boolean;
};

// 新しい血圧記録（V2）型
export type BpRecordV2 = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  systolic: number; // 収縮期血圧
  diastolic: number; // 拡張期血圧
  heartRate?: number | null; // 心拍数（任意）
  note?: string | null;
};

// 新しい日課レコード型（V2）
export type DailyRecordV2 = {
  id: string;
  date: string; // YYYY-MM-DD
  fieldId: string;
  value: number;
};

// 新しい日課フィールド型（V2）
export type DailyFieldV2 = {
  fieldId: string;
  name: string;
  order: number;
  display: boolean;
};
