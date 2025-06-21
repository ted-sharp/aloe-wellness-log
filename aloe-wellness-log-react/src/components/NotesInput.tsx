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
  placeholder = "その時の体調、気づき、特記事項など（任意）"
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <HiDocumentText className="w-6 h-6 text-blue-600" />
          備考・メモ
        </h2>
        <div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
            maxLength={maxLength}
          />
          <div className="text-right text-sm text-gray-600 mt-2">
            {value.length}/{maxLength}文字
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesInput;
