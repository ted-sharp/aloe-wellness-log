import React from 'react';
import { HiDocumentText } from 'react-icons/hi2';

interface NotesInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

const NotesInput: React.FC<NotesInputProps> = ({
  value,
  onChange,
  maxLength = 500,
  placeholder = 'その時の体調、気づき、特記事項など（任意）',
}) => {
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8; // 80%を超えた場合

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <div className="space-y-4">
        <label
          htmlFor="notes-input"
          className="text-2xl font-semibold text-gray-800 flex items-center gap-2"
        >
          <HiDocumentText
            className="w-6 h-6 text-blue-600"
            aria-hidden="true"
          />
          備考・メモ
        </label>
        <div>
          <textarea
            id="notes-input"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
            maxLength={maxLength}
            aria-describedby="notes-char-count notes-description"
            aria-label="備考・メモを入力"
          />
          <div id="notes-description" className="sr-only">
            体調や状況についてのメモを自由に入力できます。最大{maxLength}
            文字まで入力可能です。
          </div>
          <div
            id="notes-char-count"
            className={`text-right text-sm mt-2 ${
              isNearLimit ? 'text-orange-600 font-medium' : 'text-gray-600'
            }`}
            aria-live="polite"
            aria-label={`${charCount}文字入力済み、残り${
              maxLength - charCount
            }文字`}
          >
            {charCount}/{maxLength}文字
            {isNearLimit && (
              <span className="ml-2 text-orange-600">
                (残り{maxLength - charCount}文字)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesInput;
