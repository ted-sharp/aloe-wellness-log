import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  addDailyRecord,
  deleteDailyRecord,
  getAllDailyRecords,
  updateDailyRecord,
} from '../db';
import type { DailyRecordV2, DailyFieldV2 } from '../types/record';

/**
 * 日課記録管理フック
 * レコードの CRUD 操作、達成度入力、フィルタリングを管理
 */
export const useDailyRecords = (selectedDate: string) => {
  // 状態管理
  const [records, setRecords] = useState<DailyRecordV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 全レコードの読み込み
   */
  const loadRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allRecords = await getAllDailyRecords();
      setRecords(allRecords);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '日課記録の読み込みに失敗しました';
      setError(errorMessage);
      console.error('Error loading daily records:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 特定の日付とフィールドのレコードを取得
   */
  const getRecordByDateAndField = useCallback((date: string, fieldId: string): DailyRecordV2 | undefined => {
    return records.find(record => record.date === date && record.fieldId === fieldId);
  }, [records]);

  /**
   * 特定の日付のレコード一覧を取得
   */
  const getRecordsByDate = useCallback((date: string): DailyRecordV2[] => {
    return records.filter(record => record.date === date);
  }, [records]);

  /**
   * 選択中の日付のレコード一覧（メモ化）
   */
  const selectedDateRecords = useMemo(() => {
    return getRecordsByDate(selectedDate);
  }, [getRecordsByDate, selectedDate]);

  /**
   * レコードの追加または更新
   */
  const setRecordAchievement = useCallback(async (
    date: string,
    fieldId: string,
    achieved: boolean
  ): Promise<boolean> => {
    try {
      setError(null);
      
      const existingRecord = getRecordByDateAndField(date, fieldId);
      
      if (existingRecord) {
        // 既存レコードの更新
        const updatedRecord = { ...existingRecord, achieved };
        await updateDailyRecord(updatedRecord);
        
        setRecords(prev =>
          prev.map(record =>
            record.id === existingRecord.id ? updatedRecord : record
          )
        );
      } else {
        // 新しいレコードの作成
        const newRecord: DailyRecordV2 = {
          id: `daily_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date,
          fieldId,
          achieved,
        };
        
        await addDailyRecord(newRecord);
        setRecords(prev => [...prev, newRecord]);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '記録の保存に失敗しました';
      setError(errorMessage);
      console.error('Error setting record achievement:', err);
      return false;
    }
  }, [getRecordByDateAndField]);

  /**
   * レコードの削除
   */
  const deleteRecord = useCallback(async (recordId: string): Promise<boolean> => {
    try {
      setError(null);
      
      await deleteDailyRecord(recordId);
      setRecords(prev => prev.filter(record => record.id !== recordId));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '記録の削除に失敗しました';
      setError(errorMessage);
      console.error('Error deleting record:', err);
      return false;
    }
  }, []);

  /**
   * 特定フィールドに関連する全レコードの削除
   */
  const deleteRecordsByField = useCallback(async (fieldId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const fieldRecords = records.filter(record => record.fieldId === fieldId);
      
      for (const record of fieldRecords) {
        await deleteDailyRecord(record.id);
      }
      
      setRecords(prev => prev.filter(record => record.fieldId !== fieldId));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'フィールド関連記録の削除に失敗しました';
      setError(errorMessage);
      console.error('Error deleting records by field:', err);
      return false;
    }
  }, [records]);

  /**
   * 特定フィールドの達成状況を取得
   */
  const getFieldAchievement = useCallback((date: string, fieldId: string): boolean => {
    const record = getRecordByDateAndField(date, fieldId);
    return record?.achieved || false;
  }, [getRecordByDateAndField]);

  /**
   * 特定の日付の達成率を計算
   */
  const getDayAchievementRate = useCallback((date: string, fields: DailyFieldV2[]): number => {
    if (fields.length === 0) return 0;
    
    const dayRecords = getRecordsByDate(date);
    const achievedCount = dayRecords.filter(record => record.value).length;
    
    return (achievedCount / fields.length) * 100;
  }, [getRecordsByDate]);

  /**
   * 特定の日付が完全達成かどうかを判定
   */
  const isDayFullyAchieved = useCallback((date: string, fields: DailyFieldV2[]): boolean => {
    if (fields.length === 0) return false;
    
    const dayRecords = getRecordsByDate(date);
    const achievedCount = dayRecords.filter(record => record.value).length;
    
    return achievedCount === fields.length;
  }, [getRecordsByDate]);

  /**
   * 期間内の達成記録を取得
   */
  const getRecordsByDateRange = useCallback((startDate: string, endDate: string): DailyRecordV2[] => {
    return records.filter(record => 
      record.date >= startDate && record.date <= endDate
    );
  }, [records]);

  /**
   * 特定フィールドの連続達成日数を計算
   */
  const getFieldStreak = useCallback((fieldId: string, referenceDate: string): number => {
    const sortedDates: string[] = [];
    const today = new Date(referenceDate);
    
    // 過去30日間の日付を生成
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      sortedDates.push(date.toISOString().split('T')[0]);
    }
    
    let streak = 0;
    for (const date of sortedDates) {
      const record = getRecordByDateAndField(date, fieldId);
      if (record?.achieved) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }, [getRecordByDateAndField]);

  /**
   * 全体の連続達成日数を計算（全フィールド達成）
   */
  const getOverallStreak = useCallback((fields: DailyFieldV2[], referenceDate: string): number => {
    const sortedDates: string[] = [];
    const today = new Date(referenceDate);
    
    // 過去30日間の日付を生成
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      sortedDates.push(date.toISOString().split('T')[0]);
    }
    
    let streak = 0;
    for (const date of sortedDates) {
      if (isDayFullyAchieved(date, fields)) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }, [isDayFullyAchieved]);

  /**
   * 統計情報の計算
   */
  const getStatistics = useCallback((fields: DailyFieldV2[], days: number = 14) => {
    const endDate = selectedDate;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    const startDateString = startDate.toISOString().split('T')[0];
    
    const rangeRecords = getRecordsByDateRange(startDateString, endDate);
    const totalDays = days;
    const totalPossibleAchievements = totalDays * fields.length;
    const totalAchievements = rangeRecords.filter(record => record.value).length;
    
    return {
      totalDays,
      totalAchievements,
      totalPossibleAchievements,
      overallRate: totalPossibleAchievements > 0 ? (totalAchievements / totalPossibleAchievements) * 100 : 0,
      dailyAverageRate: totalDays > 0 ? (totalAchievements / totalDays) : 0,
    };
  }, [selectedDate, getRecordsByDateRange]);

  /**
   * エラー状態のクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 初期化
  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  return {
    // 状態
    records,
    isLoading,
    error,
    
    // フィルタリングされたデータ
    selectedDateRecords,
    
    // 基本操作
    loadRecords,
    setRecordAchievement,
    deleteRecord,
    deleteRecordsByField,
    
    // データ取得
    getRecordByDateAndField,
    getRecordsByDate,
    getRecordsByDateRange,
    getFieldAchievement,
    
    // 統計計算
    getDayAchievementRate,
    isDayFullyAchieved,
    getFieldStreak,
    getOverallStreak,
    getStatistics,
    
    // エラー管理
    clearError,
    
    // 便利な計算プロパティ
    hasRecords: records.length > 0,
    selectedDateAchievementCount: selectedDateRecords.filter(r => r.achieved).length,
  };
};