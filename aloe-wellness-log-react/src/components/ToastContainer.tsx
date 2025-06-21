import React, { useEffect, useRef } from 'react';
import { useToastStore, ToastType } from '../store/toast';
import {
  HiCheckCircle,
  HiXCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXMark
} from 'react-icons/hi2';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // 新しいトーストが追加された時のフォーカス管理
  useEffect(() => {
    if (toasts.length > 0) {
      const latestToast = toasts[toasts.length - 1];
      // エラーや警告の場合はフォーカスを当てる
      if (latestToast.type === 'error' || latestToast.type === 'warning') {
        const toastElement = document.querySelector(`[data-toast-id="${latestToast.id}"]`) as HTMLElement;
        if (toastElement) {
          toastElement.focus();
        }
      }
    }
  }, [toasts]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <HiCheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />;
      case 'error':
        return <HiXCircle className="w-5 h-5 text-red-600" aria-hidden="true" />;
      case 'warning':
        return <HiExclamationTriangle className="w-5 h-5 text-yellow-600" aria-hidden="true" />;
      case 'info':
        return <HiInformationCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />;
    }
  };

  const getColorClasses = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getTypeLabel = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '成功';
      case 'error':
        return 'エラー';
      case 'warning':
        return '警告';
      case 'info':
        return '情報';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed top-4 right-4 z-50 space-y-2"
      role="region"
      aria-label="通知メッセージ"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-toast-id={toast.id}
          className={`${getColorClasses(toast.type)} border rounded-lg p-4 shadow-lg max-w-sm transform transition-all duration-300 ease-in-out animate-in slide-in-from-right-5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
          aria-label={`${getTypeLabel(toast.type)}: ${toast.message}`}
          tabIndex={toast.type === 'error' || toast.type === 'warning' ? 0 : -1}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-5">
                <span className="sr-only">{getTypeLabel(toast.type)}: </span>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full p-1"
              aria-label={`${getTypeLabel(toast.type)}通知を閉じる`}
            >
              <HiXMark className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
