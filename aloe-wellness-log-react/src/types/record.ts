// 記録項目（フィールド）の型
export type Field = {
  fieldId: string;
  name: string;
  unit?: string;
  type: 'number' | 'string' | 'boolean';
  default?: number | string | boolean;
};

// 記録データの型（縦持ちスキーマ）
export type RecordItem = {
  id: string;
  date: string;      // "YYYY-MM-DD"
  time: string;      // "HH:mm"
  datetime: string;  // ISO8601
  fieldId: string;
  value: number | string | boolean;
}; 