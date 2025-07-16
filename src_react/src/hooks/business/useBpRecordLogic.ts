import { useCallback } from 'react';
import type { BpRecordV2 } from '../../types/record';

/**
 * 血圧記録のビジネスロジックを管理するカスタムHook
 */
export const useBpRecordLogic = () => {
  /**
   * 血圧分類を取得
   * @param systolic 収縮期血圧
   * @param diastolic 拡張期血圧
   * @returns 血圧分類情報
   */
  const getBpCategory = useCallback((systolic: number, diastolic: number): {
    category: string;
    color: string;
    risk: 'low' | 'normal' | 'high' | 'very_high';
  } => {
    // 日本高血圧学会の基準に基づく分類
    if (systolic < 120 && diastolic < 80) {
      return { category: '正常血圧', color: 'text-green-600', risk: 'low' };
    } else if (systolic < 130 && diastolic < 85) {
      return { category: '正常高値', color: 'text-blue-600', risk: 'normal' };
    } else if (systolic < 140 && diastolic < 90) {
      return { category: '高値血圧', color: 'text-yellow-600', risk: 'normal' };
    } else if (systolic < 160 && diastolic < 100) {
      return { category: 'Ⅰ度高血圧', color: 'text-orange-600', risk: 'high' };
    } else if (systolic < 180 && diastolic < 110) {
      return { category: 'Ⅱ度高血圧', color: 'text-red-600', risk: 'high' };
    } else {
      return { category: 'Ⅲ度高血圧', color: 'text-red-800', risk: 'very_high' };
    }
  }, []);

  /**
   * 血圧の平均値を計算
   * @param records 血圧記録配列
   * @returns 平均血圧
   */
  const calculateAverageBp = useCallback((records: BpRecordV2[]): {
    avgSystolic: number;
    avgDiastolic: number;
    avgHeartRate: number;
  } => {
    if (records.length === 0) {
      return { avgSystolic: 0, avgDiastolic: 0, avgHeartRate: 0 };
    }

    const systolicSum = records.reduce((sum, record) => sum + record.systolic, 0);
    const diastolicSum = records.reduce((sum, record) => sum + record.diastolic, 0);
    const heartRateSum = records.reduce((sum, record) => sum + (record.heartRate || 0), 0);
    const heartRateCount = records.filter(record => record.heartRate !== null).length;

    return {
      avgSystolic: Math.round(systolicSum / records.length),
      avgDiastolic: Math.round(diastolicSum / records.length),
      avgHeartRate: heartRateCount > 0 ? Math.round(heartRateSum / heartRateCount) : 0,
    };
  }, []);

  /**
   * 血圧の最高値・最低値を計算
   * @param records 血圧記録配列
   * @returns 最高値・最低値
   */
  const calculateBpRange = useCallback((records: BpRecordV2[]): {
    maxSystolic: number;
    minSystolic: number;
    maxDiastolic: number;
    minDiastolic: number;
  } => {
    if (records.length === 0) {
      return { maxSystolic: 0, minSystolic: 0, maxDiastolic: 0, minDiastolic: 0 };
    }

    const systolicValues = records.map(record => record.systolic);
    const diastolicValues = records.map(record => record.diastolic);

    return {
      maxSystolic: Math.max(...systolicValues),
      minSystolic: Math.min(...systolicValues),
      maxDiastolic: Math.max(...diastolicValues),
      minDiastolic: Math.min(...diastolicValues),
    };
  }, []);

  /**
   * 記録のデータが有効かどうかを判定
   * @param record 血圧記録
   * @returns 有効かどうか
   */
  const isValidRecord = useCallback((record: BpRecordV2): boolean => {
    return !!(
      record.systolic && 
      record.diastolic && 
      record.systolic > 0 && 
      record.diastolic > 0 &&
      record.systolic < 300 && 
      record.diastolic < 200
    );
  }, []);

  /**
   * フォームデータに記録があるかどうかを判定
   * @param formData フォームデータ
   * @returns 記録があるかどうか
   */
  const hasRecordData = useCallback((formData: {
    systolic: string;
    diastolic: string;
    heartRate?: string;
  }): boolean => {
    return !!(formData.systolic && formData.diastolic);
  }, []);

  /**
   * 血圧記録をソート（日時順）
   * @param records 血圧記録配列
   * @returns ソート済み血圧記録配列
   */
  const sortRecordsByDateTime = useCallback((records: BpRecordV2[]): BpRecordV2[] => {
    return [...records].sort((a, b) => {
      const aDateTime = new Date(`${a.date}T${a.time}`).getTime();
      const bDateTime = new Date(`${b.date}T${b.time}`).getTime();
      return aDateTime - bDateTime;
    });
  }, []);

  /**
   * 血圧トレンドを計算
   * @param records 血圧記録配列
   * @returns トレンド情報
   */
  const calculateBpTrend = useCallback((records: BpRecordV2[]): {
    systolicTrend: 'up' | 'down' | 'stable';
    diastolicTrend: 'up' | 'down' | 'stable';
    trendMessage: string;
  } => {
    if (records.length < 2) {
      return {
        systolicTrend: 'stable',
        diastolicTrend: 'stable',
        trendMessage: 'データが不足しています',
      };
    }

    const sortedRecords = sortRecordsByDateTime(records);
    const recentRecords = sortedRecords.slice(-3); // 直近3件
    const olderRecords = sortedRecords.slice(0, -3);

    if (olderRecords.length === 0) {
      return {
        systolicTrend: 'stable',
        diastolicTrend: 'stable',
        trendMessage: 'トレンド判定には更多データが必要です',
      };
    }

    const recentAvg = calculateAverageBp(recentRecords);
    const olderAvg = calculateAverageBp(olderRecords);

    const systolicDiff = recentAvg.avgSystolic - olderAvg.avgSystolic;
    const diastolicDiff = recentAvg.avgDiastolic - olderAvg.avgDiastolic;

    const systolicTrend = systolicDiff > 5 ? 'up' : systolicDiff < -5 ? 'down' : 'stable';
    const diastolicTrend = diastolicDiff > 5 ? 'up' : diastolicDiff < -5 ? 'down' : 'stable';

    let trendMessage = '';
    if (systolicTrend === 'up' || diastolicTrend === 'up') {
      trendMessage = '血圧が上昇傾向にあります';
    } else if (systolicTrend === 'down' || diastolicTrend === 'down') {
      trendMessage = '血圧が下降傾向にあります';
    } else {
      trendMessage = '血圧は安定しています';
    }

    return {
      systolicTrend,
      diastolicTrend,
      trendMessage,
    };
  }, [calculateAverageBp, sortRecordsByDateTime]);

  return {
    // 分類・判定関数
    getBpCategory,
    isValidRecord,
    hasRecordData,
    
    // 計算関数
    calculateAverageBp,
    calculateBpRange,
    calculateBpTrend,
    
    // ユーティリティ関数
    sortRecordsByDateTime,
  };
};