import { useEffect, useMemo, useState } from 'react';
import { getAllDailyRecords, getAllWeightRecords } from '../db/indexedDb';
import { useGoalStore } from '../store/goal';
import type { DailyRecordV2, WeightRecordV2 } from '../types/record';

/**
 * グラフ表示用の統合データフェッチングフック
 * RecordGraph.tsx専用の複数データソース管理
 */
export function useGraphData() {
  // データ状態
  const [weightRecords, setWeightRecords] = useState<WeightRecordV2[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecordV2[]>([]);
  
  // ローディング状態
  const [isLoadingWeight, setIsLoadingWeight] = useState(true);
  const [isLoadingDaily, setIsLoadingDaily] = useState(true);
  const [isLoadingGoal, setIsLoadingGoal] = useState(true);
  
  // エラー状態
  const [weightError, setWeightError] = useState<string | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);
  
  // Goal store
  const { goal, loadGoal } = useGoalStore();
  
  // 体重データの取得
  const fetchWeightRecords = async () => {
    try {
      setIsLoadingWeight(true);
      setWeightError(null);
      const records = await getAllWeightRecords();
      setWeightRecords(records);
    } catch (error) {
      setWeightError(error instanceof Error ? error.message : '体重データの取得に失敗しました');
    } finally {
      setIsLoadingWeight(false);
    }
  };
  
  // 日課データの取得
  const fetchDailyRecords = async () => {
    try {
      setIsLoadingDaily(true);
      setDailyError(null);
      const records = await getAllDailyRecords();
      setDailyRecords(records);
    } catch (error) {
      setDailyError(error instanceof Error ? error.message : '日課データの取得に失敗しました');
    } finally {
      setIsLoadingDaily(false);
    }
  };
  
  // ゴールデータの取得
  const fetchGoalData = async () => {
    try {
      setIsLoadingGoal(true);
      await loadGoal();
    } catch (error) {
      // Goal store handles its own error state
    } finally {
      setIsLoadingGoal(false);
    }
  };
  
  // 初期データロード
  useEffect(() => {
    Promise.all([
      fetchWeightRecords(),
      fetchDailyRecords(), 
      fetchGoalData()
    ]);
  }, []);
  
  // 最新データのタイムスタンプ計算
  const latestTimestamp = useMemo(() => {
    if (!weightRecords.length) return 0;
    return Math.max(
      ...weightRecords.map(r => new Date(`${r.date}T${r.time}`).getTime())
    );
  }, [weightRecords]);
  
  // 期間フィルタリング用のデータ処理関数
  const getFilteredData = (periodIdx: number, showExcluded: boolean) => {
    const PERIODS = [
      { label: '2週間', days: 14 },
      { label: '1か月半', days: 45 },
      { label: '3か月', days: 90 },
      { label: '全データ', days: null },
    ];
    
    const filtered = weightRecords
      .filter(
        (r: WeightRecordV2) =>
          typeof r.weight === 'number' && (showExcluded || !r.excludeFromGraph)
      )
      .sort((a, b) => {
        const adt = new Date(`${a.date}T${a.time}`).getTime();
        const bdt = new Date(`${b.date}T${b.time}`).getTime();
        return adt - bdt;
      });
    
    let mapped = filtered.map(r => ({
      datetime: `${r.date}T${r.time}`,
      timestamp: new Date(`${r.date}T${r.time}`).getTime(),
      value: Number(r.weight),
      excluded: !!r.excludeFromGraph,
    }));
    
    const period = PERIODS[periodIdx];
    if (period.days && latestTimestamp) {
      const from = latestTimestamp - period.days * 24 * 60 * 60 * 1000;
      mapped = mapped.filter(d => d.timestamp >= from);
    }
    
    return mapped;
  };
  
  // 期間内の日付リスト取得
  const getPeriodDateList = (periodIdx: number) => {
    const PERIODS = [
      { label: '2週間', days: 14 },
      { label: '1か月半', days: 45 },
      { label: '3か月', days: 90 },
      { label: '全データ', days: null },
    ];
    
    if (!dailyRecords.length) return [];
    
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    
    if (PERIODS[periodIdx].days && latestTimestamp) {
      toDate = new Date(latestTimestamp);
      fromDate = new Date(latestTimestamp);
      fromDate.setDate(toDate.getDate() - PERIODS[periodIdx].days + 1);
    } else if (dailyRecords.length > 0) {
      const sorted = [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date));
      fromDate = new Date(sorted[0].date);
      toDate = new Date(sorted[sorted.length - 1].date);
    }
    
    if (!fromDate || !toDate) return [];
    
    const list: string[] = [];
    const d = new Date(fromDate);
    while (d <= toDate) {
      list.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      );
      d.setDate(d.getDate() + 1);
    }
    return list;
  };
  
  // 日課達成統計の計算
  const getStatusStats = (fieldId: 'exercise' | 'meal' | 'sleep', periodIdx: number) => {
    const dateList = getPeriodDateList(periodIdx);
    let total = 0;
    let success = 0;
    
    dateList.forEach(date => {
      const rec = dailyRecords.find(r => r.fieldId === fieldId && r.date === date);
      if (rec && (rec.value === 1 || rec.value === 0)) {
        total++;
        if (rec.value === 1) success++;
      }
    });
    
    return {
      total,
      success,
      percent: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  };
  
  // 全体のローディング状態
  const isLoading = isLoadingWeight || isLoadingDaily || isLoadingGoal;
  
  // 全体のエラー状態
  const error = weightError || dailyError;
  
  // データ再取得関数
  const refetch = () => {
    return Promise.all([
      fetchWeightRecords(),
      fetchDailyRecords(),
      fetchGoalData()
    ]);
  };
  
  return {
    // データ
    weightRecords,
    dailyRecords,
    goal,
    latestTimestamp,
    
    // 状態
    isLoading,
    error,
    
    // 計算済みデータ取得関数
    getFilteredData,
    getPeriodDateList,
    getStatusStats,
    
    // 操作
    refetch,
  };
}