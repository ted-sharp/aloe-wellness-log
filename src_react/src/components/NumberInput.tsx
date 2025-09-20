import { memo, useCallback, useState } from 'react';

interface NumberInputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  width?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

const getWidthClass = (width: 'sm' | 'md' | 'lg' = 'md') => {
  switch (width) {
    case 'sm':
      return 'w-16';
    case 'md':
      return 'w-20';
    case 'lg':
      return 'w-24';
    default:
      return 'w-20';
  }
};

const NumberInput = memo(function NumberInput({
  value,
  onChange,
  placeholder,
  step = '0.1',
  min,
  max,
  width = 'md',
  className = '',
  disabled = false,
  'data-testid': dataTestId,
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const widthClass = getWidthClass(width);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setHasChanged(true);
      // 1秒後にハイライト解除
      setTimeout(() => setHasChanged(false), 1000);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const inputClasses = [
    'h-10 border rounded-lg px-3 py-2 text-lg font-mono font-semibold',
    'bg-inherit placeholder:font-normal placeholder:text-sm placeholder-gray-400',
    'transition-all duration-200 transform',
    // フォーカス状態
    isFocused
      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 scale-105'
      : 'border-gray-300 dark:border-gray-600',
    // 変更時のハイライト
    hasChanged ? 'input-highlight' : '',
    // テキスト色
    'text-gray-700 dark:text-gray-200',
    // サイズとカスタムクラス
    widthClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      type="number"
      className={inputClasses}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      data-testid={dataTestId}
    />
  );
});

export default NumberInput;
