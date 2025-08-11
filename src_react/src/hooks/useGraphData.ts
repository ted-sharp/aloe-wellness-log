import { useCallback, useEffect, useMemo } from 'react';
import { useGoalStore, useRecordsStore } from '../store';
import { formatDate } from '../utils/dateUtils';
import { isDev } from '../utils/devTools';

/**
 * グラフ表示用の統合データフェッチングフック
 * RecordGraph.tsx専用の複数データソース管理
 */
export function useGraphData() {
  // 統一されたレコードストアからデータと状態を取得
  const recordsStore = useRecordsStore();
  const goalStore = useGoalStore();

  const { weightRecords, dailyRecords, bpRecords, loading, errors } =
    recordsStore;

  const { goal } = goalStore;

  // 初期データロード（MobXストアの初期化状態を活用）
  useEffect(() => {
    const loadData = async () => {
      if (isDev) console.log('useGraphData: Loading initial data');
      await Promise.all([goalStore.loadGoal(), recordsStore.loadAllData()]);
    };

    loadData();
  }, []); // 空の依存配列でマウント時のみ実行

  // 統合データロード関数（外部から呼び出し用）
  const loadAllDataWithBp = useCallback(async () => {
    await Promise.all([goalStore.loadGoal(), recordsStore.loadAllData()]);
  }, [goalStore.loadGoal, recordsStore.loadAllData]);

  // 統合されたローディング状態
  const isLoading = useMemo(() => {
    return loading.weight || loading.daily || loading.bp || loading.global;
  }, [loading.weight, loading.daily, loading.bp, loading.global]);

  // 統合されたエラー状態
  const hasError = useMemo(() => {
    return !!(errors.weight || errors.daily || errors.bp || errors.global);
  }, [errors.weight, errors.daily, errors.bp, errors.global]);

  // 体重データの処理（最適化版：O(n) アルゴリズム）
  const processedWeightData = useMemo(() => {
    if (isDev) {
      console.log(
        'useGraphData: Processing weight records:',
        weightRecords.length
      );
    }

    // 最適化：タイムスタンプの重複をMapで管理（O(n)）
    const timestampCounts = new Map<number, number>();

    return weightRecords
      .map(record => {
        const dateTime = `${record.date}T${record.time}`;
        const baseTimestamp = new Date(dateTime).getTime();

        // 現在のタイムスタンプの使用回数を取得
        const currentCount = timestampCounts.get(baseTimestamp) || 0;
        const uniqueTimestamp = baseTimestamp + currentCount;

        // 使用回数を更新
        timestampCounts.set(baseTimestamp, currentCount + 1);

        return {
          ...record,
          dateTime,
          timestamp: uniqueTimestamp,
          weight: record.weight,
          value: record.weight, // グラフ表示用のvalue プロパティ
          excluded: record.excludeFromGraph || false,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // 時系列順でソート
  }, [weightRecords]);

  // 体脂肪データの処理（最適化版：O(n) アルゴリズム）
  const processedBodyFatData = useMemo(() => {
    // 最適化：タイムスタンプの重複をMapで管理（O(n)）
    const timestampCounts = new Map<number, number>();

    return weightRecords
      .map(record => {
        const dateTime = `${record.date}T${record.time}`;
        const baseTimestamp = new Date(dateTime).getTime();

        // 現在のタイムスタンプの使用回数を取得
        const currentCount = timestampCounts.get(baseTimestamp) || 0;
        const uniqueTimestamp = baseTimestamp + currentCount;

        // 使用回数を更新
        timestampCounts.set(baseTimestamp, currentCount + 1);

        return {
          ...record,
          dateTime,
          timestamp: uniqueTimestamp,
          bodyFat: record.bodyFat ?? null,
          waist: record.waist ?? null,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // 時系列順でソート
  }, [weightRecords]);

  // 血圧データの処理（最適化版：O(n) アルゴリズム）
  const processedBpData = useMemo(() => {
    if (isDev)
      console.log('useGraphData: Processing BP records:', bpRecords.length);

    // 最適化：タイムスタンプの重複をMapで管理（O(n)）
    const timestampCounts = new Map<number, number>();

    return bpRecords
      .map(record => {
        const dateTime = `${record.date}T${record.time}`;
        const baseTimestamp = new Date(dateTime).getTime();

        // 現在のタイムスタンプの使用回数を取得
        const currentCount = timestampCounts.get(baseTimestamp) || 0;
        const uniqueTimestamp = baseTimestamp + currentCount;

        // 使用回数を更新
        timestampCounts.set(baseTimestamp, currentCount + 1);

        return {
          ...record,
          dateTime,
          timestamp: uniqueTimestamp,
          systolic: record.systolic,
          diastolic: record.diastolic,
          pulse: record.heartRate || 0, // heartRate プロパティを pulse として使用
          excluded: record.excludeFromGraph || false,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // 時系列順でソート
  }, [bpRecords]);

  // 統合された最新日付（MobXストアから直接取得）
  const latestDate = useMemo(() => {
    const allDates = [
      ...weightRecords.map(r => r.date),
      ...bpRecords.map(r => r.date),
    ];
    return allDates.length > 0 ? allDates.sort().reverse()[0] : null;
  }, [weightRecords, bpRecords]);

  // 期間内のデータ取得
  const getDataInPeriod = useCallback(
    (days: number) => {
      if (!latestDate) return { weight: [], bp: [] };

      const endDate = new Date(latestDate);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days + 1);

      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      return {
        weight: processedWeightData.filter(
          r => r.date >= startDateStr && r.date <= endDateStr
        ),
        bp: processedBpData.filter(
          r => r.date >= startDateStr && r.date <= endDateStr
        ),
      };
    },
    [latestDate, processedWeightData, processedBpData]
  );

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
  const getDailyStats = useCallback(
    (fieldId: string, days: number) => {
      if (!latestDate) return { total: 0, achieved: 0, rate: 0 };

      const endDate = new Date(latestDate);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days + 1);

      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      const filteredData = processedDailyData.filter(
        r =>
          r.fieldId === fieldId &&
          r.date >= startDateStr &&
          r.date <= endDateStr
      );

      const achieved = filteredData.filter(r => r.achieved).length;
      const total = filteredData.length;
      const rate = total > 0 ? (achieved / total) * 100 : 0;

      return { total, achieved, rate };
    },
    [latestDate, processedDailyData]
  );

  // データのリフレッシュ
  const refreshData = useCallback(() => {
    loadAllDataWithBp();
  }, [loadAllDataWithBp]);

  // RecordGraph.tsx に必要な追加メソッド（MobX最適化版を使用）
  const getFilteredData = useCallback(
    (period: number, showExcluded: boolean) => {
      // MobXストアの最適化済みメソッドを使用
      const processedData = recordsStore.processedWeightRecordsForGraph;

      // 今日の日付を基準に期間フィルタリング
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - period + 1);
      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      const periodData = processedData.filter(
        r => r.date >= startDateStr && r.date <= endDateStr
      );

      // 除外フラグ考慮
      const filteredData = showExcluded
        ? periodData
        : periodData.filter(r => !r.excludeFromGraph);
      if (isDev) {
        console.log(
          'getFilteredData (MobX optimized): period=',
          period,
          'showExcluded=',
          showExcluded,
          'endDate=',
          endDateStr,
          'filtered=',
          filteredData.length
        );
      }

      return filteredData.map(r => ({
        ...r,
        value: r.weight, // グラフ表示用のvalue プロパティ
        excluded: r.excludeFromGraph || false,
      }));
    },
    [recordsStore.processedWeightRecordsForGraph]
  );

  const getFilteredBpData = useCallback(
    (period: number, showExcluded: boolean) => {
      // MobXストアの最適化済みメソッドを使用
      const processedData = recordsStore.processedBpRecordsForGraph;

      // 今日の日付を基準に期間フィルタリング
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - period + 1);
      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      const periodData = processedData.filter(
        r => r.date >= startDateStr && r.date <= endDateStr
      );

      // 除外フラグ考慮
      const filteredData = showExcluded
        ? periodData
        : periodData.filter(r => !r.excludeFromGraph);

      // 10分（600000ms）以内の測定は「最小値の測定」を1つに集約
      const WINDOW_MS = 10 * 60 * 1000;
      type BpPoint = (typeof filteredData)[number];
      const score = (p: BpPoint) => (p.systolic ?? 0) + (p.diastolic ?? 0);
      const isBetter = (a: BpPoint, b: BpPoint) => {
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sa < sb;
        if ((a.diastolic ?? 0) !== (b.diastolic ?? 0))
          return (a.diastolic ?? 0) < (b.diastolic ?? 0);
        return a.timestamp < b.timestamp;
      };

      const reduced: BpPoint[] = [];
      let groupAnchorTs: number | null = null;
      let groupBest: BpPoint | null = null;

      for (const rec of filteredData) {
        const ts = rec.timestamp as number;
        if (groupAnchorTs === null) {
          groupAnchorTs = ts;
          groupBest = rec;
          continue;
        }
        if (ts - groupAnchorTs <= WINDOW_MS) {
          // 同一ウィンドウ内 → より低い値を選択
          if (groupBest && isBetter(rec, groupBest)) {
            groupBest = rec;
          }
        } else {
          // グループ終了
          if (groupBest) reduced.push(groupBest);
          groupAnchorTs = ts;
          groupBest = rec;
        }
      }
      if (groupBest) reduced.push(groupBest);

      return reduced.map(r => ({
        ...r,
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.heartRate || 0,
        excluded: r.excludeFromGraph || false,
      }));
    },
    [recordsStore.processedBpRecordsForGraph]
  );

  const getFilteredBodyCompositionData = useCallback(
    (period: number, showExcluded: boolean) => {
      // MobXストアの最適化済みメソッドを使用
      const processedData = recordsStore.processedBodyCompositionForGraph;

      // 今日の日付を基準に期間フィルタリング
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - period + 1);
      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      const periodData = processedData.filter(
        r => r.date >= startDateStr && r.date <= endDateStr
      );

      // 除外フラグ考慮 + excludedフラグを明示付与
      const filtered = showExcluded
        ? periodData
        : periodData.filter(r => !r.excludeFromGraph);

      return filtered.map(r => ({
        ...r,
        excluded: Boolean(r.excludeFromGraph),
      }));
    },
    [recordsStore.processedBodyCompositionForGraph]
  );

  const getStatusStats = useCallback(
    (fieldId: string, period: number) => {
      // MobXストアの最適化済みメソッドを使用
      return recordsStore.getDailyRecordStats(fieldId, period);
    },
    [recordsStore.getDailyRecordStats]
  );

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
    errors: {
      weight: errors.weight,
      daily: errors.daily,
      bp: errors.bp,
      global: errors.global,
    },

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
