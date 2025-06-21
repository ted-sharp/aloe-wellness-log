import React from 'react';
import { useToastStore, ToastType } from '../store/toast';
import type { Toast } from '../store/toast';
import {
  HiCheckCircle,
  HiXCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXMark
} from 'react-icons/hi2';

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { removeToast } = useToastStore();

  const getToastStyles = (type: ToastType): string => {
    switch (type) {
      case ToastType.SUCCESS:
        return 'bg-green-500 text-white border-green-600';
      case ToastType.ERROR:
        return 'bg-red-500 text-white border-red-600';
      case ToastType.WARNING:
        return 'bg-orange-500 text-white border-orange-600';
      case ToastType.INFO:
        return 'bg-blue-500 text-white border-blue-600';
      default:
        return 'bg-gray-500 text-white border-gray-600';
    }
  };

  const getIcon = (type: ToastType) => {
    const iconClass = "w-5 h-5 flex-shrink-0";
    switch (type) {
      case ToastType.SUCCESS:
        return <HiCheckCircle className={iconClass} />;
      case ToastType.ERROR:
        return <HiXCircle className={iconClass} />;
      case ToastType.WARNING:
        return <HiExclamationTriangle className={iconClass} />;
      case ToastType.INFO:
        return <HiInformationCircle className={iconClass} />;
      default:
        return <HiInformationCircle className={iconClass} />;
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-lg shadow-lg border-l-4 min-w-80 max-w-md
        transform transition-all duration-300 ease-in-out
        animate-slide-in-right
        ${getToastStyles(toast.type)}
      `}
    >
      {getIcon(toast.type)}
      <div className="flex-1 text-sm font-medium break-words">
        {toast.message}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-20 transition-colors duration-200"
        aria-label="閉じる"
      >
        <HiXMark className="w-4 h-4" />
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <>
      {/* カスタムアニメーション用のCSS */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>

      <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
        <div className="space-y-3 pointer-events-auto">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} />
          ))}
        </div>
      </div>
    </>
  );
};

export default ToastContainer;
