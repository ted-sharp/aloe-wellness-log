// 記録項目（フィールド）の型
export type FieldType = 'number' | 'string' | 'boolean';

// フィールドタイプに基づく値の型マッピング
export type FieldValueMap = {
  number: number;
  string: string;
  boolean: boolean;
};

// 型安全なフィールド定義
export type Field<T extends FieldType = FieldType> = {
  fieldId: string;
  name: string;
  unit?: string;
  type: T;
  default?: FieldValueMap[T];
  order?: number; // 表示順序（小さいほど上に表示）
  defaultDisplay?: boolean; // デフォルトで記録入力画面に表示するかどうか
  excludeFromGraph?: boolean; // グラフ表示除外フラグ
  scope: 'daily' | 'weight' | 'bp'; // どの画面で使うか
  note?: string; // 補足・メモ
};

// 特定タイプのフィールド型
export type NumberField = Field<'number'>;
export type StringField = Field<'string'>;
export type BooleanField = Field<'boolean'>;

// 記録データの型（縦持ちスキーマ）
export type RecordItem = {
  id: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  datetime: string; // ISO8601
  fieldId: string;
  value: number | string | boolean;
  excludeFromGraph?: boolean; // この記録をグラフから除外
  note?: string; // 補足・メモ
};

// 型安全な記録データ（フィールドタイプと値の組み合わせ）
export type TypedRecordItem<T extends FieldType = FieldType> = Omit<
  RecordItem,
  'value'
> & {
  value: FieldValueMap[T];
};

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
