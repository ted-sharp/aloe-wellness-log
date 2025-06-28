import React from 'react';
import type { IconType } from 'react-icons';

// ボタンのバリアント（用途別）
export type ButtonVariant =
  | 'primary' // 青系（一般的なアクション）
  | 'success' // 緑系（保存、確定）
  | 'warning' // 黄/オレンジ系（注意、一時的）
  | 'danger' // 赤系（削除、危険）
  | 'secondary' // グレー系（キャンセル、戻る）
  | 'purple' // 紫系（エクスポート、特別）
  | 'teal' // ティール系（追加、新規）
  | 'sky'; // スカイ系（参照、前回値）

// ボタンのサイズ
export type ButtonSize = 'sm' | 'md' | 'lg';

// ボタンのプロパティ
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconType;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// バリアント別のスタイル定義
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 text-white',
  success: 'bg-green-600 hover:bg-green-700 focus:ring-green-600 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 text-white',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white',
  secondary: 'bg-gray-400 hover:bg-gray-500 focus:ring-gray-400 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-600 text-white',
  teal: 'bg-teal-500 hover:bg-teal-600 focus:ring-teal-500 text-white',
  sky: 'bg-sky-500 hover:bg-sky-600 focus:ring-sky-500 text-white',
};

// サイズ別のスタイル定義
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

// 基本スタイル
const baseStyles =
  'rounded-lg font-medium shadow-md transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const buttonClasses = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    fullWidth ? 'w-full' : 'w-auto',
    'hover:shadow-lg',
    className,
  ].join(' ');

  const iconSize =
    size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button className={buttonClasses} disabled={isDisabled} {...props}>
      {loading ? (
        <>
          <div
            className={`animate-spin rounded-full border-2 border-current border-t-transparent ${iconSize}`}
          />
          読み込み中...
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className={iconSize} aria-hidden="true" />
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            <Icon className={iconSize} aria-hidden="true" />
          )}
        </>
      )}
    </button>
  );
};

export default Button;
