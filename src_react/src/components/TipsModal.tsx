import React from 'react';

interface TipsModalProps {
  open: boolean;
  onClose: () => void;
  tipText: string;
}

const TipsModal: React.FC<TipsModalProps> = ({ open, onClose, tipText }) => {
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
      </div>
    </div>
  );
};

export default TipsModal;
