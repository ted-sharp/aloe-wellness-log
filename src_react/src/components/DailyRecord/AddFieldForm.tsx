import React, { useRef, useEffect } from 'react';
import { HiPlus, HiXMark } from 'react-icons/hi2';
import Button from '../Button';

interface AddFieldFormProps {
  isVisible: boolean;
  fieldName: string;
  error: string | null;
  isLoading?: boolean;
  onFieldNameChange: (name: string) => void;
  onSubmit: () => Promise<boolean>;
  onCancel: () => void;
}

/**
 * 新しい日課フィールド追加フォームコンポーネント
 */
const AddFieldForm: React.FC<AddFieldFormProps> = ({
  isVisible,
  fieldName,
  error,
  isLoading = false,
  onFieldNameChange,
  onSubmit,
  onCancel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // フォームが表示されたときに入力欄にフォーカス
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    const success = await onSubmit();
    if (success) {
      // 成功時は自動的に閉じる（親コンポーネントで管理）
    }
  };

  /**
   * キーボードイベント処理
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isVisible) {
    return (
      <div className="text-center py-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onCancel()} // onCancel は実際には開く処理
          className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          disabled={isLoading}
        >
          <HiPlus className="w-4 h-4 mr-1" />
          日課を追加
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
            新しい日課を追加
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1"
            disabled={isLoading}
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label htmlFor="fieldName" className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
            日課名
          </label>
          <input
            ref={inputRef}
            id="fieldName"
            type="text"
            value={fieldName}
            onChange={(e) => onFieldNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例: 読書、散歩、瞑想など"
            maxLength={20}
            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg 
                     bg-white dark:bg-blue-950/50 
                     text-blue-900 dark:text-blue-100
                     placeholder-blue-400 dark:placeholder-blue-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                     disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          />
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {fieldName.length}/20文字
            </div>
            {error && (
              <div className="text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!fieldName.trim() || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                追加中...
              </div>
            ) : (
              <>
                <HiPlus className="w-4 h-4 mr-1" />
                追加
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4"
          >
            キャンセル
          </Button>
        </div>

        <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
          💡 ヒント: 短くて覚えやすい名前がおすすめです
        </div>
      </form>
    </div>
  );
};

export default AddFieldForm;