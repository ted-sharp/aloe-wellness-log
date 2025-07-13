import React from 'react';
import { FaFire } from 'react-icons/fa';
import { HiCheck } from 'react-icons/hi2';
import DatePickerBar from '../DatePickerBar';
import { formatDate } from '../../utils/dateUtils';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import type { DailyStatsData } from '../../hooks/useDailyStats';

interface DailyRecordHeaderProps {
  selectedDate: string;
  centerDate: string;
  setCenterDate: (date: string) => void;
  setSelectedDate: (date: string) => void;
  isRecorded: (date: string) => boolean;
  stats: DailyStatsData;
}

/**
 * 日課記録ページのヘッダーコンポーネント
 * 日付選択、達成状況、統計情報を表示
 */
const DailyRecordHeader: React.FC<DailyRecordHeaderProps> = ({
  selectedDate,
  centerDate,
  setCenterDate,
  setSelectedDate,
  isRecorded,
  stats,
}) => {
  const animatedStreak = useAnimatedNumber(stats.overallStreak, {
    duration: 800,
    easing: 'easeOutCubic',
  });

  const animatedAchievementRate = useAnimatedNumber(stats.todayAchievementRate, {
    duration: 600,
    easing: 'easeOutQuart',
  });

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isFullyAchieved = stats.totalAchievedToday === stats.totalFields && stats.totalFields > 0;

  return (
    <div className="space-y-4">
      {/* 日付選択バー */}
      <DatePickerBar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        centerDate={centerDate}
        setCenterDate={setCenterDate}
        isRecorded={isRecorded}
      />

      {/* 選択日付の表示と達成アイコン */}
      <div className="flex items-center justify-center space-x-3 py-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          {formatDate(selectedDate, 'short')}
        </h2>
        {isFullyAchieved && (
          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
            <HiCheck className="w-5 h-5" />
            <span className="text-sm font-medium">達成完了</span>
          </div>
        )}
      </div>

      {/* 統計情報バッジ */}
      <div className="flex flex-wrap justify-center gap-3">
        {/* 連続達成日数 */}
        <div className="flex items-center space-x-2 bg-orange-100 dark:bg-orange-900/30 px-3 py-2 rounded-full">
          <FaFire className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            連続 {Math.round(animatedStreak)}日
          </span>
        </div>

        {/* 今日の達成率 */}
        <div className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-full">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {isToday ? '今日' : '選択日'} {Math.round(animatedAchievementRate)}%
          </span>
        </div>

        {/* 達成項目数 */}
        <div className="flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-full">
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {stats.totalAchievedToday}/{stats.totalFields} 項目
          </span>
        </div>

        {/* 過去14日間の平均 */}
        {stats.last14DaysStats.averageAchievementRate > 0 && (
          <div className="flex items-center space-x-2 bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-full">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              14日平均 {Math.round(stats.last14DaysStats.averageAchievementRate)}%
            </span>
          </div>
        )}
      </div>

      {/* 励ましメッセージ */}
      {stats.totalFields > 0 && (
        <div className="text-center">
          {isFullyAchieved ? (
            <p className="text-green-600 dark:text-green-400 font-medium">
              🎉 素晴らしい！全ての項目を達成しました！
            </p>
          ) : stats.todayAchievementRate >= 80 ? (
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              💪 もう少しで完全達成です！
            </p>
          ) : stats.todayAchievementRate >= 50 ? (
            <p className="text-yellow-600 dark:text-yellow-400 font-medium">
              📈 順調に進んでいます！
            </p>
          ) : stats.todayAchievementRate > 0 ? (
            <p className="text-orange-600 dark:text-orange-400 font-medium">
              🌱 少しずつ取り組んでいきましょう！
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              ✨ 今日の目標を設定して取り組んでみましょう！
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyRecordHeader;