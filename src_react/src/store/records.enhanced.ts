import { create } from 'zustand';
import { 
  weightRecordRepository,
  getAllDailyRecords,
  getAllBpRecords,
  getAllDailyFields,
  deleteAllData
} from '../db';
import { DbError, DbErrorType } from '../db';
import type { WeightRecordV2, DailyRecordV2, DailyFieldV2 } from '../types/record';
import type { BpRecordV2 } from '../types/record';

/**
 * レコードタイプの定義
 */
export type RecordType = 'weight' | 'daily' | 'bp' | 'fields';

/**
 * ローディング状態の管理
 */
interface LoadingState {
  weight: boolean;
  daily: boolean;
  bp: boolean;
  fields: boolean;
  global: boolean; // 全データ操作時
}

/**
 * エラー状態の管理
 */
interface ErrorState {
  weight: DbError | null;
  daily: DbError | null;
  bp: DbError | null;
  fields: DbError | null;
  global: DbError | null;
}

/**
 * データキャッシュ情報
 */
interface CacheInfo {
  lastUpdated: Date | null;
  isStale: boolean;
}

/**
 * 拡張レコードストアの状態定義
 */
export interface EnhancedRecordsState {
  // === データ ===
  weightRecords: WeightRecordV2[];
  dailyRecords: DailyRecordV2[];
  bpRecords: BpRecordV2[];
  dailyFields: DailyFieldV2[];
  
  // === 状態管理 ===
  loading: LoadingState;
  errors: ErrorState;
  cache: { [K in RecordType]: CacheInfo };
  
  // === データ取得アクション ===
  loadWeightRecords: () => Promise<void>;
  loadDailyRecords: () => Promise<void>;
  loadBpRecords: () => Promise<void>;
  loadDailyFields: () => Promise<void>;
  loadAllData: () => Promise<void>;
  
  // === データ操作アクション ===
  addWeightRecord: (record: Omit<WeightRecordV2, 'id'>) => Promise<WeightRecordV2 | null>;
  updateWeightRecord: (record: WeightRecordV2) => Promise<boolean>;
  deleteWeightRecord: (id: string) => Promise<boolean>;
  
  // TODO: 他のレコードタイプのCRUD操作も追加予定
  
  // === 全データ操作 ===
  deleteAllData: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  
  // === エラー管理 ===
  clearError: (type: RecordType | 'global') => void;
  clearAllErrors: () => void;
  
  // === セレクター（計算されたプロパティ） ===
  getRecordsOfDay: (date: string, type: 'weight' | 'daily' | 'bp') => any[];
  isRecorded: (date: string, type: 'weight' | 'daily' | 'bp') => boolean;
  getWeightRecordsForGraph: () => WeightRecordV2[];
  getLatestWeightRecord: () => WeightRecordV2 | null;
  getRecordStats: () => {
    weightCount: number;
    dailyCount: number;
    bpCount: number;
    fieldsCount: number;
    totalCount: number;
  };
}

/**
 * キャッシュの有効期限（5分）
 */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * エラーヘルパー関数
 */
const createDbError = (error: unknown, defaultMessage: string): DbError => {
  if (error instanceof DbError) {
    return error;
  }
  return new DbError(
    DbErrorType.UNKNOWN,
    defaultMessage,
    error
  );
};

/**
 * 拡張レコードストア
 * 全記録データの一元管理、キャッシュ、最適化を提供
 */
export const useEnhancedRecordsStore = create<EnhancedRecordsState>((set, get) => ({
  // === 初期状態 ===
  weightRecords: [],
  dailyRecords: [],
  bpRecords: [],
  dailyFields: [],
  
  loading: {
    weight: false,
    daily: false,
    bp: false,
    fields: false,
    global: false,
  },
  
  errors: {
    weight: null,
    daily: null,
    bp: null,
    fields: null,
    global: null,
  },
  
  cache: {
    weight: { lastUpdated: null, isStale: true },
    daily: { lastUpdated: null, isStale: true },
    bp: { lastUpdated: null, isStale: true },
    fields: { lastUpdated: null, isStale: true },
  },
  
  // === データ取得アクション ===
  
  /**
   * 体重記録の読み込み
   */
  loadWeightRecords: async () => {
    const state = get();
    
    // 既にローディング中の場合はスキップ
    if (state.loading.weight) return;
    
    // キャッシュが有効な場合はスキップ
    const cache = state.cache.weight;
    if (cache.lastUpdated && !cache.isStale && 
        Date.now() - cache.lastUpdated.getTime() < CACHE_DURATION) {
      return;
    }
    
    set(state => ({
      loading: { ...state.loading, weight: true },
      errors: { ...state.errors, weight: null },
    }));
    
    try {
      const result = await weightRecordRepository.getAll();
      
      if (result.success && result.data) {
        set(state => ({
          weightRecords: result.data || [],
          loading: { ...state.loading, weight: false },
          cache: {
            ...state.cache,
            weight: { lastUpdated: new Date(), isStale: false },
          },
        }));
      } else {
        throw new Error(result.error || 'Failed to load weight records');
      }
    } catch (error) {
      const dbError = createDbError(error, '体重記録の読み込みに失敗しました');
      set(state => ({
        loading: { ...state.loading, weight: false },
        errors: { ...state.errors, weight: dbError },
        cache: {
          ...state.cache,
          weight: { ...state.cache.weight, isStale: true },
        },
      }));
    }
  },
  
  /**
   * 日課記録の読み込み
   */
  loadDailyRecords: async () => {
    const state = get();
    if (state.loading.daily) return;
    
    const cache = state.cache.daily;
    if (cache.lastUpdated && !cache.isStale && 
        Date.now() - cache.lastUpdated.getTime() < CACHE_DURATION) {
      return;
    }
    
    set(state => ({
      loading: { ...state.loading, daily: true },
      errors: { ...state.errors, daily: null },
    }));
    
    try {
      const records = await getAllDailyRecords();
      
      set(state => ({
        dailyRecords: records,
        loading: { ...state.loading, daily: false },
        cache: {
          ...state.cache,
          daily: { lastUpdated: new Date(), isStale: false },
        },
      }));
    } catch (error) {
      const dbError = createDbError(error, '日課記録の読み込みに失敗しました');
      set(state => ({
        loading: { ...state.loading, daily: false },
        errors: { ...state.errors, daily: dbError },
      }));
    }
  },
  
  /**
   * 血圧記録の読み込み
   */
  loadBpRecords: async () => {
    const state = get();
    if (state.loading.bp) return;
    
    const cache = state.cache.bp;
    if (cache.lastUpdated && !cache.isStale && 
        Date.now() - cache.lastUpdated.getTime() < CACHE_DURATION) {
      return;
    }
    
    set(state => ({
      loading: { ...state.loading, bp: true },
      errors: { ...state.errors, bp: null },
    }));
    
    try {
      const records = await getAllBpRecords();
      
      set(state => ({
        bpRecords: records,
        loading: { ...state.loading, bp: false },
        cache: {
          ...state.cache,
          bp: { lastUpdated: new Date(), isStale: false },
        },
      }));
    } catch (error) {
      const dbError = createDbError(error, '血圧記録の読み込みに失敗しました');
      set(state => ({
        loading: { ...state.loading, bp: false },
        errors: { ...state.errors, bp: dbError },
      }));
    }
  },
  
  /**
   * 日課フィールドの読み込み
   */
  loadDailyFields: async () => {
    const state = get();
    if (state.loading.fields) return;
    
    const cache = state.cache.fields;
    if (cache.lastUpdated && !cache.isStale && 
        Date.now() - cache.lastUpdated.getTime() < CACHE_DURATION) {
      return;
    }
    
    set(state => ({
      loading: { ...state.loading, fields: true },
      errors: { ...state.errors, fields: null },
    }));
    
    try {
      const fields = await getAllDailyFields();
      
      set(state => ({
        dailyFields: fields,
        loading: { ...state.loading, fields: false },
        cache: {
          ...state.cache,
          fields: { lastUpdated: new Date(), isStale: false },
        },
      }));
    } catch (error) {
      const dbError = createDbError(error, '日課フィールドの読み込みに失敗しました');
      set(state => ({
        loading: { ...state.loading, fields: false },
        errors: { ...state.errors, fields: dbError },
      }));
    }
  },
  
  /**
   * 全データの読み込み
   */
  loadAllData: async () => {
    const state = get();
    if (state.loading.global) return;
    
    set(state => ({
      loading: { ...state.loading, global: true },
      errors: { ...state.errors, global: null },
    }));
    
    try {
      await Promise.all([
        get().loadWeightRecords(),
        get().loadDailyRecords(),
        get().loadBpRecords(),
        get().loadDailyFields(),
      ]);
      
      set(state => ({
        loading: { ...state.loading, global: false },
      }));
    } catch (error) {
      const dbError = createDbError(error, '全データの読み込みに失敗しました');
      set(state => ({
        loading: { ...state.loading, global: false },
        errors: { ...state.errors, global: dbError },
      }));
    }
  },
  
  // === データ操作アクション ===
  
  /**
   * 体重記録の追加
   */
  addWeightRecord: async (recordData: Omit<WeightRecordV2, 'id'>) => {
    try {
      const result = await weightRecordRepository.add(recordData);
      
      if (result.success && result.data) {
        // ローカル状態を更新
        set(state => ({
          weightRecords: [...state.weightRecords, result.data!],
          cache: {
            ...state.cache,
            weight: { lastUpdated: new Date(), isStale: false },
          },
        }));
        
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to add weight record');
      }
    } catch (error) {
      const dbError = createDbError(error, '体重記録の追加に失敗しました');
      set(state => ({
        errors: { ...state.errors, weight: dbError },
      }));
      return null;
    }
  },
  
  /**
   * 体重記録の更新
   */
  updateWeightRecord: async (record: WeightRecordV2) => {
    try {
      const result = await weightRecordRepository.update(record);
      
      if (result.success) {
        // ローカル状態を更新
        set(state => ({
          weightRecords: state.weightRecords.map(r => 
            r.id === record.id ? record : r
          ),
          cache: {
            ...state.cache,
            weight: { lastUpdated: new Date(), isStale: false },
          },
        }));
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to update weight record');
      }
    } catch (error) {
      const dbError = createDbError(error, '体重記録の更新に失敗しました');
      set(state => ({
        errors: { ...state.errors, weight: dbError },
      }));
      return false;
    }
  },
  
  /**
   * 体重記録の削除
   */
  deleteWeightRecord: async (id: string) => {
    try {
      const result = await weightRecordRepository.delete(id);
      
      if (result.success) {
        // ローカル状態を更新
        set(state => ({
          weightRecords: state.weightRecords.filter(r => r.id !== id),
          cache: {
            ...state.cache,
            weight: { lastUpdated: new Date(), isStale: false },
          },
        }));
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete weight record');
      }
    } catch (error) {
      const dbError = createDbError(error, '体重記録の削除に失敗しました');
      set(state => ({
        errors: { ...state.errors, weight: dbError },
      }));
      return false;
    }
  },
  
  // === 全データ操作 ===
  
  /**
   * 全データの削除
   */
  deleteAllData: async () => {
    set(state => ({
      loading: { ...state.loading, global: true },
      errors: { ...state.errors, global: null },
    }));
    
    try {
      await deleteAllData();
      
      // 全データをクリア
      set({
        weightRecords: [],
        dailyRecords: [],
        bpRecords: [],
        dailyFields: [],
        loading: {
          weight: false,
          daily: false,
          bp: false,
          fields: false,
          global: false,
        },
        errors: {
          weight: null,
          daily: null,
          bp: null,
          fields: null,
          global: null,
        },
        cache: {
          weight: { lastUpdated: new Date(), isStale: false },
          daily: { lastUpdated: new Date(), isStale: false },
          bp: { lastUpdated: new Date(), isStale: false },
          fields: { lastUpdated: new Date(), isStale: false },
        },
      });
    } catch (error) {
      const dbError = createDbError(error, '全データ削除に失敗しました');
      set(state => ({
        loading: { ...state.loading, global: false },
        errors: { ...state.errors, global: dbError },
      }));
      throw error;
    }
  },
  
  /**
   * 全データの再読み込み
   */
  refreshAllData: async () => {
    // キャッシュを無効化
    set(state => ({
      cache: {
        weight: { ...state.cache.weight, isStale: true },
        daily: { ...state.cache.daily, isStale: true },
        bp: { ...state.cache.bp, isStale: true },
        fields: { ...state.cache.fields, isStale: true },
      },
    }));
    
    // 全データを再読み込み
    await get().loadAllData();
  },
  
  // === エラー管理 ===
  
  clearError: (type: RecordType | 'global') => {
    set(state => ({
      errors: { ...state.errors, [type]: null },
    }));
  },
  
  clearAllErrors: () => {
    set(() => ({
      errors: {
        weight: null,
        daily: null,
        bp: null,
        fields: null,
        global: null,
      },
    }));
  },
  
  // === セレクター ===
  
  getRecordsOfDay: (date: string, type: 'weight' | 'daily' | 'bp') => {
    const state = get();
    
    switch (type) {
      case 'weight':
        return state.weightRecords.filter(record => record.date === date);
      case 'daily':
        return state.dailyRecords.filter(record => record.date === date);
      case 'bp':
        return state.bpRecords.filter(record => record.date === date);
      default:
        return [];
    }
  },
  
  isRecorded: (date: string, type: 'weight' | 'daily' | 'bp') => {
    return get().getRecordsOfDay(date, type).length > 0;
  },
  
  getWeightRecordsForGraph: () => {
    const state = get();
    return state.weightRecords
      .filter(record => !record.excludeFromGraph)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
  
  getLatestWeightRecord: () => {
    const state = get();
    const sorted = state.weightRecords
      .sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] || null;
  },
  
  getRecordStats: () => {
    const state = get();
    return {
      weightCount: state.weightRecords.length,
      dailyCount: state.dailyRecords.length,
      bpCount: state.bpRecords.length,
      fieldsCount: state.dailyFields.length,
      totalCount: state.weightRecords.length + state.dailyRecords.length + state.bpRecords.length,
    };
  },
}));

/**
 * セレクター関数（パフォーマンス最適化用）
 */
export const useRecordsSelectors = {
  weightRecords: () => useEnhancedRecordsStore(state => state.weightRecords),
  dailyRecords: () => useEnhancedRecordsStore(state => state.dailyRecords),
  bpRecords: () => useEnhancedRecordsStore(state => state.bpRecords),
  dailyFields: () => useEnhancedRecordsStore(state => state.dailyFields),
  
  loading: () => useEnhancedRecordsStore(state => state.loading),
  errors: () => useEnhancedRecordsStore(state => state.errors),
  
  actions: () => useEnhancedRecordsStore(state => ({
    loadWeightRecords: state.loadWeightRecords,
    loadDailyRecords: state.loadDailyRecords,
    loadBpRecords: state.loadBpRecords,
    loadDailyFields: state.loadDailyFields,
    loadAllData: state.loadAllData,
    addWeightRecord: state.addWeightRecord,
    updateWeightRecord: state.updateWeightRecord,
    deleteWeightRecord: state.deleteWeightRecord,
  })),
};