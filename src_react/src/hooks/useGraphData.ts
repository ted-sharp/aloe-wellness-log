import { useEffect, useMemo, useCallback, useState } from 'react';
import { useRecordsSelectors, useEnhancedRecordsStore } from '../store/records.enhanced';
import { useGoalStore } from '../store/goal';
import { getAllBpRecords } from '../db';
import type { WeightRecordV2, BpRecordV2 } from '../types/record';

/**
 * グラフ表示用の統合データフェッチングフック
 * RecordGraph.tsx専用の複数データソース管理
 */
export function useGraphData() {
  // Enhanced Records Store からデータと状態を取得
  const weightRecords = useRecordsSelectors.weightRecords();
  const dailyRecords = useRecordsSelectors.dailyRecords();
  const loading = useRecordsSelectors.loading();
  const errors = useRecordsSelectors.errors();
  
  // ストアから直接アクションを取得（セレクターは使わない）
  const loadAllData = useEnhancedRecordsStore(state => state.loadAllData);
  
  // Goal store
  const { goal, loadGoal } = useGoalStore();
  
  // 血圧データの状態管理
  const [bpRecords, setBpRecords] = useState<BpRecordV2[]>([]);
  const [bpLoading, setBpLoading] = useState(false);
  const [bpError, setBpError] = useState<string | null>(null);
  
  // 血圧データの取得
  const loadBpData = useCallback(async () => {
    setBpLoading(true);
    setBpError(null);
    try {
      const records = await getAllBpRecords();
      setBpRecords(records);
    } catch (error) {
      setBpError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBpLoading(false);
    }
  }, []);

  // 初期データロード
  useEffect(() => {
    loadAllData();
    loadGoal();
    loadBpData();
  }, [loadBpData]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // 最新データのタイムスタンプ計算
  const latestTimestamp = useMemo(() => {
    const weightTimestamps = weightRecords.map(r => new Date(`${r.date}T${r.time}`).getTime());
    const bpTimestamps = bpRecords.map(r => new Date(`${r.date}T${r.time}`).getTime());
    const allTimestamps = [...weightTimestamps, ...bpTimestamps];
    return allTimestamps.length > 0 ? Math.max(...allTimestamps) : 0;
  }, [weightRecords, bpRecords]);
  
  // 期間フィルタリング用のデータ処理関数
  const getFilteredData = useCallback((periodIdx: number, showExcluded: boolean) => {
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
  }, [weightRecords, latestTimestamp]);

  // 体脂肪率・腹囲データのフィルタリング用関数
  const getFilteredBodyCompositionData = useCallback((periodIdx: number) => {
    const PERIODS = [
      { label: '2週間', days: 14 },
      { label: '1か月半', days: 45 },
      { label: '3か月', days: 90 },
      { label: '全データ', days: null },
    ];
    
    const filtered = weightRecords
      .filter(
        (r: WeightRecordV2) =>
          (typeof r.bodyFat === 'number' && isFinite(r.bodyFat)) ||
          (typeof r.waist === 'number' && isFinite(r.waist))
      )
      .sort((a, b) => {
        const adt = new Date(`${a.date}T${a.time}`).getTime();
        const bdt = new Date(`${b.date}T${b.time}`).getTime();
        return adt - bdt;
      });
    
    let mapped = filtered.map(r => ({
      datetime: `${r.date}T${r.time}`,
      timestamp: new Date(`${r.date}T${r.time}`).getTime(),
      bodyFat: typeof r.bodyFat === 'number' && isFinite(r.bodyFat) ? r.bodyFat : null,
      waist: typeof r.waist === 'number' && isFinite(r.waist) ? r.waist : null,
    }));
    
    const period = PERIODS[periodIdx];
    if (period.days && latestTimestamp) {
      const from = latestTimestamp - period.days * 24 * 60 * 60 * 1000;
      mapped = mapped.filter(d => d.timestamp >= from);
    }
    
    return mapped;
  }, [weightRecords, latestTimestamp]);

  // 血圧データのフィルタリング用関数
  const getFilteredBpData = useCallback((periodIdx: number, type: 'systolic' | 'diastolic', showExcluded: boolean = false) => {
    const PERIODS = [
      { label: '2週間', days: 14 },
      { label: '1か月半', days: 45 },
      { label: '3か月', days: 90 },
      { label: '全データ', days: null },
    ];
    
    const filtered = bpRecords
      .filter(r => 
        typeof r.systolic === 'number' && 
        typeof r.diastolic === 'number' &&
        (showExcluded || !r.excludeFromGraph)
      )
      .sort((a, b) => {
        const adt = new Date(`${a.date}T${a.time}`).getTime();
        const bdt = new Date(`${b.date}T${b.time}`).getTime();
        return adt - bdt;
      });
    
    let mapped = filtered.map(r => ({
      datetime: `${r.date}T${r.time}`,
      timestamp: new Date(`${r.date}T${r.time}`).getTime(),
      systolic: r.systolic,
      diastolic: r.diastolic,
      value: type === 'systolic' ? r.systolic : r.diastolic,
      excluded: !!r.excludeFromGraph,
    }));
    
    const period = PERIODS[periodIdx];
    if (period.days && latestTimestamp) {
      const from = latestTimestamp - period.days * 24 * 60 * 60 * 1000;
      mapped = mapped.filter(d => d.timestamp >= from);
    }
    
    return mapped;
  }, [bpRecords, latestTimestamp]);
  
  // 期間内の日付リスト取得
  const getPeriodDateList = useCallback((periodIdx: number) => {
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
  }, [dailyRecords, latestTimestamp]);
  
  // 日課達成統計の計算
  const getStatusStats = useCallback((fieldId: 'exercise' | 'meal' | 'sleep', periodIdx: number) => {
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
  }, [dailyRecords, getPeriodDateList]);
  
  // 全体のローディング状態
  const isLoading = loading.global || loading.weight || loading.daily || bpLoading;
  
  // 全体のエラー状態 
  const error = errors.weight?.message || errors.daily?.message || bpError || null;
  
  // データ再取得関数
  const refetch = useCallback(() => {
    loadAllData();
    loadGoal();
    loadBpData();
  }, [loadBpData]); // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    // データ
    weightRecords,
    bpRecords,
    dailyRecords,
    goal,
    latestTimestamp,
    
    // 状態
    isLoading,
    error,
    
    // 計算済みデータ取得関数
    getFilteredData,
    getFilteredBpData,
    getFilteredBodyCompositionData,
    getPeriodDateList,
    getStatusStats,
    
    // 操作
    refetch,
  };
}