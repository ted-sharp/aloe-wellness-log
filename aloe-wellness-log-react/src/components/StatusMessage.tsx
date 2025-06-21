import React, { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXCircle,
} from 'react-icons/hi2';

// ステータスメッセージのタイプ
export type StatusType = 'success' | 'error' | 'warning' | 'info';

// ステータスメッセージのプロパティ
export interface StatusMessageProps {
  type: StatusType;
  message: string;
  autoHide?: boolean;
  hideDelay?: number; // ミリ秒
  onHide?: () => void;
  className?: string;
  icon?: IconType;
}

// タイプ別のスタイル定義
const typeStyles: Record<
  StatusType,
  {
    containerClass: string;
    iconClass: string;
    defaultIcon: IconType;
  }
> = {
  success: {
    containerClass: 'bg-green-50 border-green-200 text-green-700',
    iconClass: 'text-green-600',
    defaultIcon: HiCheckCircle,
  },
  error: {
    containerClass: 'bg-red-50 border-red-200 text-red-700',
    iconClass: 'text-red-600',
    defaultIcon: HiXCircle,
  },
  warning: {
    containerClass: 'bg-amber-50 border-amber-200 text-amber-700',
    iconClass: 'text-amber-600',
    defaultIcon: HiExclamationTriangle,
  },
  info: {
    containerClass: 'bg-blue-50 border-blue-200 text-blue-700',
    iconClass: 'text-blue-600',
    defaultIcon: HiInformationCircle,
  },
};

// 基本スタイル
const baseStyles =
  'p-4 rounded-lg border font-medium flex items-start gap-3 shadow-sm';

export const StatusMessage: React.FC<StatusMessageProps> = ({
  type,
  message,
  autoHide = false,
  hideDelay = 3000,
  onHide,
  className = '',
  icon: CustomIcon,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const styles = typeStyles[type];
  const Icon = CustomIcon || styles.defaultIcon;

  useEffect(() => {
    if (autoHide && hideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onHide?.();
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, onHide]);

  if (!isVisible) {
    return null;
  }

  const containerClasses = [baseStyles, styles.containerClass, className].join(
    ' '
  );

  return (
    <div className={containerClasses} role="alert" aria-live="polite">
      <Icon
        className={`w-5 h-5 ${styles.iconClass} flex-shrink-0 mt-0.5`}
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
};

// 便利な関数コンポーネント
export const SuccessMessage: React.FC<
  Omit<StatusMessageProps, 'type'>
> = props => <StatusMessage type="success" {...props} />;

export const ErrorMessage: React.FC<
  Omit<StatusMessageProps, 'type'>
> = props => <StatusMessage type="error" {...props} />;

export const WarningMessage: React.FC<
  Omit<StatusMessageProps, 'type'>
> = props => <StatusMessage type="warning" {...props} />;

export const InfoMessage: React.FC<
  Omit<StatusMessageProps, 'type'>
> = props => <StatusMessage type="info" {...props} />;

export default StatusMessage;
