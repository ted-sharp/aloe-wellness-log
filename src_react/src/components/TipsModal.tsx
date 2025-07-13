import React, { useEffect, useState } from 'react';

interface TipsModalProps {
  open: boolean;
  onClose: () => void;
  tipText: string;
}

const TipsModal: React.FC<TipsModalProps> = ({ open, onClose, tipText }) => {
  const [disableTips, setDisableTips] = useState(false);
  useEffect(() => {
    setDisableTips(localStorage.getItem('disableTips') === '1');
  }, [open]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setDisableTips(newValue);
    localStorage.setItem('disableTips', newValue ? '1' : '0');
    
    // デバッグ用ログ
    console.log('TIPS無効化設定:', newValue ? '有効' : '無効', 'localStorage値:', localStorage.getItem('disableTips'));
  };
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-0 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
          本日のTIPS
        </h2>
        <div className="text-gray-700 dark:text-gray-200 mb-6 text-left whitespace-pre-line">
          {tipText}
        </div>
        <div className="flex items-center mt-2">
          <input
            id="modal-disable-tips-checkbox"
            type="checkbox"
            className="mr-2 w-5 h-5 accent-purple-600"
            checked={disableTips}
            onChange={handleChange}
          />
          <label
            htmlFor="modal-disable-tips-checkbox"
            className="text-sm text-gray-800 dark:text-gray-200 select-none cursor-pointer"
          >
            今後TIPSを自動表示しない
          </label>
        </div>
      </div>
    </div>
  );
};

export default TipsModal;
