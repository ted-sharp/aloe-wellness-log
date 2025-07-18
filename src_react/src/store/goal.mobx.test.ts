import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoalStore } from './goal.mobx';
import type { GoalData } from '../types/goal';

// goalRepositoryのモック
vi.mock('../db', () => ({
  goalRepository: {
    setGoal: vi.fn(),
    clearGoal: vi.fn(),
    getGoal: vi.fn(),
  },
}));

describe('GoalStore (MobX)', () => {
  let store: GoalStore;
  let mockGoalRepository: any;

  beforeEach(async () => {
    store = new GoalStore();
    mockGoalRepository = vi.mocked(
      (await import('../db')).goalRepository
    );
    vi.clearAllMocks();
  });

  describe('setGoal', () => {
    it('should set goal successfully', async () => {
      const mockGoal: GoalData = {
        height: 170,
        startWeight: 70,
        targetWeight: 65,
        targetStart: '2024-01-01',
        targetEnd: '2024-06-01',
        gender: 'male',
        exerciseGoal: 'walking',
        dietGoal: 'calorie_control',
      };

      mockGoalRepository.setGoal.mockResolvedValue({ success: true });

      await store.setGoal(mockGoal);

      expect(mockGoalRepository.setGoal).toHaveBeenCalledWith(mockGoal);
      expect(store.goal).toEqual(mockGoal);
    });

    it('should throw error when setGoal fails', async () => {
      const mockGoal: GoalData = {
        height: 170,
        startWeight: 70,
        targetWeight: 65,
        targetStart: '2024-01-01',
        targetEnd: '2024-06-01',
        gender: 'male',
        exerciseGoal: 'walking',
        dietGoal: 'calorie_control',
      };

      mockGoalRepository.setGoal.mockResolvedValue({ 
        success: false, 
        error: 'Database error' 
      });

      await expect(store.setGoal(mockGoal)).rejects.toThrow('Database error');
      expect(store.goal).toBeNull();
    });
  });

  describe('clearGoal', () => {
    it('should clear goal successfully', async () => {
      // 初期状態で goal を設定
      store.goal = {
        height: 170,
        startWeight: 70,
        targetWeight: 65,
        targetStart: '2024-01-01',
        targetEnd: '2024-06-01',
        gender: 'male',
        exerciseGoal: 'walking',
        dietGoal: 'calorie_control',
      };

      mockGoalRepository.clearGoal.mockResolvedValue({ success: true });

      await store.clearGoal();

      expect(mockGoalRepository.clearGoal).toHaveBeenCalled();
      expect(store.goal).toBeNull();
    });

    it('should throw error when clearGoal fails', async () => {
      mockGoalRepository.clearGoal.mockResolvedValue({ 
        success: false, 
        error: 'Clear failed' 
      });

      await expect(store.clearGoal()).rejects.toThrow('Clear failed');
    });
  });

  describe('loadGoal', () => {
    it('should load goal successfully', async () => {
      const mockGoal: GoalData = {
        height: 170,
        startWeight: 70,
        targetWeight: 65,
        targetStart: '2024-01-01',
        targetEnd: '2024-06-01',
        gender: 'male',
        exerciseGoal: 'walking',
        dietGoal: 'calorie_control',
      };

      mockGoalRepository.getGoal.mockResolvedValue({ 
        success: true, 
        data: mockGoal 
      });

      await store.loadGoal();

      expect(mockGoalRepository.getGoal).toHaveBeenCalled();
      expect(store.goal).toEqual(mockGoal);
    });

    it('should set goal to null when no data', async () => {
      mockGoalRepository.getGoal.mockResolvedValue({ 
        success: true, 
        data: null 
      });

      await store.loadGoal();

      expect(store.goal).toBeNull();
    });

    it('should set goal to null when load fails', async () => {
      mockGoalRepository.getGoal.mockResolvedValue({ 
        success: false, 
        error: 'Load failed' 
      });

      await store.loadGoal();

      expect(store.goal).toBeNull();
    });
  });
});