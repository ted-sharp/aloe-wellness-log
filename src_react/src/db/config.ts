// データベース設定の定数定義
export const DATABASE_CONFIG = {
  NAME: 'aloe-wellness-log',
  VERSION: 4,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1秒
  TRANSACTION_TIMEOUT: 30000, // 30秒
} as const;

// ストア名の定数定義
export const STORE_NAMES = {
  GOAL: 'goal',
  WEIGHT_RECORDS: 'weight_records',
  BP_RECORDS: 'bp_records',
  DAILY_RECORDS: 'daily_records',
  DAILY_FIELDS: 'daily_fields',
} as const;

// ストア名の型定義
export type StoreName = typeof STORE_NAMES[keyof typeof STORE_NAMES];

// インデックス設定の型定義
export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

// ストア設定の型定義
export interface StoreConfig {
  name: StoreName;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
}

// 全ストアの設定定義
export const STORE_CONFIGS: StoreConfig[] = [
  {
    name: STORE_NAMES.GOAL,
    keyPath: 'id',
  },
  {
    name: STORE_NAMES.WEIGHT_RECORDS,
    keyPath: 'id',
    indexes: [
      {
        name: 'dateIndex',
        keyPath: 'date',
        options: { unique: false },
      },
      {
        name: 'excludeFromGraphIndex',
        keyPath: 'excludeFromGraph',
        options: { unique: false },
      },
    ],
  },
  {
    name: STORE_NAMES.BP_RECORDS,
    keyPath: 'id',
    indexes: [
      {
        name: 'dateIndex',
        keyPath: 'date',
        options: { unique: false },
      },
      {
        name: 'fieldIdIndex',
        keyPath: 'fieldId',
        options: { unique: false },
      },
      {
        name: 'excludeFromGraphIndex',
        keyPath: 'excludeFromGraph',
        options: { unique: false },
      },
    ],
  },
  {
    name: STORE_NAMES.DAILY_RECORDS,
    keyPath: 'id',
  },
  {
    name: STORE_NAMES.DAILY_FIELDS,
    keyPath: 'fieldId',
  },
];