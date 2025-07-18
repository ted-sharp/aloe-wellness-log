import { makeAutoObservable, runInAction } from 'mobx';
import { goalRepository } from '../db';
import type { GoalData } from '../types/goal';

export class GoalStore {
  goal: GoalData | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setGoal = async (goal: GoalData): Promise<void> => {
    const result = await goalRepository.setGoal(goal);
    if (result.success) {
      runInAction(() => {
        this.goal = goal;
      });
    } else {
      throw new Error(result.error || 'Failed to set goal');
    }
  };

  clearGoal = async (): Promise<void> => {
    const result = await goalRepository.clearGoal();
    if (result.success) {
      runInAction(() => {
        this.goal = null;
      });
    } else {
      throw new Error(result.error || 'Failed to clear goal');
    }
  };

  loadGoal = async (): Promise<void> => {
    try {
      const result = await goalRepository.getGoal();
      runInAction(() => {
        if (result && result.success) {
          this.goal = result.data || null;
        } else {
          this.goal = null;
        }
      });
    } catch (error) {
      console.error('Failed to load goal:', error);
      runInAction(() => {
        this.goal = null;
      });
    }
  };
}

// シングルトンインスタンス
export const goalStore = new GoalStore();

// React Hook（既存のコンポーネントとの互換性のため）
export const useGoalStore = () => {
  return {
    goal: goalStore.goal,
    setGoal: goalStore.setGoal,
    clearGoal: goalStore.clearGoal,
    loadGoal: goalStore.loadGoal,
  };
};