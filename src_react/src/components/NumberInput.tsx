import { memo } from 'react';

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
  const widthClass = getWidthClass(width);
  
  return (
    <input
      type="number"
      className={`h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-mono font-semibold bg-inherit text-gray-700 dark:text-gray-200 placeholder:font-normal placeholder:text-sm placeholder-gray-400 ${widthClass} ${className}`}
      value={value}
      onChange={e => onChange(e.target.value)}
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