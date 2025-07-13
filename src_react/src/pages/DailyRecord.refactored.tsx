import React, { useCallback, useState } from 'react';
import { HiPencil } from 'react-icons/hi2';
import Button from '../components/Button';
import DailyAchievementItem from '../components/DailyAchievementItem';
import DailyRecordHeader from '../components/DailyRecord/DailyRecordHeader';
import AddFieldForm from '../components/DailyRecord/AddFieldForm';
// import { useDateSelection } from '../hooks/useDateSelection';
import { useDailyFields } from '../hooks/useDailyFields';
import { useDailyRecords } from '../hooks/useDailyRecords';
import { useDailyStats } from '../hooks/useDailyStats';

/**
 * 日課記録ページ（リファクタリング版）
 * 複雑な状態管理とロジックを専用フックに分離し、シンプルで保守性の高いコンポーネントに改善
 */
const DailyRecord: React.FC = () => {
  // 日付選択の管理
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [centerDate, setCenterDate] = useState(new Date().toISOString().split('T')[0]);

  // フィールド管理
  const {
    fields,
    isLoading: fieldsLoading,
    error: fieldsError,
    isAddingField,
    newFieldName,
    addFieldError,
    addFormActions,
    clearError: clearFieldsError,
  } = useDailyFields();

  // レコード管理
  const {
    records,
    isLoading: recordsLoading,
    error: recordsError,
    setRecordAchievement,
    getFieldAchievement,
    clearError: clearRecordsError,
  } = useDailyRecords(selectedDate);

  // 統計計算
  const stats = useDailyStats(fields, records, selectedDate);

  /**
   * 達成状況の記録が存在するかどうかを判定
   */
  const isRecorded = useCallback((date: string): boolean => {
    const dateRecords = records.filter(record => record.date === date);
    return dateRecords.length > 0;
  }, [records]);

  /**
   * 達成状況の切り替え
   */
  const handleAchievementToggle = useCallback(async (fieldId: string, achieved: boolean) => {
    const success = await setRecordAchievement(selectedDate, fieldId, achieved);
    if (!success) {
      // エラーハンドリング（必要に応じてtoastなどを表示）
      console.error('Achievement toggle failed');
    }
  }, [selectedDate, setRecordAchievement]);

  /**
   * フィールド追加フォームの送信処理
   */
  const handleAddField = useCallback(async (): Promise<boolean> => {
    return await addFormActions.submit();
  }, [addFormActions]);

  /**
   * フィールド追加フォームの表示切り替え
   */
  const toggleAddForm = useCallback(() => {
    if (isAddingField) {
      addFormActions.close();
    } else {
      addFormActions.open();
    }
  }, [isAddingField, addFormActions]);

  /**
   * エラー状態のクリア
   */
  const handleClearErrors = useCallback(() => {
    clearFieldsError();
    clearRecordsError();
  }, [clearFieldsError, clearRecordsError]);

  // ローディング状態
  const isLoading = fieldsLoading || recordsLoading;

  // エラー状態
  const hasError = fieldsError || recordsError || addFieldError;

  return (
    <div className="flex flex-col items-center justify-start py-4 bg-transparent min-h-screen">
      <div className="w-full max-w-md space-y-6">
        
        {/* ヘッダー: 日付選択と統計情報 */}
        <DailyRecordHeader
          selectedDate={selectedDate}
          centerDate={centerDate}
          setCenterDate={setCenterDate}
          setSelectedDate={setSelectedDate}
          isRecorded={isRecorded}
          stats={stats}
        />

        {/* エラー表示 */}
        {hasError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-red-800 dark:text-red-200 font-medium mb-1">エラーが発生しました</h3>
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {fieldsError || recordsError || addFieldError}
                </p>
              </div>
              <button
                onClick={handleClearErrors}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ローディング表示 */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">読み込み中...</p>
          </div>
        )}

        {/* フィールド追加フォーム */}
        <AddFieldForm
          isVisible={isAddingField}
          fieldName={newFieldName}
          error={addFieldError}
          isLoading={isLoading}
          onFieldNameChange={addFormActions.setName}
          onSubmit={handleAddField}
          onCancel={toggleAddForm}
        />

        {/* 日課リスト */}
        {!isLoading && fields.length > 0 && (
          <div className="space-y-3">
            {fields.map((field) => {
              const achievement = getFieldAchievement(selectedDate, field.fieldId);
              const value = achievement ? 1 : 0 as 0 | 0.5 | 1;
              return (
                <DailyAchievementItem
                  key={field.fieldId}
                  field={field}
                  value={value}
                  stats={{ total: 14, success: 7, percent: 50 }}
                  onAchieve={async () => handleAchievementToggle(field.fieldId, true)}
                  onPartial={async () => console.log('Partial achievement not implemented')}
                  onUnachieve={async () => handleAchievementToggle(field.fieldId, false)}
                />
              );
            })}
          </div>
        )}

        {/* 空の状態（フィールドがない場合） */}
        {!isLoading && fields.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              まだ日課が設定されていません
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              「日課を追加」ボタンから最初の日課を設定してみましょう
            </p>
            {!isAddingField && (
              <Button
                variant="primary"
                onClick={toggleAddForm}
                className="px-6 py-2"
              >
                最初の日課を追加
              </Button>
            )}
          </div>
        )}

        {/* 編集モードボタン（将来の機能拡張用） */}
        {fields.length > 0 && !isAddingField && (
          <div className="text-center pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // TODO: 編集モードの実装
                console.log('Edit mode - to be implemented');
              }}
              className="text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700"
            >
              <HiPencil className="w-4 h-4 mr-1" />
              編集
            </Button>
          </div>
        )}

        {/* ヒント・アドバイス */}
        {fields.length > 0 && stats.totalAchievedToday > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <h3 className="text-green-800 dark:text-green-200 font-medium mb-2">💡 継続のコツ</h3>
            <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
              {stats.overallStreak > 0 ? (
                <p>素晴らしい！{stats.overallStreak}日連続で達成しています。この調子で続けましょう！</p>
              ) : stats.todayAchievementRate >= 50 ? (
                <p>順調に進んでいます。小さな積み重ねが大きな変化につながります。</p>
              ) : (
                <p>少しずつでも大丈夫。毎日続けることが一番大切です。</p>
              )}
              <p>完璧を目指さず、80%の達成を目標にしてみてください。</p>
            </div>
          </div>
        )}

        {/* デバッグ情報（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-xs text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer">デバッグ情報</summary>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
              {JSON.stringify({
                selectedDate,
                fieldsCount: fields.length,
                recordsCount: records.length,
                todayStats: {
                  achieved: stats.totalAchievedToday,
                  total: stats.totalFields,
                  rate: stats.todayAchievementRate,
                },
                streak: stats.overallStreak,
              }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default DailyRecord;