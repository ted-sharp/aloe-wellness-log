import React, { useCallback } from 'react';
import { HiCheckCircle, HiClock, HiExclamationTriangle } from 'react-icons/hi2';
import Button from '../components/Button';
import PersonalInfoSection from '../components/goal/PersonalInfoSection';
import WeightTargetSection from '../components/goal/WeightTargetSection';
import { useGoalForm } from '../hooks/useGoalForm';

/**
 * 目標設定ページ（リファクタリング版）
 * 複雑なフォーム管理を専用フックに分離し、コンポーネントを小さなセクションに分割
 */
const GoalInput: React.FC = () => {
  // 統合フォーム管理フック
  const {
    formData,
    errors,
    isSaving,
    lastSaved,
    weightRecords,
    currentAge,
    isFormValid,
    hasUnsavedChanges,
    updateField,
    saveForm,
    resetForm,
    loadWeightRecords,
  } = useGoalForm();

  /**
   * フォーム保存処理
   */
  const handleSave = useCallback(async () => {
    const result = await saveForm();
    if (result.success) {
      // 成功時の処理（必要に応じてtoast表示など）
      console.log('Goal saved successfully');
    } else {
      // エラー時の処理
      console.error('Failed to save goal:', result.errors);
    }
  }, [saveForm]);

  /**
   * フォームリセット処理
   */
  const handleReset = useCallback(() => {
    if (window.confirm('入力内容をリセットしますか？')) {
      resetForm();
    }
  }, [resetForm]);

  /**
   * 日付フィールドの更新（簡易実装）
   */
  const handleDateChange = useCallback((field: 'targetStart' | 'targetEnd', value: string) => {
    updateField(field, value);
  }, [updateField]);

  /**
   * 目標テキストフィールドの更新（簡易実装）
   */
  const handleGoalTextChange = useCallback((field: string, value: string) => {
    updateField(field as keyof typeof formData, value);
  }, [updateField]);

  return (
    <div className="flex flex-col items-center justify-start py-4 bg-transparent min-h-screen">
      <div className="w-full max-w-2xl space-y-6 px-4">
        
        {/* ページヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            目標設定
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            あなたの健康目標を設定して、継続的な改善を目指しましょう
          </p>
        </div>

        {/* 保存状態表示 */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">保存中...</span>
              </>
            ) : lastSaved ? (
              <>
                <HiCheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {lastSaved.toLocaleTimeString()} に保存済み
                </span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <HiClock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">未保存の変更があります</span>
              </>
            ) : (
              <>
                <HiExclamationTriangle className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">目標を設定してください</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            自動保存: 5秒後
          </div>
        </div>

        {/* 個人情報セクション */}
        <PersonalInfoSection
          formData={formData}
          errors={errors}
          currentAge={currentAge}
          onUpdateField={updateField}
        />

        {/* 体重目標セクション */}
        <WeightTargetSection
          formData={formData}
          errors={errors}
          weightRecords={weightRecords}
          onUpdateField={updateField}
          onLoadWeightRecords={loadWeightRecords}
        />

        {/* 期間設定セクション（簡易実装） */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            目標期間
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                開始日
              </label>
              <input
                type="date"
                value={formData.targetStart}
                onChange={(e) => handleDateChange('targetStart', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.targetStart
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.targetStart && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetStart}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                終了日
              </label>
              <input
                type="date"
                value={formData.targetEnd}
                onChange={(e) => handleDateChange('targetEnd', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.targetEnd
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.targetEnd && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetEnd}</p>
              )}
            </div>
          </div>
        </div>

        {/* 目標テキストセクション（簡易実装） */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            具体的な目標
          </h2>
          
          {['exerciseGoal', 'dietGoal', 'sleepGoal', 'smokingGoal', 'alcoholGoal'].map((field) => {
            const labels = {
              exerciseGoal: '運動',
              dietGoal: '食事',
              sleepGoal: '睡眠',
              smokingGoal: '禁煙',
              alcoholGoal: '禁酒',
            };
            
            return (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {labels[field as keyof typeof labels]}の目標
                </label>
                <textarea
                  value={formData[field as keyof typeof formData] as string}
                  onChange={(e) => handleGoalTextChange(field, e.target.value)}
                  placeholder={`${labels[field as keyof typeof labels]}に関する目標を入力してください`}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            );
          })}
        </div>

        {/* アクションボタン */}
        <div className="flex space-x-4 pt-6">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !isFormValid}
            className="flex-1"
          >
            {isSaving ? '保存中...' : '目標を保存'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={isSaving}
            className="px-6"
          >
            リセット
          </Button>
        </div>

        {/* フォームバリデーション状態表示 */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-red-800 dark:text-red-200 font-medium mb-2">
              入力エラーがあります
            </h3>
            <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 成功メッセージ */}
        {isFormValid && lastSaved && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-300 text-center">
              🎉 目標が正常に保存されました！頑張って継続していきましょう！
            </p>
          </div>
        )}

        {/* デバッグ情報（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-xs text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer">デバッグ情報</summary>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
              {JSON.stringify({
                formData,
                errors,
                isFormValid,
                hasUnsavedChanges,
                isSaving,
                currentAge,
              }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default GoalInput;