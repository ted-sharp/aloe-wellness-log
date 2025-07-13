import React from 'react';
import { HiArrowRight, HiScale } from 'react-icons/hi2';
import Button from '../Button';
import { FORM_FIELD_CONFIG } from '../../constants/goalExamples';
import type { GoalFormData, GoalFormErrors, WeightRecordInfo } from '../../hooks/useGoalForm';

interface WeightTargetSectionProps {
  formData: Pick<GoalFormData, 'startWeight' | 'targetWeight'>;
  errors: Pick<GoalFormErrors, 'startWeight' | 'targetWeight'>;
  weightRecords: WeightRecordInfo;
  onUpdateField: <K extends keyof GoalFormData>(field: K, value: GoalFormData[K]) => void;
  onLoadWeightRecords: () => void;
}

/**
 * 体重目標設定セクション
 * 開始体重と目標体重の入力、過去の記録からの自動入力機能を提供
 */
const WeightTargetSection: React.FC<WeightTargetSectionProps> = ({
  formData,
  errors,
  weightRecords,
  onUpdateField,
  onLoadWeightRecords,
}) => {
  /**
   * 体重記録から自動入力
   */
  const handleAutoFillWeight = (type: 'latest' | 'oldest') => {
    const record = type === 'latest' ? weightRecords.latest : weightRecords.oldest;
    if (record) {
      onUpdateField('startWeight', record.weight.toString());
    }
  };

  /**
   * 目標体重の差分を計算
   */
  const calculateWeightDifference = (): { amount: number; type: 'loss' | 'gain' } | null => {
    const start = parseFloat(formData.startWeight);
    const target = parseFloat(formData.targetWeight);
    
    if (isNaN(start) || isNaN(target)) return null;
    
    const difference = target - start;
    return {
      amount: Math.abs(difference),
      type: difference < 0 ? 'loss' : 'gain',
    };
  };

  const weightDiff = calculateWeightDifference();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        体重目標
      </h2>

      {/* 開始体重 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          開始時の体重 (kg)
        </label>
        <div className="space-y-3">
          <div className="relative">
            <input
              type="number"
              value={formData.startWeight}
              onChange={(e) => onUpdateField('startWeight', e.target.value)}
              placeholder="例: 70.0"
              min={FORM_FIELD_CONFIG.weight.min}
              max={FORM_FIELD_CONFIG.weight.max}
              step="0.1"
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.startWeight
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            <HiScale className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          {/* 過去の記録から自動入力ボタン */}
          <div className="flex flex-wrap gap-2">
            {weightRecords.latest && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAutoFillWeight('latest')}
                className="text-xs"
              >
                最新記録: {weightRecords.latest.weight}kg ({weightRecords.latest.date})
              </Button>
            )}
            {weightRecords.oldest && weightRecords.oldest.id !== weightRecords.latest?.id && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAutoFillWeight('oldest')}
                className="text-xs"
              >
                最古記録: {weightRecords.oldest.weight}kg ({weightRecords.oldest.date})
              </Button>
            )}
            {weightRecords.isLoading && (
              <span className="text-xs text-gray-500 dark:text-gray-400">読み込み中...</span>
            )}
            {!weightRecords.isLoading && !weightRecords.latest && !weightRecords.oldest && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onLoadWeightRecords}
                className="text-xs"
              >
                体重記録を再読み込み
              </Button>
            )}
          </div>
        </div>
        {errors.startWeight && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startWeight}</p>
        )}
      </div>

      {/* 目標体重 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          目標体重 (kg)
        </label>
        <div className="relative">
          <input
            type="number"
            value={formData.targetWeight}
            onChange={(e) => onUpdateField('targetWeight', e.target.value)}
            placeholder="例: 65.0"
            min={FORM_FIELD_CONFIG.weight.min}
            max={FORM_FIELD_CONFIG.weight.max}
            step="0.1"
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.targetWeight
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          <HiScale className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        {errors.targetWeight && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetWeight}</p>
        )}
      </div>

      {/* 体重差分の表示 */}
      {weightDiff && (
        <div className={`p-4 rounded-lg border ${
          weightDiff.type === 'loss'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-center justify-center space-x-3">
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {formData.startWeight}kg
            </span>
            <HiArrowRight className={`w-5 h-5 ${
              weightDiff.type === 'loss' ? 'text-green-600' : 'text-blue-600'
            }`} />
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {formData.targetWeight}kg
            </span>
          </div>
          <div className="text-center mt-2">
            <span className={`text-sm font-medium ${
              weightDiff.type === 'loss'
                ? 'text-green-700 dark:text-green-300'
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {weightDiff.amount.toFixed(1)}kg の
              {weightDiff.type === 'loss' ? '減量' : '増量'}目標
            </span>
          </div>
        </div>
      )}

      {/* エラー表示（体重記録読み込み） */}
      {weightRecords.error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            体重記録の読み込みに失敗しました: {weightRecords.error}
          </p>
        </div>
      )}

      {/* ヒント */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
          💡 目標設定のコツ
        </h4>
        <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
          <li>• 無理のない範囲で目標を設定しましょう</li>
          <li>• 月に1-2kgの変化が健康的な目安です</li>
          <li>• 体重記録がある場合、最新の値を参考にできます</li>
        </ul>
      </div>
    </div>
  );
};

export default WeightTargetSection;