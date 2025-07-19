import { makeAutoObservable, runInAction, action, observable } from 'mobx';
import { goalRepository } from '../db';
import type { GoalData } from '../types/goal';

export class GoalStore {
  @observable goal: GoalData | null = null;
  @observable isLoading = false;
  @observable error: string | null = null;

  constructor() {
    makeAutoObservable(this, {
      // パフォーマンス最適化: 特定のプロパティのアノテーション
      setGoal: action,
      clearGoal: action,
      loadGoal: action,
    });
  }

  @action.bound
  private setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  @action.bound
  private setError(error: string | null) {
    this.error = error;
  }

  @action.bound
  async setGoal(goal: GoalData): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await goalRepository.setGoal(goal);
      
      runInAction(() => {
        if (result.success) {
          this.goal = goal;
        } else {
          this.error = result.error || 'Failed to set goal';
        }
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  @action.bound
  async clearGoal(): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await goalRepository.clearGoal();
      
      runInAction(() => {
        if (result.success) {
          this.goal = null;
        } else {
          this.error = result.error || 'Failed to clear goal';
        }
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  @action.bound
  async loadGoal(): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await goalRepository.getGoal();
      
      runInAction(() => {
        if (result && result.success) {
          this.goal = result.data || null;
        } else {
          this.goal = null;
          this.error = result?.error || 'Failed to load goal';
        }
      });
    } catch (error) {
      runInAction(() => {
        this.goal = null;
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Computed values for derived state
  get hasGoal(): boolean {
    return this.goal !== null;
  }

  get isReady(): boolean {
    return !this.isLoading && this.error === null;
  }
}

// Factory function instead of singleton
export const createGoalStore = () => new GoalStore();

// Context-based approach for React
import { createContext, useContext } from 'react';
import { observer } from 'mobx-react-lite';

const GoalStoreContext = createContext<GoalStore | null>(null);

export const GoalStoreProvider: React.FC<{ children: React.ReactNode; store: GoalStore }> = 
  observer(({ children, store }) => (
    <GoalStoreContext.Provider value={store}>
      {children}
    </GoalStoreContext.Provider>
  ));

export const useGoalStore = () => {
  const store = useContext(GoalStoreContext);
  if (!store) {
    throw new Error('useGoalStore must be used within GoalStoreProvider');
  }
  return store;
};

// Selector hooks for fine-grained subscriptions
export const useGoalData = () => {
  const store = useGoalStore();
  return store.goal;
};

export const useGoalLoading = () => {
  const store = useGoalStore();
  return store.isLoading;
};

export const useGoalError = () => {
  const store = useGoalStore();
  return store.error;
};