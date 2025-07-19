import { configure } from 'mobx';
import { createContext, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { createGoalStore, GoalStore } from './improved-goal.mobx';
import { dateStore, DateStore } from './date.mobx';
import { toastStore, ToastStore } from './toast.mobx';

// MobXの設定 - ベストプラクティスに従った厳格な設定
configure({
  enforceActions: 'always',
  computedRequiresReaction: true,
  reactionRequiresObservable: true,
  observableRequiresReaction: true, // 常に有効にしてベストプラクティスに従う
  disableErrorBoundaries: true,
});

/**
 * アプリケーション全体のストア管理
 * シングルトンではなく、Dependency Injectionパターンを採用
 */
export class RootStore {
  public readonly dateStore: DateStore;
  public readonly goalStore: GoalStore;
  public readonly toastStore: ToastStore;

  constructor() {
    // 各ストアをインスタンス化（DIパターン）
    this.dateStore = dateStore;
    this.goalStore = createGoalStore();
    this.toastStore = toastStore;
  }

  /**
   * 初期化は外部から明示的に呼び出し
   * コンストラクタでの非同期処理を避ける
   */
  async initialize(): Promise<void> {
    try {
      // 順次初期化（依存関係を考慮）
      await this.goalStore.loadGoal();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🏪 All MobX stores initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize stores:', error);
      this.toastStore.showError('ストアの初期化に失敗しました');
      throw error; // 初期化エラーを上位に伝播
    }
  }

  /**
   * クリーンアップ処理
   */
  dispose(): void {
    // 必要に応じてリソースクリーンアップ
    this.toastStore.clearAll();
  }
}

// React Context for Dependency Injection
const RootStoreContext = createContext<RootStore | null>(null);

export const RootStoreProvider: React.FC<{ 
  children: React.ReactNode; 
  store: RootStore 
}> = observer(({ children, store }) => (
  <RootStoreContext.Provider value={store}>
    {children}
  </RootStoreContext.Provider>
));

export const useRootStore = () => {
  const store = useContext(RootStoreContext);
  if (!store) {
    throw new Error('useRootStore must be used within RootStoreProvider');
  }
  return store;
};

// 個別ストアへの便利なアクセス
export const useDateStore = () => useRootStore().dateStore;
export const useGoalStore = () => useRootStore().goalStore;
export const useToastStore = () => useRootStore().toastStore;

// Factory function for creating store instances
export const createRootStore = () => new RootStore();

// Type exports
export type { RootStore, GoalStore, DateStore, ToastStore };