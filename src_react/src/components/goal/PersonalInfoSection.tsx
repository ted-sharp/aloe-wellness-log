import React from 'react';
import { HiCalendar } from 'react-icons/hi2';
import { GENDER_OPTIONS, FORM_FIELD_CONFIG } from '../../constants/goalExamples';
import type { GoalFormData, GoalFormErrors } from '../../hooks/useGoalForm';

interface PersonalInfoSectionProps {
  formData: Pick<GoalFormData, 'gender' | 'birthYear' | 'height'>;
  errors: Pick<GoalFormErrors, 'gender' | 'birthYear' | 'height'>;
  currentAge: number | null;
  onUpdateField: <K extends keyof GoalFormData>(field: K, value: GoalFormData[K]) => void;
}

/**
 * 個人情報入力セクション
 * 性別、生年、身長の入力フィールドを提供
 */
const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  formData,
  errors,
  currentAge,
  onUpdateField,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        基本情報
      </h2>

      {/* 性別選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          性別
        </label>
        <div className="flex flex-wrap gap-3">
          {GENDER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.gender === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name="gender"
                value={option.value}
                checked={formData.gender === option.value}
                onChange={(e) => onUpdateField('gender', e.target.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.gender && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gender}</p>
        )}
      </div>

      {/* 生年入力 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          生年
        </label>
        <div className="relative">
          <input
            type="number"
            value={formData.birthYear}
            onChange={(e) => onUpdateField('birthYear', e.target.value)}
            placeholder="例: 1990"
            min={FORM_FIELD_CONFIG.birthYear.min}
            max={FORM_FIELD_CONFIG.birthYear.max}
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.birthYear
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          <HiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        {currentAge !== null && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            現在の年齢: {currentAge}歳
          </p>
        )}
        {errors.birthYear && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.birthYear}</p>
        )}
      </div>

      {/* 身長入力 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          身長 (cm)
        </label>
        <div className="relative">
          <input
            type="number"
            value={formData.height}
            onChange={(e) => onUpdateField('height', e.target.value)}
            placeholder="例: 170"
            min={FORM_FIELD_CONFIG.height.min}
            max={FORM_FIELD_CONFIG.height.max}
            step="0.1"
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.height
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
            cm
          </span>
        </div>
        {errors.height && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.height}</p>
        )}
      </div>

      {/* ヒント */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          💡 入力のヒント
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• 年齢は目標設定時の参考情報として使用されます</li>
          <li>• 身長は BMI 計算に使用されます</li>
          <li>• 入力した情報は端末内に安全に保存されます</li>
        </ul>
      </div>
    </div>
  );
};

export default PersonalInfoSection;