import { create } from 'zustand';
import { goalRepository } from '../db';
import type { GoalData } from '../types/goal';

interface GoalState {
  goal: GoalData | null;
  setGoal: (goal: GoalData) => Promise<void>;
  clearGoal: () => Promise<void>;
  loadGoal: () => Promise<void>;
}

export const useGoalStore = create<GoalState>(set => ({
  goal: null,
  setGoal: async (goal: GoalData) => {
    const result = await goalRepository.setGoal(goal);
    if (result.success) {
      set({ goal });
    } else {
      throw new Error(result.error || 'Failed to set goal');
    }
  },
  clearGoal: async () => {
    const result = await goalRepository.clearGoal();
    if (result.success) {
      set({ goal: null });
    } else {
      throw new Error(result.error || 'Failed to clear goal');
    }
  },
  loadGoal: async () => {
    const result = await goalRepository.getGoal();
    if (result.success) {
      set({ goal: result.data || null });
    } else {
      set({ goal: null });
    }
  },
}));
