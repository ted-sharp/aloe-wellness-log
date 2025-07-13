import { useMemo } from 'react';
import type { DailyFieldV2, DailyRecordV2 } from '../types/record';

/**
 * 統計データの型定義
 */
export interface DailyStatsData {
  // 基本統計
  totalFields: number;
  totalAchievedToday: number;
  todayAchievementRate: number;
  
  // 連続記録
  overallStreak: number;
  longestStreak: number;
  
  // 期間統計
  last14DaysStats: {
    totalDays: number;
    achievedDays: number;
    totalPossibleAchievements: number;
    totalAchievements: number;
    averageAchievementRate: number;
  };
  
  // フィールド別統計
  fieldStats: Array<{
    fieldId: string;
    fieldName: string;
    currentStreak: number;
    last14DaysAchievements: number;
    last14DaysRate: number;
  }>;
  
  // 日別データ（過去14日間）
  dailyData: Array<{
    date: string;
    achievedCount: number;
    totalCount: number;
    achievementRate: number;
    isFullyAchieved: boolean;
  }>;
}

/**
 * 日課統計計算フック
 * 複雑な統計計算をメモ化して最適化
 */
export const useDailyStats = (
  fields: DailyFieldV2[],
  records: DailyRecordV2[],
  selectedDate: string
): DailyStatsData => {
  
  /**
   * 過去14日間の日付配列を生成
   */
  const last14Days = useMemo(() => {
    const dates: string[] = [];
    const today = new Date(selectedDate);
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }, [selectedDate]);

  /**
   * 日付とフィールドIDでレコードを検索するヘルパー
   */
  const findRecord = useMemo(() => {
    const recordMap = new Map<string, DailyRecordV2>();
    records.forEach(record => {
      const key = `${record.date}-${record.fieldId}`;
      recordMap.set(key, record);
    });
    
    return (date: string, fieldId: string): DailyRecordV2 | undefined => {
      return recordMap.get(`${date}-${fieldId}`);
    };
  }, [records]);

  /**
   * 今日の達成状況を計算
   */
  const todayStats = useMemo(() => {
    const todayRecords = records.filter(record => record.date === selectedDate);
    const achievedCount = todayRecords.filter(record => record.value === 1).length;
    const rate = fields.length > 0 ? (achievedCount / fields.length) * 100 : 0;
    
    return {
      totalAchievedToday: achievedCount,
      todayAchievementRate: rate,
    };
  }, [records, selectedDate, fields.length]);

  /**
   * 全体の連続達成日数を計算
   */
  const overallStreak = useMemo(() => {
    const sortedDates: string[] = [];
    const today = new Date(selectedDate);
    
    // 過去100日間をチェック（十分な期間）
    for (let i = 0; i < 100; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      sortedDates.push(date.toISOString().split('T')[0]);
    }
    
    let streak = 0;
    for (const date of sortedDates) {
      const dayRecords = records.filter(record => record.date === date);
      const achievedCount = dayRecords.filter(record => record.value === 1).length;
      
      if (achievedCount === fields.length && fields.length > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }, [records, selectedDate, fields.length]);

  /**
   * 最長連続達成日数を計算
   */
  const longestStreak = useMemo(() => {
    if (fields.length === 0) return 0;
    
    const sortedDates: string[] = [];
    const today = new Date(selectedDate);
    
    // 過去1年間をチェック
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      sortedDates.push(date.toISOString().split('T')[0]);
    }
    
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const date of sortedDates.reverse()) {
      const dayRecords = records.filter(record => record.date === date);
      const achievedCount = dayRecords.filter(record => record.value === 1).length;
      
      if (achievedCount === fields.length) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }, [records, selectedDate, fields.length]);

  /**
   * 過去14日間の統計
   */
  const last14DaysStats = useMemo(() => {
    const totalDays = 14;
    let achievedDays = 0;
    let totalAchievements = 0;
    const totalPossibleAchievements = totalDays * fields.length;
    
    for (const date of last14Days) {
      const dayRecords = records.filter(record => record.date === date);
      const achievedCount = dayRecords.filter(record => record.value === 1).length;
      
      totalAchievements += achievedCount;
      
      if (achievedCount === fields.length && fields.length > 0) {
        achievedDays++;
      }
    }
    
    const averageAchievementRate = totalPossibleAchievements > 0 
      ? (totalAchievements / totalPossibleAchievements) * 100 
      : 0;
    
    return {
      totalDays,
      achievedDays,
      totalPossibleAchievements,
      totalAchievements,
      averageAchievementRate,
    };
  }, [last14Days, records, fields.length]);

  /**
   * フィールド別統計
   */
  const fieldStats = useMemo(() => {
    return fields.map(field => {
      // 現在の連続達成日数
      let currentStreak = 0;
      const today = new Date(selectedDate);
      
      for (let i = 0; i < 100; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const record = findRecord(dateString, field.fieldId);
        if (record?.achieved) {
          currentStreak++;
        } else {
          break;
        }
      }
      
      // 過去14日間の達成状況
      let last14DaysAchievements = 0;
      for (const date of last14Days) {
        const record = findRecord(date, field.fieldId);
        if (record?.achieved) {
          last14DaysAchievements++;
        }
      }
      
      const last14DaysRate = (last14DaysAchievements / 14) * 100;
      
      return {
        fieldId: field.fieldId,
        fieldName: field.name,
        currentStreak,
        last14DaysAchievements,
        last14DaysRate,
      };
    });
  }, [fields, selectedDate, findRecord, last14Days]);

  /**
   * 日別データ（過去14日間）
   */
  const dailyData = useMemo(() => {
    return last14Days.map(date => {
      const dayRecords = records.filter(record => record.date === date);
      const achievedCount = dayRecords.filter(record => record.value === 1).length;
      const totalCount = fields.length;
      const achievementRate = totalCount > 0 ? (achievedCount / totalCount) * 100 : 0;
      const isFullyAchieved = achievedCount === totalCount && totalCount > 0;
      
      return {
        date,
        achievedCount,
        totalCount,
        achievementRate,
        isFullyAchieved,
      };
    });
  }, [last14Days, records, fields.length]);

  /**
   * 統合された統計データ
   */
  const statsData: DailyStatsData = useMemo(() => ({
    // 基本統計
    totalFields: fields.length,
    ...todayStats,
    
    // 連続記録
    overallStreak,
    longestStreak,
    
    // 期間統計
    last14DaysStats,
    
    // フィールド別統計
    fieldStats,
    
    // 日別データ
    dailyData,
  }), [
    fields.length,
    todayStats,
    overallStreak,
    longestStreak,
    last14DaysStats,
    fieldStats,
    dailyData,
  ]);

  return statsData;
};

/**
 * 連続達成日数を人間が読みやすい形式に変換
 */
export const formatStreak = (streak: number): string => {
  if (streak === 0) return '0日';
  if (streak === 1) return '1日';
  return `${streak}日`;
};

/**
 * 達成率を人間が読みやすい形式に変換
 */
export const formatAchievementRate = (rate: number): string => {
  return `${Math.round(rate)}%`;
};

/**
 * 日付を曜日付きで表示
 */
export const formatDateWithWeekday = (dateString: string): string => {
  const date = new Date(dateString);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  
  return `${month}/${day}(${weekday})`;
};

/**
 * 統計データをエクスポート可能な形式に変換
 */
export const exportStatsData = (stats: DailyStatsData) => {
  return {
    exportedAt: new Date().toISOString(),
    summary: {
      totalFields: stats.totalFields,
      todayAchievementRate: stats.todayAchievementRate,
      overallStreak: stats.overallStreak,
      longestStreak: stats.longestStreak,
      last14DaysAverageRate: stats.last14DaysStats.averageAchievementRate,
    },
    fieldStats: stats.fieldStats,
    dailyData: stats.dailyData,
  };
};