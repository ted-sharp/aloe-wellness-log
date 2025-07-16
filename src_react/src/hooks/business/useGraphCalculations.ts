import { useCallback, useMemo } from 'react';
import type { WeightRecordV2, BpRecordV2 } from '../../types/record';

/**
 * グラフ計算ロジックを管理するカスタムHook
 */
export const useGraphCalculations = () => {
  /**
   * 日付フォーマット関数
   * @param timestamp UNIXタイムスタンプ
   * @returns フォーマットされた日付文字列
   */
  const formatDateForTick = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }, []);

  /**
   * 回帰直線計算（最小二乗法）
   * @param data データポイント配列
   * @param xKey X軸のキー
   * @param yKey Y軸のキー
   * @returns 回帰直線の両端点
   */
  const calculateTrendLine = useCallback(<T extends Record<string, any>>(
    data: T[],
    xKey: keyof T,
    yKey: keyof T
  ): { timestamp: number; [key: string]: number }[] | null => {
    if (data.length < 2) return null;
    
    const validData = data.filter(d => 
      typeof d[xKey] === 'number' && 
      typeof d[yKey] === 'number' && 
      !isNaN(d[xKey]) && 
      !isNaN(d[yKey])
    );
    
    if (validData.length < 2) return null;
    
    const n = validData.length;
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    
    for (const d of validData) {
      const x = d[xKey] as number;
      const y = d[yKey] as number;
      sumX += x;
      sumY += y;
      sumXX += x * x;
      sumXY += x * y;
    }
    
    const avgX = sumX / n;
    const avgY = sumY / n;
    const denom = sumXX - sumX * avgX;
    
    if (denom === 0) return null;
    
    const a = (sumXY - sumX * avgY) / denom;
    const b = avgY - a * avgX;
    
    const x1 = validData[0][xKey] as number;
    const x2 = validData[validData.length - 1][xKey] as number;
    
    return [
      { timestamp: x1, [`${String(yKey)}Trend`]: a * x1 + b },
      { timestamp: x2, [`${String(yKey)}Trend`]: a * x2 + b },
    ];
  }, []);

  /**
   * 体重傾向線計算
   * @param data 体重データ
   * @returns 体重傾向線データ
   */
  const calculateWeightTrendLine = useCallback((data: any[]): any[] | null => {
    if (data.length < 2) return null;
    
    const validData = data.filter(d => d.value != null && !isNaN(d.value));
    if (validData.length < 2) return null;
    
    const n = validData.length;
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    
    for (const d of validData) {
      sumX += d.timestamp;
      sumY += d.value;
      sumXX += d.timestamp * d.timestamp;
      sumXY += d.timestamp * d.value;
    }
    
    const avgX = sumX / n;
    const avgY = sumY / n;
    const denom = sumXX - sumX * avgX;
    
    if (denom === 0) return null;
    
    const a = (sumXY - sumX * avgY) / denom;
    const b = avgY - a * avgX;
    
    const x1 = validData[0].timestamp;
    const x2 = validData[validData.length - 1].timestamp;
    
    return [
      { timestamp: x1, weightTrend: a * x1 + b },
      { timestamp: x2, weightTrend: a * x2 + b },
    ];
  }, []);

  /**
   * 体脂肪率傾向線計算
   * @param data 体脂肪率データ
   * @returns 体脂肪率傾向線データ
   */
  const calculateBodyFatTrendLine = useCallback((data: any[]): any[] | null => {
    if (data.length < 2) return null;
    
    const validData = data.filter(d => d.bodyFat != null && !isNaN(d.bodyFat));
    if (validData.length < 2) return null;
    
    const n = validData.length;
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    
    for (const d of validData) {
      sumX += d.timestamp;
      sumY += d.bodyFat;
      sumXX += d.timestamp * d.timestamp;
      sumXY += d.timestamp * d.bodyFat;
    }
    
    const avgX = sumX / n;
    const avgY = sumY / n;
    const denom = sumXX - sumX * avgX;
    
    if (denom === 0) return null;
    
    const a = (sumXY - sumX * avgY) / denom;
    const b = avgY - a * avgX;
    
    const x1 = validData[0].timestamp;
    const x2 = validData[validData.length - 1].timestamp;
    
    return [
      { timestamp: x1, bodyFatTrend: a * x1 + b },
      { timestamp: x2, bodyFatTrend: a * x2 + b },
    ];
  }, []);

  /**
   * 腹囲傾向線計算
   * @param data 腹囲データ
   * @returns 腹囲傾向線データ
   */
  const calculateWaistTrendLine = useCallback((data: any[]): any[] | null => {
    if (data.length < 2) return null;
    
    const validData = data.filter(d => d.waist != null && !isNaN(d.waist));
    if (validData.length < 2) return null;
    
    const n = validData.length;
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    
    for (const d of validData) {
      sumX += d.timestamp;
      sumY += d.waist;
      sumXX += d.timestamp * d.timestamp;
      sumXY += d.timestamp * d.waist;
    }
    
    const avgX = sumX / n;
    const avgY = sumY / n;
    const denom = sumXX - sumX * avgX;
    
    if (denom === 0) return null;
    
    const a = (sumXY - sumX * avgY) / denom;
    const b = avgY - a * avgX;
    
    const x1 = validData[0].timestamp;
    const x2 = validData[validData.length - 1].timestamp;
    
    return [
      { timestamp: x1, waistTrend: a * x1 + b },
      { timestamp: x2, waistTrend: a * x2 + b },
    ];
  }, []);

  /**
   * 血圧傾向線計算（収縮期）
   * @param data 血圧データ
   * @returns 収縮期血圧傾向線データ
   */
  const calculateSystolicTrendLine = useCallback((data: any[]): any[] | null => {
    if (data.length < 2) return null;
    
    const validData = data.filter(d => d.systolic != null && !isNaN(d.systolic));
    if (validData.length < 2) return null;
    
    const n = validData.length;
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    
    for (const d of validData) {
      sumX += d.timestamp;
      sumY += d.systolic;
      sumXX += d.timestamp * d.timestamp;
      sumXY += d.timestamp * d.systolic;
    }
    
    const avgX = sumX / n;
    const avgY = sumY / n;
    const denom = sumXX - sumX * avgX;
    
    if (denom === 0) return null;
    
    const a = (sumXY - sumX * avgY) / denom;
    const b = avgY - a * avgX;
    
    const x1 = validData[0].timestamp;
    const x2 = validData[validData.length - 1].timestamp;
    
    return [
      { timestamp: x1, systolicTrend: a * x1 + b },
      { timestamp: x2, systolicTrend: a * x2 + b },
    ];
  }, []);

  /**
   * 血圧傾向線計算（拡張期）
   * @param data 血圧データ
   * @returns 拡張期血圧傾向線データ
   */
  const calculateDiastolicTrendLine = useCallback((data: any[]): any[] | null => {
    if (data.length < 2) return null;
    
    const validData = data.filter(d => d.diastolic != null && !isNaN(d.diastolic));
    if (validData.length < 2) return null;
    
    const n = validData.length;
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    
    for (const d of validData) {
      sumX += d.timestamp;
      sumY += d.diastolic;
      sumXX += d.timestamp * d.timestamp;
      sumXY += d.timestamp * d.diastolic;
    }
    
    const avgX = sumX / n;
    const avgY = sumY / n;
    const denom = sumXX - sumX * avgX;
    
    if (denom === 0) return null;
    
    const a = (sumXY - sumX * avgY) / denom;
    const b = avgY - a * avgX;
    
    const x1 = validData[0].timestamp;
    const x2 = validData[validData.length - 1].timestamp;
    
    return [
      { timestamp: x1, diastolicTrend: a * x1 + b },
      { timestamp: x2, diastolicTrend: a * x2 + b },
    ];
  }, []);

  /**
   * 日付境界線を計算
   * @param data データ配列
   * @returns 日付境界線のタイムスタンプ配列
   */
  const calculateDayStartLines = useCallback((data: any[]): number[] => {
    if (!data.length) return [];
    
    const start = new Date(data[0].timestamp);
    const end = new Date(data[data.length - 1].timestamp);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const lines: number[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      lines.push(
        new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          0,
          0,
          0,
          0
        ).getTime()
      );
    }
    
    return lines;
  }, []);

  /**
   * X軸ティックを計算
   * @param data データ配列
   * @returns X軸ティック配列
   */
  const calculateXAxisTicks = useCallback((data: any[]): number[] => {
    if (!data.length) return [];
    
    const dayStartLines = calculateDayStartLines(data);
    const totalDays = dayStartLines.length;
    
    if (totalDays <= 7) {
      return dayStartLines;
    } else if (totalDays <= 14) {
      return dayStartLines.filter((_, i) => i % 2 === 0);
    } else if (totalDays <= 30) {
      return dayStartLines.filter((_, i) => i % 3 === 0);
    } else if (totalDays <= 60) {
      return dayStartLines.filter((_, i) => i % 7 === 0);
    } else {
      return dayStartLines.filter((_, i) => i % 14 === 0);
    }
  }, [calculateDayStartLines]);

  return {
    // 日付フォーマット
    formatDateForTick,
    
    // 傾向線計算
    calculateTrendLine,
    calculateWeightTrendLine,
    calculateBodyFatTrendLine,
    calculateWaistTrendLine,
    calculateSystolicTrendLine,
    calculateDiastolicTrendLine,
    
    // 軸計算
    calculateDayStartLines,
    calculateXAxisTicks,
  };
};