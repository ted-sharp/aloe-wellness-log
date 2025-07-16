import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useBpRecordLogic } from '../useBpRecordLogic';
import type { BpRecordV2 } from '../../../types/record';

describe('useBpRecordLogic', () => {
  const mockBpRecord: BpRecordV2 = {
    id: 'test-1',
    date: '2024-01-01',
    time: '08:00',
    systolic: 120,
    diastolic: 80,
    heartRate: 70,
    note: 'Morning measurement',
    excludeFromGraph: false,
  };

  describe('getBpCategory', () => {
    it('should categorize normal blood pressure', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.getBpCategory(110, 70)).toEqual({
        category: '正常血圧',
        color: 'text-green-600',
        risk: 'low',
      });
    });

    it('should categorize normal high blood pressure', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.getBpCategory(125, 82)).toEqual({
        category: '正常高値',
        color: 'text-blue-600',
        risk: 'normal',
      });
    });

    it('should categorize high normal blood pressure', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.getBpCategory(135, 85)).toEqual({
        category: '高値血圧',
        color: 'text-yellow-600',
        risk: 'normal',
      });
    });

    it('should categorize grade 1 hypertension', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.getBpCategory(145, 95)).toEqual({
        category: 'Ⅰ度高血圧',
        color: 'text-orange-600',
        risk: 'high',
      });
    });

    it('should categorize grade 2 hypertension', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.getBpCategory(165, 105)).toEqual({
        category: 'Ⅱ度高血圧',
        color: 'text-red-600',
        risk: 'high',
      });
    });

    it('should categorize grade 3 hypertension', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.getBpCategory(185, 115)).toEqual({
        category: 'Ⅲ度高血圧',
        color: 'text-red-800',
        risk: 'very_high',
      });
    });

    it('should categorize based on higher value', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      // High systolic, normal diastolic
      expect(result.current.getBpCategory(145, 75)).toEqual({
        category: 'Ⅰ度高血圧',
        color: 'text-orange-600',
        risk: 'high',
      });
      
      // Normal systolic, high diastolic
      expect(result.current.getBpCategory(125, 95)).toEqual({
        category: 'Ⅰ度高血圧',
        color: 'text-orange-600',
        risk: 'high',
      });
    });
  });

  describe('calculateAverageBp', () => {
    it('should calculate average blood pressure', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const records: BpRecordV2[] = [
        { ...mockBpRecord, systolic: 120, diastolic: 80, heartRate: 70 },
        { ...mockBpRecord, systolic: 130, diastolic: 85, heartRate: 75 },
        { ...mockBpRecord, systolic: 125, diastolic: 82, heartRate: null },
      ];
      
      const averages = result.current.calculateAverageBp(records);
      
      expect(averages.avgSystolic).toBe(125);
      expect(averages.avgDiastolic).toBe(82);
      expect(averages.avgHeartRate).toBe(73); // (70 + 75) / 2
    });

    it('should handle empty records', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const averages = result.current.calculateAverageBp([]);
      
      expect(averages.avgSystolic).toBe(0);
      expect(averages.avgDiastolic).toBe(0);
      expect(averages.avgHeartRate).toBe(0);
    });

    it('should handle records with no heart rate', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const records: BpRecordV2[] = [
        { ...mockBpRecord, systolic: 120, diastolic: 80, heartRate: null },
        { ...mockBpRecord, systolic: 130, diastolic: 85, heartRate: null },
      ];
      
      const averages = result.current.calculateAverageBp(records);
      
      expect(averages.avgSystolic).toBe(125);
      expect(averages.avgDiastolic).toBe(83);
      expect(averages.avgHeartRate).toBe(0);
    });
  });

  describe('calculateBpRange', () => {
    it('should calculate blood pressure range', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const records: BpRecordV2[] = [
        { ...mockBpRecord, systolic: 120, diastolic: 80 },
        { ...mockBpRecord, systolic: 140, diastolic: 90 },
        { ...mockBpRecord, systolic: 110, diastolic: 70 },
      ];
      
      const range = result.current.calculateBpRange(records);
      
      expect(range.maxSystolic).toBe(140);
      expect(range.minSystolic).toBe(110);
      expect(range.maxDiastolic).toBe(90);
      expect(range.minDiastolic).toBe(70);
    });

    it('should handle empty records', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const range = result.current.calculateBpRange([]);
      
      expect(range.maxSystolic).toBe(0);
      expect(range.minSystolic).toBe(0);
      expect(range.maxDiastolic).toBe(0);
      expect(range.minDiastolic).toBe(0);
    });
  });

  describe('isValidRecord', () => {
    it('should validate valid records', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.isValidRecord(mockBpRecord)).toBe(true);
    });

    it('should invalidate records with missing systolic', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const invalidRecord = { ...mockBpRecord, systolic: 0 };
      expect(result.current.isValidRecord(invalidRecord)).toBe(false);
    });

    it('should invalidate records with missing diastolic', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const invalidRecord = { ...mockBpRecord, diastolic: 0 };
      expect(result.current.isValidRecord(invalidRecord)).toBe(false);
    });

    it('should invalidate records with extreme values', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const extremeRecord = { ...mockBpRecord, systolic: 400, diastolic: 250 };
      expect(result.current.isValidRecord(extremeRecord)).toBe(false);
    });
  });

  describe('hasRecordData', () => {
    it('should return true for valid form data', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.hasRecordData({ systolic: '120', diastolic: '80' })).toBe(true);
      expect(result.current.hasRecordData({ systolic: '120', diastolic: '80', heartRate: '70' })).toBe(true);
    });

    it('should return false for incomplete form data', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      expect(result.current.hasRecordData({ systolic: '120', diastolic: '' })).toBe(false);
      expect(result.current.hasRecordData({ systolic: '', diastolic: '80' })).toBe(false);
      expect(result.current.hasRecordData({ systolic: '', diastolic: '' })).toBe(false);
    });
  });

  describe('sortRecordsByDateTime', () => {
    it('should sort records by date and time', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const records: BpRecordV2[] = [
        { ...mockBpRecord, date: '2024-01-02', time: '08:00' },
        { ...mockBpRecord, date: '2024-01-01', time: '20:00' },
        { ...mockBpRecord, date: '2024-01-01', time: '08:00' },
      ];
      
      const sorted = result.current.sortRecordsByDateTime(records);
      
      expect(sorted[0].date).toBe('2024-01-01');
      expect(sorted[0].time).toBe('08:00');
      expect(sorted[1].date).toBe('2024-01-01');
      expect(sorted[1].time).toBe('20:00');
      expect(sorted[2].date).toBe('2024-01-02');
    });
  });

  describe('calculateBpTrend', () => {
    it('should calculate blood pressure trend', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const records: BpRecordV2[] = [
        { ...mockBpRecord, date: '2024-01-01', systolic: 120, diastolic: 80 },
        { ...mockBpRecord, date: '2024-01-02', systolic: 125, diastolic: 82 },
        { ...mockBpRecord, date: '2024-01-03', systolic: 115, diastolic: 78 },
        { ...mockBpRecord, date: '2024-01-04', systolic: 140, diastolic: 90 },
        { ...mockBpRecord, date: '2024-01-05', systolic: 145, diastolic: 95 },
        { ...mockBpRecord, date: '2024-01-06', systolic: 150, diastolic: 100 },
      ];
      
      const trend = result.current.calculateBpTrend(records);
      
      expect(trend.systolicTrend).toBe('up');
      expect(trend.diastolicTrend).toBe('up');
      expect(trend.trendMessage).toBe('血圧が上昇傾向にあります');
    });

    it('should handle insufficient data', () => {
      const { result } = renderHook(() => useBpRecordLogic());
      
      const records: BpRecordV2[] = [mockBpRecord];
      
      const trend = result.current.calculateBpTrend(records);
      
      expect(trend.systolicTrend).toBe('stable');
      expect(trend.diastolicTrend).toBe('stable');
      expect(trend.trendMessage).toBe('データが不足しています');
    });
  });
});