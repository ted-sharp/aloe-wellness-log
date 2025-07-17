import { useCallback } from 'react';
import type { WeightRecordV2 } from '../../types/record';
import type { GoalData } from '../../types/goal';

// 定型文の定数（元の7個に戻す）
export const WEIGHT_NOTE_EXAMPLES = [
  '朝一',
  '朝食後',
  '夕食前',
  '夕食後',
  '就寝前',
  '運動後に測定',
  '外食あり',
] as const;

export type WeightNoteExample = typeof WEIGHT_NOTE_EXAMPLES[number];

/**
 * 体重記録のビジネスロジックを管理するカスタムHook
 */
export const useWeightRecordLogic = () => {
  /**
   * BMI計算
   * @param weight 体重（kg）
   * @param height 身長（cm）
   * @returns BMI値（小数点第2位まで）
   */
  const calculateBMI = useCallback((weight: number, height: number): number => {
    if (height <= 0) return 0;
    return Number((weight / Math.pow(height / 100, 2)).toFixed(2));
  }, []);

  /**
   * 体重変化計算
   * @param currentWeight 現在の体重
   * @param startWeight 開始時の体重
   * @returns 体重変化（kg）
   */
  const calculateWeightChange = useCallback((currentWeight: number, startWeight: number): number => {
    return Number((currentWeight - startWeight).toFixed(2));
  }, []);

  /**
   * 日付の記録群から最低体重を計算
   * @param records 記録配列
   * @returns 最低体重
   */
  const calculateLowestWeight = useCallback((records: WeightRecordV2[]): number => {
    if (records.length === 0) return 0;
    return Math.min(...records.map(record => Number(record.weight)));
  }, []);

  /**
   * 記録があるかどうかを判定
   * @param formData フォームデータ
   * @returns 記録があるかどうか
   */
  const hasRecordData = useCallback((formData: {
    weight: string;
    bodyFat: string;
    waist: string;
  }): boolean => {
    return !!(formData.weight || formData.bodyFat || formData.waist);
  }, []);

  /**
   * BMI表示情報を計算
   * @param recordsOfDay その日の記録群
   * @param goal 目標設定
   * @returns BMI表示情報
   */
  const calculateBMIDisplayInfo = useCallback((
    recordsOfDay: WeightRecordV2[],
    goal: GoalData | null
  ): {
    shouldShowBMI: boolean;
    bmi: number;
    weightChange: number;
    lowestWeight: number;
  } => {
    const hasRecords = recordsOfDay.length > 0;
    const hasGoal = goal && goal.height && goal.height > 0;
    
    if (!hasRecords || !hasGoal) {
      return {
        shouldShowBMI: false,
        bmi: 0,
        weightChange: 0,
        lowestWeight: 0,
      };
    }

    const lowestWeight = calculateLowestWeight(recordsOfDay);
    const bmi = calculateBMI(lowestWeight, goal.height!);
    const weightChange = calculateWeightChange(lowestWeight, goal.startWeight || 0);

    return {
      shouldShowBMI: true,
      bmi,
      weightChange,
      lowestWeight,
    };
  }, [calculateBMI, calculateWeightChange, calculateLowestWeight]);

  /**
   * BMI分類を取得
   * @param bmi BMI値
   * @returns BMI分類
   */
  const getBMICategory = useCallback((bmi: number): {
    category: string;
    color: string;
  } => {
    if (bmi < 18.5) {
      return { category: '低体重', color: 'text-blue-600' };
    } else if (bmi < 25) {
      return { category: '普通体重', color: 'text-green-600' };
    } else if (bmi < 30) {
      return { category: '肥満度1', color: 'text-yellow-600' };
    } else {
      return { category: '肥満度2以上', color: 'text-red-600' };
    }
  }, []);

  /**
   * 体重変化の表示情報を取得
   * @param weightChange 体重変化
   * @returns 表示情報
   */
  const getWeightChangeDisplay = useCallback((weightChange: number): {
    text: string;
    color: string;
    icon: string;
  } => {
    if (weightChange > 0) {
      return {
        text: `+${weightChange}kg`,
        color: 'text-red-600',
        icon: '↗',
      };
    } else if (weightChange < 0) {
      return {
        text: `${weightChange}kg`,
        color: 'text-blue-600',
        icon: '↘',
      };
    } else {
      return {
        text: '±0kg',
        color: 'text-gray-600',
        icon: '→',
      };
    }
  }, []);

  /**
   * 記録のデータが有効かどうかを判定
   * @param record 記録データ
   * @returns 有効かどうか
   */
  const isValidRecord = useCallback((record: WeightRecordV2): boolean => {
    return !!(record.weight && record.weight > 0);
  }, []);

  /**
   * 記録をソート（日時順）
   * @param records 記録配列
   * @returns ソート済み記録配列
   */
  const sortRecordsByDateTime = useCallback((records: WeightRecordV2[]): WeightRecordV2[] => {
    return [...records].sort((a, b) => {
      const aDateTime = new Date(`${a.date}T${a.time}`).getTime();
      const bDateTime = new Date(`${b.date}T${b.time}`).getTime();
      return aDateTime - bDateTime;
    });
  }, []);

  return {
    // 計算関数
    calculateBMI,
    calculateWeightChange,
    calculateLowestWeight,
    calculateBMIDisplayInfo,
    
    // 判定関数
    hasRecordData,
    isValidRecord,
    
    // 表示関数
    getBMICategory,
    getWeightChangeDisplay,
    
    // ユーティリティ関数
    sortRecordsByDateTime,
    
    // 定数
    noteExamples: WEIGHT_NOTE_EXAMPLES,
  };
};