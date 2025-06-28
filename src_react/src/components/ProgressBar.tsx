import React from 'react';

// プログレスバーのプロパティ
export interface ProgressBarProps {
  value: number; // 0-100の進捗値
  max?: number;
  showPercentage?: boolean;
  showValue?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
  animated?: boolean;
}

// バリアント別のスタイル定義
const variantStyles = {
  primary: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-amber-500',
  error: 'bg-red-600',
};

// サイズ別のスタイル定義
const sizeStyles = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showPercentage = true,
  showValue = false,
  label,
  size = 'md',
  variant = 'primary',
  className = '',
  animated = true,
}) => {
  // 値を0-100の範囲に制限
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;

  const barClasses = [
    'w-full bg-gray-200 rounded-full overflow-hidden',
    sizeStyles[size],
    className,
  ].join(' ');

  const fillClasses = [
    'h-full transition-all duration-300 ease-out',
    variantStyles[variant],
    animated ? 'transition-all duration-300' : '',
  ].join(' ');

  return (
    <div className="w-full">
      {/* ラベル行 */}
      {(label || showPercentage || showValue) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="text-sm text-gray-600 flex gap-2">
            {showValue && (
              <span>
                {normalizedValue} / {max}
              </span>
            )}
            {showPercentage && <span>{Math.round(percentage)}%</span>}
          </div>
        </div>
      )}

      {/* プログレスバー */}
      <div
        className={barClasses}
        role="progressbar"
        aria-valuenow={normalizedValue}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={fillClasses} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default ProgressBar;
