import { configure, reaction } from 'mobx';
import type { IReactionDisposer } from 'mobx';
import { dateStore, initializeDateStore } from './date.mobx';
import { goalStore } from './goal.mobx';
import { enhancedRecordsStore } from './records.enhanced';
import { toastStore } from './toast.mobx';
// 非推奨: import { recordsStore } from './records.mobx'; // enhancedRecordsStoreに統一

// 型定義
type StoreState = 'uninitialized' | 'initializing' | 'ready' | 'error';
type StoreCleanupFunction = () => void;

// MobXの設定 - 開発効率と安全性のバランス
configure({
  enforceActions: 'always',                    // アクション外での状態変更を禁止（重要）
  computedRequiresReaction: false,             // computed値の使用制限を緩和
  reactionRequiresObservable: true,            // reactionはobservable値にアクセスする必要がある
  observableRequiresReaction: false,           // 開発中の警告を緩和（本番では有効化検討）
  disableErrorBoundaries: true,                // React DevToolsとの統合を改善
});

/**
 * 全MobXストアの統合管理
 * 型安全性とパフォーマンスを重視した設計
 */
class RootStore {
  public readonly dateStore = dateStore;
  public readonly goalStore = goalStore;
  public readonly recordsStore = enhancedRecordsStore; // 統一: enhancedRecordsStoreを使用
  public readonly toastStore = toastStore;

  private _state: StoreState = 'uninitialized';
  private _initializationPromise: Promise<StoreCleanupFunction> | null = null;
  private _cleanupFunctions: StoreCleanupFunction[] = [];
  private _reactions: IReactionDisposer[] = [];

  constructor() {
    // コンストラクタでは同期的な初期化のみ
    // 非同期初期化は外部から明示的に呼び出す
    this._setupReactions();
  }

  // Computed properties for better state management
  get state(): StoreState {
    return this._state;
  }

  get isInitialized(): boolean {
    return this._state === 'ready';
  }

  get isInitializing(): boolean {
    return this._state === 'initializing';
  }

  get hasError(): boolean {
    return this._state === 'error';
  }

  // ストア間の連携を監視するリアクションの設定
  private _setupReactions(): void {
    // ゴール変更時にトーストを表示
    const goalReaction = reaction(
      () => ({ goal: this.goalStore.goal, error: this.goalStore.error }),
      ({ goal, error }) => {
        if (error) {
          this.toastStore.showError(`目標設定エラー: ${error}`);
        }
      },
      { name: 'GoalErrorReaction' }
    );

    // レコード操作エラー時にトーストを表示
    const recordsReaction = reaction(
      () => Object.values(this.recordsStore.errors).some(Boolean),
      (hasError) => {
        if (hasError) {
          this.toastStore.showError('データ操作中にエラーが発生しました');
        }
      },
      { name: 'RecordsErrorReaction' }
    );

    this._reactions.push(goalReaction, recordsReaction);
  }

  /**
   * 全ストアの初期化
   * 重複実行を防ぎ、適切なエラーハンドリングを行う
   */
  async initialize(): Promise<StoreCleanupFunction> {
    // 既に初期化中または完了している場合は既存のPromiseを返す
    if (this._initializationPromise) {
      return await this._initializationPromise;
    }

    if (this._state === 'ready') {
      return () => {}; // 既に初期化済み
    }

    // 初期化プロセスを開始
    this._state = 'initializing';
    this._initializationPromise = this._performInitialization();
    
    try {
      const cleanup = await this._initializationPromise;
      this._state = 'ready';
      return cleanup;
    } catch (error) {
      // 初期化に失敗した場合は状態をリセット
      this._state = 'error';
      this._initializationPromise = null;
      throw error;
    }
  }

  private async _performInitialization(): Promise<StoreCleanupFunction> {
    try {
      // 日付ストアの初期化（同期）
      const cleanupDateStore = initializeDateStore();
      this._cleanupFunctions.push(cleanupDateStore);
      
      // 各ストアを順次初期化（依存関係を考慮）
      // 並列処理で高速化
      const initPromises = [
        this.goalStore.loadGoal(),
        this.recordsStore.loadAllData()
      ];
      
      await Promise.all(initPromises);
      
      // 成功メッセージ
      if (process.env.NODE_ENV === 'development') {
        console.log('🏪 All MobX stores initialized successfully');
        this._logStoreStats();
      }
      
      // 統合クリーンアップ関数を返す
      return () => {
        this._cleanup();
        if (process.env.NODE_ENV === 'development') {
          console.log('🧹 MobX stores cleaned up successfully');
        }
      };
    } catch (error) {
      console.error('Failed to initialize stores:', error);
      
      // エラー通知（既にtoastStoreは利用可能）
      this.toastStore.showError('ストアの初期化に失敗しました');
      
      // エラーを上位に伝播
      throw error;
    }
  }

  /**
   * 内部クリーンアップ処理
   */
  private _cleanup(): void {
    // リアクションの破棄
    this._reactions.forEach(dispose => dispose());
    this._reactions = [];
    
    // 登録されたクリーンアップ関数の実行
    this._cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    this._cleanupFunctions = [];
  }

  /**
   * 開発用のストア統計情報ログ
   */
  private _logStoreStats(): void {
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Store Statistics');
      console.log('Date Store:', {
        selectedDate: this.dateStore.selectedDate,
        isToday: this.dateStore.isSelectedDateToday
      });
      console.log('Goal Store:', {
        hasGoal: this.goalStore.hasGoal,
        isReady: this.goalStore.isReady
      });
      console.log('Records Store:', {
        stats: this.recordsStore.recordStats
      });
      console.log('Toast Store:', {
        hasToasts: this.toastStore.hasToasts,
        toastCount: this.toastStore.activeToasts.length
      });
      console.groupEnd();
    }
  }

  /**
   * 全ストアのリセット
   */
  reset = async (): Promise<void> => {
    try {
      // 各ストアをリセット（データは消去しない、UIの状態のみ）
      this.toastStore.clearAll();
      this.goalStore.clearError();
      this.recordsStore.clearAllErrors();
      
      this.toastStore.showSuccess('ストアをリセットしました');
    } catch (error) {
      console.error('Failed to reset stores:', error);
      this.toastStore.showError('ストアのリセットに失敗しました');
    }
  };

  /**
   * リソースの完全破棄
   * アプリケーション終了時に呼び出し
   */
  dispose(): void {
    this._cleanup();
    this._state = 'uninitialized';
    this._initializationPromise = null;
  }
}

// シングルトンインスタンス（型安全性を確保）
export const rootStore = new RootStore();

// 型エクスポート（型安全性の向上）
export type { StoreState, StoreCleanupFunction, RootStore };
export type { GoalData } from '../types/goal';
export type { WeightRecordV2, DailyRecordV2, BpRecordV2, DailyFieldV2 } from '../types/record';
export type { Toast, ToastType } from './toast.mobx';

// 個別ストアのエクスポート（後方互換性）
export {
  dateStore,
  goalStore,
  toastStore,
};

// 統一されたレコードストア
export { enhancedRecordsStore as recordsStore };

// 型安全なフックのエクスポート
export {
  useDateStore,
  useDateSelectors,
  initializeDateStore,
  debugDateStore,
} from './date.mobx';

export {
  useGoalStore,
  useGoalData,
  useGoalLoading,
  useGoalError,
  useGoalStatus,
  useGoalActions,
} from './goal.mobx';

// 統一されたレコードストアフック
export {
  useEnhancedRecordsStore as useRecordsStore,
  useRecordsSelectors,
} from './records.enhanced';

export {
  useToastStore,
  useToasts,
  useToastActions,
} from './toast.mobx';

// RootStore用の統合フック
export const useRootStore = () => rootStore;

// パフォーマンス最適化された統合セレクター
export const useAppStatus = () => ({
  isInitialized: rootStore.isInitialized,
  isInitializing: rootStore.isInitializing,
  hasError: rootStore.hasError,
  state: rootStore.state,
});

// データロード状態の統合監視
export const useLoadingStatus = () => ({
  goalLoading: rootStore.goalStore.isLoading,
  recordsLoading: Object.values(rootStore.recordsStore.loading).some(Boolean),
  anyLoading: rootStore.goalStore.isLoading || 
             Object.values(rootStore.recordsStore.loading).some(Boolean),
});

// エラー状態の統合監視
export const useErrorStatus = () => ({
  goalError: rootStore.goalStore.error,
  recordsError: Object.values(rootStore.recordsStore.errors).some(Boolean),
  hasAnyError: !!rootStore.goalStore.error || 
               Object.values(rootStore.recordsStore.errors).some(Boolean),
});

// アプリケーション全体の統計情報
export const useAppStats = () => ({
  recordStats: rootStore.recordsStore.recordStats,
  hasGoal: rootStore.goalStore.hasGoal,
  hasToasts: rootStore.toastStore.hasToasts,
  selectedDate: rootStore.dateStore.selectedDate,
  isToday: rootStore.dateStore.isSelectedDateToday,
});