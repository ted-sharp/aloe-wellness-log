import { useEffect, useMemo, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { enhancedRecordsStore } from '../store/records.enhanced';
import { goalStore } from '../store/goal.mobx';
import { getAllBpRecords } from '../db';
import type { WeightRecordV2, BpRecordV2 } from '../types/record';

/**
 * グラフ表示用の統合データフェッチングフック
 * RecordGraph.tsx専用の複数データソース管理
 */
export function useGraphData() {
  // Enhanced Records Store からデータと状態を取得
  const weightRecords = enhancedRecordsStore.weightRecords;
  const dailyRecords = enhancedRecordsStore.dailyRecords;
  const loading = enhancedRecordsStore.loading;
  const errors = enhancedRecordsStore.errors;
  
  // Goal store
  const goal = goalStore.goal;
  
  // 血圧データの状態管理
  const [bpRecords, setBpRecords] = useState<BpRecordV2[]>([]);
  const [bpLoading, setBpLoading] = useState(false);
  const [bpError, setBpError] = useState<string | null>(null);
  
  // 血圧データの取得
  const loadBpRecords = useCallback(async () => {
    setBpLoading(true);
    setBpError(null);
    
    try {
      const records = await getAllBpRecords();
      setBpRecords(records);
    } catch (error: any) {
      setBpError(error.message || 'Unknown error');
    } finally {
      setBpLoading(false);
    }
  }, []);
  
  // 統合データロード
  const loadAllDataWithBp = useCallback(async () => {
    await Promise.all([
      goalStore.loadGoal(),
      loadBpRecords(),
      enhancedRecordsStore.loadAllData(),
    ]);
  }, [loadBpRecords]);
  
  // 初期データロード
  useEffect(() => {
    console.log('useGraphData: Loading initial data');
    loadAllDataWithBp();
  }, [loadAllDataWithBp]);
  
  // 統合されたローディング状態
  const isLoading = useMemo(() => {
    return loading.weight || loading.daily || bpLoading || loading.global;
  }, [loading.weight, loading.daily, bpLoading, loading.global]);
  
  // 統合されたエラー状態
  const hasError = useMemo(() => {
    return !!(errors.weight || errors.daily || bpError || errors.global);
  }, [errors.weight, errors.daily, bpError, errors.global]);
  
  // 体重データの処理
  const processedWeightData = useMemo(() => {
    console.log('useGraphData: Processing weight records:', weightRecords.length);
    return weightRecords
      .map((record, index) => {
        const dateTime = `${record.date}T${record.time}`;
        let timestamp = new Date(dateTime).getTime();
        
        // 同じタイムスタンプを持つレコードの場合、ミリ秒を追加してユニークにする
        const duplicateCount = weightRecords.filter((r, i) => 
          i < index && new Date(`${r.date}T${r.time}`).getTime() === timestamp
        ).length;
        if (duplicateCount > 0) {
          timestamp = timestamp + duplicateCount; // 重複数分だけミリ秒を追加
        }
        
        return {
          ...record,
          dateTime,
          timestamp,
          weight: record.weight,
          value: record.weight, // グラフ表示用のvalue プロパティ
          excluded: record.excludeFromGraph || false,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // 時系列順でソート
  }, [weightRecords]);
  
  // 体脂肪データの処理
  const processedBodyFatData = useMemo(() => {
    return weightRecords
      .map((record, index) => {
        const dateTime = `${record.date}T${record.time}`;
        let timestamp = new Date(dateTime).getTime();
        
        // 同じタイムスタンプを持つレコードの場合、ミリ秒を追加してユニークにする
        const duplicateCount = weightRecords.filter((r, i) => 
          i < index && new Date(`${r.date}T${r.time}`).getTime() === timestamp
        ).length;
        if (duplicateCount > 0) {
          timestamp = timestamp + duplicateCount; // 重複数分だけミリ秒を追加
        }
        
        return {
          ...record,
          dateTime,
          timestamp,
          bodyFat: record.bodyFat ?? null,
          waist: record.waist ?? null,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // 時系列順でソート
  }, [weightRecords]);
  
  // 血圧データの処理
  const processedBpData = useMemo(() => {
    console.log('useGraphData: Processing BP records:', bpRecords.length);
    return bpRecords
      .map((record, index) => {
        const dateTime = `${record.date}T${record.time}`;
        let timestamp = new Date(dateTime).getTime();
        
        // 同じタイムスタンプを持つレコードの場合、ミリ秒を追加してユニークにする
        const duplicateCount = bpRecords.filter((r, i) => 
          i < index && new Date(`${r.date}T${r.time}`).getTime() === timestamp
        ).length;
        if (duplicateCount > 0) {
          timestamp = timestamp + duplicateCount; // 重複数分だけミリ秒を追加
        }
        
        return {
          ...record,
          dateTime,
          timestamp,
          systolic: record.systolic,
          diastolic: record.diastolic,
          pulse: record.heartRate || 0, // heartRate プロパティを pulse として使用
          excluded: record.excludeFromGraph || false,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // 時系列順でソート
  }, [bpRecords]);
  
  // 統合された最新日付
  const latestDate = useMemo(() => {
    const allDates = [
      ...processedWeightData.map(r => r.date),
      ...processedBpData.map(r => r.date),
    ];
    return allDates.length > 0 ? allDates.sort().reverse()[0] : null;
  }, [processedWeightData, processedBpData]);
  
  // 期間内のデータ取得
  const getDataInPeriod = useCallback((days: number) => {
    if (!latestDate) return { weight: [], bp: [] };
    
    const endDate = new Date(latestDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    return {
      weight: processedWeightData.filter(r => r.date >= startDateStr && r.date <= endDateStr),
      bp: processedBpData.filter(r => r.date >= startDateStr && r.date <= endDateStr),
    };
  }, [latestDate, processedWeightData, processedBpData]);
  
  // 日課データの処理
  const processedDailyData = useMemo(() => {
    return dailyRecords.map(record => ({
      fieldId: record.fieldId,
      date: record.date,
      value: record.value,
      achieved: record.value === 1,
    }));
  }, [dailyRecords]);
  
  // 日課統計の取得
  const getDailyStats = useCallback((fieldId: string, days: number) => {
    if (!latestDate) return { total: 0, achieved: 0, rate: 0 };
    
    const endDate = new Date(latestDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const filteredData = processedDailyData.filter(
      r => r.fieldId === fieldId && r.date >= startDateStr && r.date <= endDateStr
    );
    
    const achieved = filteredData.filter(r => r.achieved).length;
    const total = filteredData.length;
    const rate = total > 0 ? (achieved / total) * 100 : 0;
    
    return { total, achieved, rate };
  }, [latestDate, processedDailyData]);
  
  // データのリフレッシュ
  const refreshData = useCallback(() => {
    loadAllDataWithBp();
  }, [loadAllDataWithBp]);
  
  // RecordGraph.tsx に必要な追加メソッド
  const getFilteredData = useCallback((period: number, showExcluded: boolean) => {
    const data = getDataInPeriod(period);
    const filteredData = showExcluded ? data.weight : data.weight.filter(r => !r.excluded);
    console.log('getFilteredData: period=', period, 'showExcluded=', showExcluded, 'data.weight=', data.weight.length, 'filtered=', filteredData.length);
    return filteredData;
  }, [getDataInPeriod]);
  
  const getFilteredBpData = useCallback((period: number, showExcluded: boolean) => {
    const data = getDataInPeriod(period);
    return showExcluded ? data.bp : data.bp.filter(r => !r.excluded);
  }, [getDataInPeriod]);
  
  const getFilteredBodyCompositionData = useCallback((period: number, showExcluded: boolean) => {
    const data = getDataInPeriod(period);
    // 期間内のデータを使用し、除外フラグも考慮
    const periodData = processedBodyFatData.filter(r => {
      if (!latestDate) return false;
      const endDate = new Date(latestDate);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - period + 1);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      return r.date >= startDateStr && r.date <= endDateStr;
    });
    return showExcluded ? periodData : periodData.filter(r => !r.excludeFromGraph);
  }, [processedBodyFatData, latestDate]);
  
  const getStatusStats = useCallback((fieldId: string, period: number) => {
    return getDailyStats(fieldId, period);
  }, [getDailyStats]);
  
  return {
    // データ
    weightRecords: processedWeightData,
    bpRecords: processedBpData,
    dailyRecords: processedDailyData,
    goal,
    
    // 状態
    isLoading,
    hasError,
    error: hasError ? 'データの取得に失敗しました' : null,
    errors: { weight: errors.weight, daily: errors.daily, bp: bpError, global: errors.global },
    
    // 処理されたデータ
    latestDate,
    getDataInPeriod,
    getDailyStats,
    
    // RecordGraph.tsx用の追加メソッド
    getFilteredData,
    getFilteredBpData,
    getFilteredBodyCompositionData,
    getStatusStats,
    
    // アクション
    loadAllData: loadAllDataWithBp,
    refreshData,
  };
}