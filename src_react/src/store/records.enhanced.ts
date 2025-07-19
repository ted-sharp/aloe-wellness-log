import { makeAutoObservable, runInAction, computed } from 'mobx';
import { 
  getAllWeightRecords,
  addWeightRecord,
  updateWeightRecord,
  deleteWeightRecord,
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
 * 拡張レコードストア（MobX版）
 * 全記録データの一元管理、キャッシュ、最適化を提供
 */
export class EnhancedRecordsStore {
  // === データ ===
  weightRecords: WeightRecordV2[] = [];
  dailyRecords: DailyRecordV2[] = [];
  bpRecords: BpRecordV2[] = [];
  dailyFields: DailyFieldV2[] = [];
  
  // === 状態管理 ===
  loading: LoadingState = {
    weight: false,
    daily: false,
    bp: false,
    fields: false,
    global: false,
  };
  
  errors: ErrorState = {
    weight: null,
    daily: null,
    bp: null,
    fields: null,
    global: null,
  };
  
  cache: { [K in RecordType]: CacheInfo } = {
    weight: { lastUpdated: null, isStale: false },
    daily: { lastUpdated: null, isStale: false },
    bp: { lastUpdated: null, isStale: false },
    fields: { lastUpdated: null, isStale: false },
  };
  
  // キャッシュ有効期限（5分）
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  constructor() {
    makeAutoObservable(this);
  }
  
  // === Computed Values ===
  
  get recordStats() {
    return computed(() => ({
      weightCount: this.weightRecords.length,
      dailyCount: this.dailyRecords.length,
      bpCount: this.bpRecords.length,
      fieldsCount: this.dailyFields.length,
      totalCount: this.weightRecords.length + this.dailyRecords.length + this.bpRecords.length,
    })).get();
  }
  
  get latestWeightRecord(): WeightRecordV2 | null {
    return computed(() => {
      if (this.weightRecords.length === 0) return null;
      return this.weightRecords
        .slice()
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.time.localeCompare(a.time);
        })[0];
    }).get();
  }
  
  get weightRecordsForGraph(): WeightRecordV2[] {
    return computed(() => {
      return this.weightRecords
        .filter(record => !record.excludeFromGraph)
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });
    }).get();
  }
  
  // === Private Methods ===
  
  private isStale(type: RecordType): boolean {
    const cache = this.cache[type];
    if (!cache.lastUpdated) return true;
    
    const now = new Date();
    const elapsed = now.getTime() - cache.lastUpdated.getTime();
    return elapsed > this.CACHE_DURATION;
  }
  
  private updateCache(type: RecordType) {
    this.cache[type] = {
      lastUpdated: new Date(),
      isStale: false,
    };
  }
  
  private setLoading(type: RecordType | 'global', loading: boolean) {
    this.loading[type] = loading;
  }
  
  private setError(type: RecordType | 'global', error: DbError | null) {
    this.errors[type] = error;
  }
  
  // === データ取得アクション ===
  
  loadWeightRecords = async (): Promise<void> => {
    if (this.loading.weight || (!this.isStale('weight') && this.weightRecords.length > 0)) {
      return;
    }
    
    this.setLoading('weight', true);
    this.setError('weight', null);
    
    try {
      const records = await getAllWeightRecords();
      runInAction(() => {
        this.weightRecords = records;
        this.updateCache('weight');
      });
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to load weight records', error);
      
      runInAction(() => {
        this.setError('weight', dbError);
      });
    } finally {
      runInAction(() => {
        this.setLoading('weight', false);
      });
    }
  };
  
  loadDailyRecords = async (): Promise<void> => {
    if (this.loading.daily || (!this.isStale('daily') && this.dailyRecords.length > 0)) {
      return;
    }
    
    this.setLoading('daily', true);
    this.setError('daily', null);
    
    try {
      const records = await getAllDailyRecords();
      runInAction(() => {
        this.dailyRecords = records;
        this.updateCache('daily');
      });
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to load daily records', error);
      
      runInAction(() => {
        this.setError('daily', dbError);
      });
    } finally {
      runInAction(() => {
        this.setLoading('daily', false);
      });
    }
  };
  
  loadBpRecords = async (): Promise<void> => {
    if (this.loading.bp || (!this.isStale('bp') && this.bpRecords.length > 0)) {
      return;
    }
    
    this.setLoading('bp', true);
    this.setError('bp', null);
    
    try {
      const records = await getAllBpRecords();
      runInAction(() => {
        this.bpRecords = records;
        this.updateCache('bp');
      });
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to load bp records', error);
      
      runInAction(() => {
        this.setError('bp', dbError);
      });
    } finally {
      runInAction(() => {
        this.setLoading('bp', false);
      });
    }
  };
  
  loadDailyFields = async (): Promise<void> => {
    if (this.loading.fields || (!this.isStale('fields') && this.dailyFields.length > 0)) {
      return;
    }
    
    this.setLoading('fields', true);
    this.setError('fields', null);
    
    try {
      const fields = await getAllDailyFields();
      runInAction(() => {
        this.dailyFields = fields;
        this.updateCache('fields');
      });
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to load daily fields', error);
      
      runInAction(() => {
        this.setError('fields', dbError);
      });
    } finally {
      runInAction(() => {
        this.setLoading('fields', false);
      });
    }
  };
  
  loadAllData = async (): Promise<void> => {
    this.setLoading('global', true);
    this.setError('global', null);
    
    try {
      await Promise.all([
        this.loadWeightRecords(),
        this.loadDailyRecords(),
        this.loadBpRecords(),
        this.loadDailyFields(),
      ]);
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to load all data', error);
      
      runInAction(() => {
        this.setError('global', dbError);
      });
    } finally {
      runInAction(() => {
        this.setLoading('global', false);
      });
    }
  };
  
  // === データ操作アクション ===
  
  addWeightRecord = async (record: Omit<WeightRecordV2, 'id'>): Promise<WeightRecordV2 | null> => {
    try {
      const newRecord = { ...record, id: `weight_${Date.now()}` } as WeightRecordV2;
      await addWeightRecord(newRecord);
      runInAction(() => {
        this.weightRecords.push(newRecord);
        this.updateCache('weight');
      });
      return newRecord;
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to add weight record', error);
      
      runInAction(() => {
        this.setError('weight', dbError);
      });
      return null;
    }
  };
  
  updateWeightRecord = async (record: WeightRecordV2): Promise<boolean> => {
    try {
      await updateWeightRecord(record);
      runInAction(() => {
        const index = this.weightRecords.findIndex(r => r.id === record.id);
        if (index !== -1) {
          this.weightRecords[index] = record;
          this.updateCache('weight');
        }
      });
      return true;
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to update weight record', error);
      
      runInAction(() => {
        this.setError('weight', dbError);
      });
      return false;
    }
  };
  
  deleteWeightRecord = async (id: string): Promise<boolean> => {
    try {
      await deleteWeightRecord(id);
      runInAction(() => {
        this.weightRecords = this.weightRecords.filter(r => r.id !== id);
        this.updateCache('weight');
      });
      return true;
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to delete weight record', error);
      
      runInAction(() => {
        this.setError('weight', dbError);
      });
      return false;
    }
  };
  
  // === 全データ操作 ===
  
  deleteAllData = async (): Promise<void> => {
    this.setLoading('global', true);
    this.setError('global', null);
    
    try {
      await deleteAllData();
      runInAction(() => {
        this.weightRecords = [];
        this.dailyRecords = [];
        this.bpRecords = [];
        this.dailyFields = [];
        
        // キャッシュをクリア
        Object.keys(this.cache).forEach(key => {
          this.cache[key as RecordType] = { lastUpdated: null, isStale: false };
        });
      });
    } catch (error) {
      const dbError = error instanceof DbError 
        ? error 
        : new DbError(DbErrorType.UNKNOWN, 'Failed to delete all data', error);
      
      runInAction(() => {
        this.setError('global', dbError);
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading('global', false);
      });
    }
  };
  
  refreshAllData = async (): Promise<void> => {
    // キャッシュを無効化
    Object.keys(this.cache).forEach(key => {
      this.cache[key as RecordType].isStale = true;
    });
    
    await this.loadAllData();
  };
  
  // === エラー管理 ===
  
  clearError = (type: RecordType | 'global'): void => {
    this.setError(type, null);
  };
  
  clearAllErrors = (): void => {
    Object.keys(this.errors).forEach(key => {
      this.errors[key as keyof ErrorState] = null;
    });
  };
  
  // === セレクター（計算されたプロパティ） ===
  
  getRecordsOfDay = (date: string, type: 'weight' | 'daily' | 'bp'): WeightRecordV2[] | DailyRecordV2[] | BpRecordV2[] => {
    switch (type) {
      case 'weight':
        return this.weightRecords.filter(record => record.date === date);
      case 'daily':
        return this.dailyRecords.filter(record => record.date === date);
      case 'bp':
        return this.bpRecords.filter(record => record.date === date);
      default:
        return [];
    }
  };
  
  isRecorded = (date: string, type: 'weight' | 'daily' | 'bp'): boolean => {
    return this.getRecordsOfDay(date, type).length > 0;
  };
}

// シングルトンインスタンス
export const enhancedRecordsStore = new EnhancedRecordsStore();

// React Hook（既存のコンポーネントとの互換性のため）
export const useEnhancedRecordsStore = () => {
  return {
    // データ
    weightRecords: enhancedRecordsStore.weightRecords,
    dailyRecords: enhancedRecordsStore.dailyRecords,
    bpRecords: enhancedRecordsStore.bpRecords,
    dailyFields: enhancedRecordsStore.dailyFields,
    
    // 状態
    loading: enhancedRecordsStore.loading,
    errors: enhancedRecordsStore.errors,
    
    // 計算されたプロパティ
    recordStats: enhancedRecordsStore.recordStats,
    latestWeightRecord: enhancedRecordsStore.latestWeightRecord,
    weightRecordsForGraph: enhancedRecordsStore.weightRecordsForGraph,
    
    // データロード
    loadWeightRecords: enhancedRecordsStore.loadWeightRecords,
    loadDailyRecords: enhancedRecordsStore.loadDailyRecords,
    loadBpRecords: enhancedRecordsStore.loadBpRecords,
    loadDailyFields: enhancedRecordsStore.loadDailyFields,
    loadAllData: enhancedRecordsStore.loadAllData,
    
    // データ操作
    addWeightRecord: enhancedRecordsStore.addWeightRecord,
    updateWeightRecord: enhancedRecordsStore.updateWeightRecord,
    deleteWeightRecord: enhancedRecordsStore.deleteWeightRecord,
    deleteAllData: enhancedRecordsStore.deleteAllData,
    refreshAllData: enhancedRecordsStore.refreshAllData,
    
    // エラー管理
    clearError: enhancedRecordsStore.clearError,
    clearAllErrors: enhancedRecordsStore.clearAllErrors,
    
    // セレクター
    getRecordsOfDay: enhancedRecordsStore.getRecordsOfDay,
    isRecorded: enhancedRecordsStore.isRecorded,
  };
};

/**
 * セレクター関数（パフォーマンス最適化用）
 */
export const useRecordsSelectors = {
  weightRecords: () => enhancedRecordsStore.weightRecords,
  dailyRecords: () => enhancedRecordsStore.dailyRecords,
  bpRecords: () => enhancedRecordsStore.bpRecords,
  dailyFields: () => enhancedRecordsStore.dailyFields,
  
  loading: () => enhancedRecordsStore.loading,
  errors: () => enhancedRecordsStore.errors,
  
  actions: () => ({
    loadWeightRecords: enhancedRecordsStore.loadWeightRecords,
    loadDailyRecords: enhancedRecordsStore.loadDailyRecords,
    loadBpRecords: enhancedRecordsStore.loadBpRecords,
    loadDailyFields: enhancedRecordsStore.loadDailyFields,
    loadAllData: enhancedRecordsStore.loadAllData,
    addWeightRecord: enhancedRecordsStore.addWeightRecord,
    updateWeightRecord: enhancedRecordsStore.updateWeightRecord,
    deleteWeightRecord: enhancedRecordsStore.deleteWeightRecord,
    deleteAllData: enhancedRecordsStore.deleteAllData,
    refreshAllData: enhancedRecordsStore.refreshAllData,
    clearError: enhancedRecordsStore.clearError,
    clearAllErrors: enhancedRecordsStore.clearAllErrors,
  }),
};