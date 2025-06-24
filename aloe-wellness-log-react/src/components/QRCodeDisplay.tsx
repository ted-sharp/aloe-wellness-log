import React, { useState } from 'react';
import { BsQrCode } from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';
import QRCode from 'react-qr-code';
import { useI18n } from '../hooks/useI18n';

interface QRCodeDisplayProps {
  url?: string;
  className?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  url = 'https://ted-sharp.github.io/aloe-wellness-log/',
  className = '',
}) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      {/* QRコードアイコンボタン */}
      <button
        onClick={openModal}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-offset-2 transition-colors ${className}`}
        title={t('dialogs.qrCode.show')}
      >
        <BsQrCode className="w-4 h-4" />
        <span className="hidden sm:inline">
          {t('dialogs.qrCode.buttonText')}
        </span>
      </button>

      {/* QRコード表示モーダル */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 m-4 max-w-sm w-full shadow-xl">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('dialogs.qrCode.title')}
              </h3>
              <button
                onClick={closeModal}
                className="bg-gray-200/80 dark:bg-gray-700/70 text-gray-400 dark:text-gray-300 hover:bg-gray-300/90 dark:hover:bg-gray-600/80 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                aria-label={t('actions.close')}
              >
                <IoClose className="w-5 h-5" />
              </button>
            </div>

            {/* QRコード */}
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-inner border border-gray-200 dark:border-gray-600">
                <QRCode
                  value={url}
                  size={200}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox="0 0 256 256"
                />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {t('dialogs.qrCode.scanText')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                  {url}
                </p>
              </div>

              {/* コピーボタン */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  // 簡単なフィードバック
                  const button = document.activeElement as HTMLButtonElement;
                  const originalText = button.textContent;
                  button.textContent = t('dialogs.qrCode.copied');
                  setTimeout(() => {
                    button.textContent = originalText;
                  }, 2000);
                }}
                className="px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-offset-2 transition-colors"
              >
                {t('dialogs.qrCode.copyUrl')}
              </button>
            </div>

            {/* 閉じるボタン */}
            <button
              onClick={closeModal}
              className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              {t('dialogs.qrCode.close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default QRCodeDisplay;
