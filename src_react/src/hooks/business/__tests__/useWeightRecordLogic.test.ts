import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useWeightRecordLogic } from '../useWeightRecordLogic';
import type { WeightRecordV2 } from '../../../types/record';
import type { GoalData } from '../../../types/goal';

describe('useWeightRecordLogic', () => {
  const mockWeightRecord: WeightRecordV2 = {
    id: 'test-1',
    date: '2024-01-01',
    time: '08:00',
    weight: 70.5,
    bodyFat: 15.2,
    waist: 85.0,
    note: 'Morning weight',
    excludeFromGraph: false,
  };

  const mockGoal: GoalData = {
    gender: 'male',
    birthYear: 1990,
    height: 175,
    startWeight: 75.0,
    targetWeight: 70.0,
    targetStart: '2024-01-01',
    targetEnd: '2024-06-01',
    exerciseGoal: 'Daily walk',
    dietGoal: 'Reduce carbs',
    sleepGoal: '8 hours',
    smokingGoal: 'Quit smoking',
    alcoholGoal: 'Weekend only',
  };

  describe('calculateBMI', () => {
    it('should calculate BMI correctly', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.calculateBMI(70, 175)).toBe(22.86);
      expect(result.current.calculateBMI(80, 180)).toBe(24.69);
      expect(result.current.calculateBMI(0, 175)).toBe(0);
    });

    it('should handle zero height', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.calculateBMI(70, 0)).toBe(0);
    });
  });

  describe('calculateWeightChange', () => {
    it('should calculate weight change correctly', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.calculateWeightChange(70, 75)).toBe(-5);
      expect(result.current.calculateWeightChange(75, 70)).toBe(5);
      expect(result.current.calculateWeightChange(70, 70)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.calculateWeightChange(70.333, 75.666)).toBe(-5.33);
    });
  });

  describe('calculateLowestWeight', () => {
    it('should find the lowest weight from records', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      const records: WeightRecordV2[] = [
        { ...mockWeightRecord, weight: 72.5 },
        { ...mockWeightRecord, weight: 70.2 },
        { ...mockWeightRecord, weight: 71.8 },
      ];
      
      expect(result.current.calculateLowestWeight(records)).toBe(70.2);
    });

    it('should return 0 for empty records', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.calculateLowestWeight([])).toBe(0);
    });
  });

  describe('hasRecordData', () => {
    it('should return true if weight is present', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.hasRecordData({ weight: '70.5', bodyFat: '', waist: '' })).toBe(true);
    });

    it('should return true if bodyFat is present', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.hasRecordData({ weight: '', bodyFat: '15.2', waist: '' })).toBe(true);
    });

    it('should return true if waist is present', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.hasRecordData({ weight: '', bodyFat: '', waist: '85' })).toBe(true);
    });

    it('should return false if all fields are empty', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.hasRecordData({ weight: '', bodyFat: '', waist: '' })).toBe(false);
    });
  });

  describe('calculateBMIDisplayInfo', () => {
    it('should calculate BMI display info correctly', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      const records: WeightRecordV2[] = [
        { ...mockWeightRecord, weight: 72.5 },
        { ...mockWeightRecord, weight: 70.2 },
      ];
      
      const displayInfo = result.current.calculateBMIDisplayInfo(records, mockGoal);
      
      expect(displayInfo.shouldShowBMI).toBe(true);
      expect(displayInfo.lowestWeight).toBe(70.2);
      expect(displayInfo.bmi).toBe(22.92);
      expect(displayInfo.weightChange).toBe(-4.8);
    });

    it('should not show BMI if no records', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      const displayInfo = result.current.calculateBMIDisplayInfo([], mockGoal);
      
      expect(displayInfo.shouldShowBMI).toBe(false);
      expect(displayInfo.bmi).toBe(0);
    });

    it('should not show BMI if no goal', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      const records: WeightRecordV2[] = [mockWeightRecord];
      const displayInfo = result.current.calculateBMIDisplayInfo(records, null);
      
      expect(displayInfo.shouldShowBMI).toBe(false);
    });
  });

  describe('getBMICategory', () => {
    it('should categorize BMI correctly', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.getBMICategory(17)).toEqual({
        category: '低体重',
        color: 'text-blue-600',
      });
      
      expect(result.current.getBMICategory(22)).toEqual({
        category: '普通体重',
        color: 'text-green-600',
      });
      
      expect(result.current.getBMICategory(27)).toEqual({
        category: '肥満度1',
        color: 'text-yellow-600',
      });
      
      expect(result.current.getBMICategory(32)).toEqual({
        category: '肥満度2以上',
        color: 'text-red-600',
      });
    });
  });

  describe('getWeightChangeDisplay', () => {
    it('should format weight change display correctly', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.getWeightChangeDisplay(2.5)).toEqual({
        text: '+2.5kg',
        color: 'text-red-600',
        icon: '↗',
      });
      
      expect(result.current.getWeightChangeDisplay(-2.5)).toEqual({
        text: '-2.5kg',
        color: 'text-blue-600',
        icon: '↘',
      });
      
      expect(result.current.getWeightChangeDisplay(0)).toEqual({
        text: '±0kg',
        color: 'text-gray-600',
        icon: '→',
      });
    });
  });

  describe('isValidRecord', () => {
    it('should validate records correctly', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.isValidRecord(mockWeightRecord)).toBe(true);
      expect(result.current.isValidRecord({ ...mockWeightRecord, weight: 0 })).toBe(false);
      expect(result.current.isValidRecord({ ...mockWeightRecord, weight: undefined as any })).toBe(false);
    });
  });

  describe('sortRecordsByDateTime', () => {
    it('should sort records by date and time', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      const records: WeightRecordV2[] = [
        { ...mockWeightRecord, date: '2024-01-02', time: '08:00' },
        { ...mockWeightRecord, date: '2024-01-01', time: '20:00' },
        { ...mockWeightRecord, date: '2024-01-01', time: '08:00' },
      ];
      
      const sorted = result.current.sortRecordsByDateTime(records);
      
      expect(sorted[0].date).toBe('2024-01-01');
      expect(sorted[0].time).toBe('08:00');
      expect(sorted[1].date).toBe('2024-01-01');
      expect(sorted[1].time).toBe('20:00');
      expect(sorted[2].date).toBe('2024-01-02');
    });
  });

  describe('noteExamples', () => {
    it('should provide note examples', () => {
      const { result } = renderHook(() => useWeightRecordLogic());
      
      expect(result.current.noteExamples).toContain('朝一');
      expect(result.current.noteExamples).toContain('夕食前');
      expect(result.current.noteExamples.length).toBe(7);
    });
  });
});