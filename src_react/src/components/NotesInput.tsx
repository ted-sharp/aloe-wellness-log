import React, { memo, useCallback } from 'react';
import { HiDocumentText } from 'react-icons/hi2';
import { useI18n } from '../hooks/useI18n';

interface NotesInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

// メモ化されたNotesInputコンポーネント
const NotesInput: React.FC<NotesInputProps> = memo(
  ({ value, onChange, maxLength = 500, placeholder }) => {
    const { t } = useI18n();

    // 入力ハンドラーをメモ化
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
      },
      [onChange]
    );

    // 文字数計算をメモ化
    const charCount = value.length;
    const remaining = maxLength - charCount;
    const isNearLimit = charCount > maxLength * 0.8; // 80%を超えた場合

    // プレースホルダーのデフォルト値を翻訳
    const effectivePlaceholder =
      placeholder || t('pages.input.notesPlaceholder');

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
        <div className="space-y-4">
          <label
            htmlFor="notes-input"
            className="text-2xl font-semibold text-gray-800 dark:text-white flex items-center gap-2"
          >
            <HiDocumentText
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            {t('pages.input.notes')}
          </label>
          <div>
            <textarea
              id="notes-input"
              value={value}
              onChange={handleChange}
              placeholder={effectivePlaceholder}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400 resize-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
              maxLength={maxLength}
              aria-describedby="notes-char-count notes-description"
              aria-label={t('pages.input.notesPlaceholder')}
            />
            <div id="notes-description" className="sr-only">
              {t('pages.input.notesDescription', { maxLength })}
            </div>
            <div
              id="notes-char-count"
              className={`text-right text-sm mt-2 ${
                isNearLimit
                  ? 'text-orange-600 dark:text-orange-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              aria-live="polite"
              aria-label={t('aria.charactersEntered', {
                count: charCount,
                remaining,
              })}
            >
              {t('pages.input.characterCount', {
                count: charCount,
                max: maxLength,
              })}
              {isNearLimit && (
                <span className="ml-2 text-orange-600 dark:text-orange-400">
                  (残り{remaining}文字)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

NotesInput.displayName = 'NotesInput';

export default NotesInput;
