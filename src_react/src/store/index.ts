import { configure } from 'mobx';
import { dateStore, initializeDateStore } from './date.mobx';
import { goalStore } from './goal.mobx';
import { recordsStore } from './records.mobx';
import { enhancedRecordsStore } from './records.enhanced';
import { toastStore } from './toast.mobx';

// MobXの設定
configure({
  enforceActions: 'always',
  computedRequiresReaction: true,
  reactionRequiresObservable: true,
  observableRequiresReaction: process.env.NODE_ENV === 'production', // 開発時は警告を無効化
  disableErrorBoundaries: true,
});

/**
 * 全MobXストアの統合管理
 */
export class RootStore {
  dateStore = dateStore;
  goalStore = goalStore;
  recordsStore = recordsStore;
  enhancedRecordsStore = enhancedRecordsStore;
  toastStore = toastStore;

  constructor() {
    // 初期化処理
    this.initialize();
  }

  /**
   * 全ストアの初期化
   */
  initialize = async () => {
    try {
      // 日付ストアの初期化
      const cleanupDateStore = initializeDateStore();
      
      // 各ストアの初期化を個別に実行（非同期アクション）
      // これらは各ストア内でrunInActionが適切に使用されている
      await this.goalStore.loadGoal();
      await this.enhancedRecordsStore.loadAllData();
      
      // 成功メッセージ
      if (process.env.NODE_ENV === 'development') {
        console.log('🏪 All MobX stores initialized successfully');
      }
      
      // クリーンアップ関数を返す
      return () => {
        cleanupDateStore();
      };
    } catch (error) {
      console.error('Failed to initialize stores:', error);
      // エラーメッセージも個別に実行
      this.toastStore.showError('ストアの初期化に失敗しました');
      return () => {};
    }
  };

  /**
   * 全ストアのリセット
   */
  reset = async () => {
    try {
      // 各ストアをリセット
      this.toastStore.clearAll();
      
      // データは消去しない（UIの状態のみリセット）
      this.toastStore.showSuccess('ストアをリセットしました');
    } catch (error) {
      console.error('Failed to reset stores:', error);
      this.toastStore.showError('ストアのリセットに失敗しました');
    }
  };
}

// シングルトンインスタンス
export const rootStore = new RootStore();

// 個別ストアのエクスポート（後方互換性）
export {
  dateStore,
  goalStore,
  recordsStore,
  enhancedRecordsStore,
  toastStore,
};

// フックのエクスポート
export {
  useDateStore,
  useDateSelectors,
  initializeDateStore,
  debugDateStore,
} from './date.mobx';

export {
  useGoalStore,
} from './goal.mobx';

export {
  useRecordsStore,
} from './records.mobx';

export {
  useEnhancedRecordsStore,
  useRecordsSelectors,
} from './records.enhanced';

export {
  useToastStore,
} from './toast.mobx';