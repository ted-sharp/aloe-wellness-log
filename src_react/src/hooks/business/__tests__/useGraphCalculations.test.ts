import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useGraphCalculations } from '../useGraphCalculations';

describe('useGraphCalculations', () => {
  describe('formatDateForTick', () => {
    it('should format timestamp to date string', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      expect(result.current.formatDateForTick(timestamp)).toBe('1/15');
    });
  });

  describe('calculateGenericTrendLine', () => {
    it('should calculate trend line for valid data', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
        { timestamp: 3000, value: 30 },
      ];
      
      const trendLine = result.current.calculateGenericTrendLine(data, 'value', 'valueTrend');
      
      expect(trendLine).toHaveLength(2);
      expect(trendLine![0].timestamp).toBe(1000);
      expect(trendLine![1].timestamp).toBe(3000);
      expect(trendLine![0].valueTrend).toBe(10);
      expect(trendLine![1].valueTrend).toBe(30);
    });

    it('should return null for insufficient data', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [{ timestamp: 1000, value: 10 }];
      
      const trendLine = result.current.calculateGenericTrendLine(data, 'value', 'valueTrend');
      
      expect(trendLine).toBeNull();
    });

    it('should filter out invalid data', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: null },
        { timestamp: 3000, value: 30 },
        { timestamp: 4000, value: NaN },
        { timestamp: 5000, value: 50 },
      ];
      
      const trendLine = result.current.calculateGenericTrendLine(data, 'value', 'valueTrend');
      
      expect(trendLine).toHaveLength(2);
      expect(trendLine![0].timestamp).toBe(1000);
      expect(trendLine![1].timestamp).toBe(5000);
    });

    it('should handle zero denominator', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 1000, value: 20 }, // Same timestamp
      ];
      
      const trendLine = result.current.calculateGenericTrendLine(data, 'value', 'valueTrend');
      
      expect(trendLine).toBeNull();
    });
  });

  describe('calculateWeightTrendLine', () => {
    it('should calculate weight trend line', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, value: 70 },
        { timestamp: 2000, value: 69 },
        { timestamp: 3000, value: 68 },
      ];
      
      const trendLine = result.current.calculateWeightTrendLine(data);
      
      expect(trendLine).toHaveLength(2);
      expect(trendLine![0]).toHaveProperty('weightTrend');
      expect(trendLine![1]).toHaveProperty('weightTrend');
      expect(trendLine![0].weightTrend).toBeGreaterThan(trendLine![1].weightTrend);
    });
  });

  describe('calculateBodyFatTrendLine', () => {
    it('should calculate body fat trend line', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, bodyFat: 20 },
        { timestamp: 2000, bodyFat: 19 },
        { timestamp: 3000, bodyFat: 18 },
      ];
      
      const trendLine = result.current.calculateBodyFatTrendLine(data);
      
      expect(trendLine).toHaveLength(2);
      expect(trendLine![0]).toHaveProperty('bodyFatTrend');
      expect(trendLine![1]).toHaveProperty('bodyFatTrend');
    });
  });

  describe('calculateWaistTrendLine', () => {
    it('should calculate waist trend line', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, waist: 90 },
        { timestamp: 2000, waist: 89 },
        { timestamp: 3000, waist: 88 },
      ];
      
      const trendLine = result.current.calculateWaistTrendLine(data);
      
      expect(trendLine).toHaveLength(2);
      expect(trendLine![0]).toHaveProperty('waistTrend');
      expect(trendLine![1]).toHaveProperty('waistTrend');
    });
  });

  describe('calculateSystolicTrendLine', () => {
    it('should calculate systolic trend line', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, systolic: 120 },
        { timestamp: 2000, systolic: 125 },
        { timestamp: 3000, systolic: 130 },
      ];
      
      const trendLine = result.current.calculateSystolicTrendLine(data);
      
      expect(trendLine).toHaveLength(2);
      expect(trendLine![0]).toHaveProperty('systolicTrend');
      expect(trendLine![1]).toHaveProperty('systolicTrend');
    });
  });

  describe('calculateDiastolicTrendLine', () => {
    it('should calculate diastolic trend line', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, diastolic: 80 },
        { timestamp: 2000, diastolic: 82 },
        { timestamp: 3000, diastolic: 84 },
      ];
      
      const trendLine = result.current.calculateDiastolicTrendLine(data);
      
      expect(trendLine).toHaveLength(2);
      expect(trendLine![0]).toHaveProperty('diastolicTrend');
      expect(trendLine![1]).toHaveProperty('diastolicTrend');
    });
  });

  describe('calculateDayStartLines', () => {
    it('should calculate day start lines', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: new Date('2024-01-01T10:00:00').getTime() },
        { timestamp: new Date('2024-01-01T15:00:00').getTime() },
        { timestamp: new Date('2024-01-02T08:00:00').getTime() },
        { timestamp: new Date('2024-01-03T12:00:00').getTime() },
      ];
      
      const lines = result.current.calculateDayStartLines(data);
      
      expect(lines).toHaveLength(3);
      expect(new Date(lines[0]).getHours()).toBe(0);
      expect(new Date(lines[1]).getHours()).toBe(0);
      expect(new Date(lines[2]).getHours()).toBe(0);
    });

    it('should handle empty data', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const lines = result.current.calculateDayStartLines([]);
      
      expect(lines).toHaveLength(0);
    });
  });

  describe('calculateXAxisTicks', () => {
    const createDataForDays = (days: number) => {
      const data = [];
      for (let i = 0; i < days; i++) {
        data.push({
          timestamp: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T12:00:00`).getTime(),
        });
      }
      return data;
    };

    it('should return all days for 7 days or less', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = createDataForDays(7);
      const ticks = result.current.calculateXAxisTicks(data);
      
      expect(ticks).toHaveLength(7);
    });

    it('should return every 2nd day for 8-14 days', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = createDataForDays(14);
      const ticks = result.current.calculateXAxisTicks(data);
      
      expect(ticks).toHaveLength(7); // 0, 2, 4, 6, 8, 10, 12
    });

    it('should return every 3rd day for 15-30 days', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = createDataForDays(30);
      const ticks = result.current.calculateXAxisTicks(data);
      
      expect(ticks).toHaveLength(10); // 0, 3, 6, 9, 12, 15, 18, 21, 24, 27
    });

    it('should return fewer ticks for more data', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = createDataForDays(60);
      const ticks = result.current.calculateXAxisTicks(data);
      
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.length).toBeLessThan(60);
    });

    it('should return even fewer ticks for large datasets', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = createDataForDays(90);
      const ticks = result.current.calculateXAxisTicks(data);
      
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.length).toBeLessThan(30);
    });

    it('should handle empty data', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const ticks = result.current.calculateXAxisTicks([]);
      
      expect(ticks).toHaveLength(0);
    });
  });

  describe('calculateTrendLine (legacy)', () => {
    it('should calculate trend line for generic data', () => {
      const { result } = renderHook(() => useGraphCalculations());
      
      const data = [
        { timestamp: 1000, weight: 70 },
        { timestamp: 2000, weight: 69 },
        { timestamp: 3000, weight: 68 },
      ];
      
      const trendLine = result.current.calculateTrendLine(data, 'timestamp', 'weight');
      
      expect(trendLine).toHaveLength(2);
      expect(trendLine![0]).toHaveProperty('weightTrend');
      expect(trendLine![1]).toHaveProperty('weightTrend');
    });
  });
});