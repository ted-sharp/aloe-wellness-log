import { create } from 'zustand';
import {
  clearGoalData as dbClearGoalData,
  getGoalData,
  setGoalData,
} from '../db/indexedDb';
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
    await setGoalData(goal);
    set({ goal });
  },
  clearGoal: async () => {
    await dbClearGoalData();
    set({ goal: null });
  },
  loadGoal: async () => {
    const goal = await getGoalData();
    set({ goal });
  },
}));
