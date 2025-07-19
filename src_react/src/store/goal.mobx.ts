import { makeAutoObservable, runInAction, action, computed } from 'mobx';
import { goalRepository } from '../db';
import type { GoalData } from '../types/goal';

// 型定義の強化
export interface GoalStoreState {
  goal: GoalData | null;
  isLoading: boolean;
  error: string | null;
}

export type GoalOperationResult = {
  success: boolean;
  error?: string;
};

export class GoalStore {
  goal: GoalData | null = null;
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {
      // パフォーマンス最適化: アクションの明示的定義
      setGoal: action,
      clearGoal: action,
      loadGoal: action,
      clearError: action,
      // computed値の明示的定義
      hasGoal: computed,
      isReady: computed,
      goalProgress: computed,
      isGoalAchieved: computed,
      remainingWeight: computed,
      goalSummary: computed,
    });
  }

  // プライベートアクション（内部状態管理用）
  private setLoading = (loading: boolean): void => {
    this.isLoading = loading;
  };

  private setError = (error: string | null): void => {
    this.error = error;
  };

  // Computed values for derived state
  get hasGoal(): boolean {
    return this.goal !== null;
  }

  get isReady(): boolean {
    return !this.isLoading && this.error === null;
  }

  // 追加のパフォーマンス最適化されたcomputed値
  get goalProgress(): number {
    if (!this.goal || !this.goal.currentWeight || !this.goal.targetWeight) {
      return 0;
    }
    
    const startWeight = this.goal.startWeight || this.goal.currentWeight;
    const totalChange = this.goal.targetWeight - startWeight;
    const currentChange = this.goal.currentWeight - startWeight;
    
    if (totalChange === 0) return 100;
    return Math.max(0, Math.min(100, (currentChange / totalChange) * 100));
  }

  get isGoalAchieved(): boolean {
    if (!this.goal || !this.goal.currentWeight || !this.goal.targetWeight) {
      return false;
    }
    
    // 目標が減量か増量かで判定ロジックを変える
    const isWeightLoss = this.goal.targetWeight < (this.goal.startWeight || this.goal.currentWeight);
    
    if (isWeightLoss) {
      return this.goal.currentWeight <= this.goal.targetWeight;
    } else {
      return this.goal.currentWeight >= this.goal.targetWeight;
    }
  }

  get remainingWeight(): number {
    if (!this.goal || !this.goal.currentWeight || !this.goal.targetWeight) {
      return 0;
    }
    
    return Math.abs(this.goal.targetWeight - this.goal.currentWeight);
  }

  get goalSummary(): {
    hasGoal: boolean;
    progress: number;
    achieved: boolean;
    remaining: number;
    isLoading: boolean;
    error: string | null;
  } {
    return {
      hasGoal: this.hasGoal,
      progress: this.goalProgress,
      achieved: this.isGoalAchieved,
      remaining: this.remainingWeight,
      isLoading: this.isLoading,
      error: this.error,
    };
  }

  setGoal = async (goal: GoalData): Promise<void> => {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await goalRepository.setGoal(goal);
      
      runInAction(() => {
        if (result.success) {
          this.goal = goal;
        } else {
          this.error = result.error || 'Failed to set goal';
          throw new Error(this.error);
        }
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  };

  clearGoal = async (): Promise<void> => {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await goalRepository.clearGoal();
      
      runInAction(() => {
        if (result.success) {
          this.goal = null;
        } else {
          this.error = result.error || 'Failed to clear goal';
          throw new Error(this.error);
        }
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
      throw error;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  };

  loadGoal = async (): Promise<void> => {
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
      console.error('Failed to load goal:', error);
      runInAction(() => {
        this.goal = null;
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  };

  // エラー状態をクリアするためのアクション
  clearError = (): void => {
    this.setError(null);
  };
}

// シングルトンインスタンス
export const goalStore = new GoalStore();

// React Hook（既存のコンポーネントとの互換性のため）
export const useGoalStore = () => {
  return {
    // 既存API（互換性維持）
    goal: goalStore.goal,
    setGoal: goalStore.setGoal,
    clearGoal: goalStore.clearGoal,
    loadGoal: goalStore.loadGoal,
    
    // 新しいAPI（ベストプラクティス）
    isLoading: goalStore.isLoading,
    error: goalStore.error,
    hasGoal: goalStore.hasGoal,
    isReady: goalStore.isReady,
    clearError: goalStore.clearError,
  };
};

// パフォーマンス最適化されたセレクターフック
export const useGoalData = () => goalStore.goal;
export const useGoalLoading = () => goalStore.isLoading;
export const useGoalError = () => goalStore.error;
export const useGoalStatus = () => ({
  hasGoal: goalStore.hasGoal,
  isReady: goalStore.isReady,
});

// 新しい高パフォーマンスセレクター
export const useGoalProgress = () => ({
  progress: goalStore.goalProgress,
  achieved: goalStore.isGoalAchieved,
  remaining: goalStore.remainingWeight,
});

export const useGoalSummary = () => goalStore.goalSummary;

// アクションのみのフック（状態変更用）
export const useGoalActions = () => ({
  setGoal: goalStore.setGoal,
  clearGoal: goalStore.clearGoal,
  loadGoal: goalStore.loadGoal,
  clearError: goalStore.clearError,
});

// 型安全なユーティリティ関数
export const isValidGoalData = (data: Partial<GoalData>): data is GoalData => {
  return !!(data.targetWeight && typeof data.targetWeight === 'number' && data.targetWeight > 0);
};

export const createGoalData = (targetWeight: number, currentWeight?: number, startWeight?: number): GoalData => {
  return {
    targetWeight,
    currentWeight: currentWeight || 0,
    startWeight: startWeight || currentWeight || 0,
  };
};