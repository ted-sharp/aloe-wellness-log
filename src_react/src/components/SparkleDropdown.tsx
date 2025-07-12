import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { useState, memo } from 'react';
import { HiSparkles } from 'react-icons/hi2';

interface SparkleDropdownProps {
  examples: string[];
  onSelect: (example: string) => void;
  label?: string;
  className?: string;
}

function useSparkleDropdown() {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(6), flip(), shift()],
    placement: 'bottom-end',
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);
  return {
    open,
    setOpen,
    refs,
    floatingStyles,
    getReferenceProps,
    getFloatingProps,
  };
}

const SparkleDropdown = memo(function SparkleDropdown({
  examples,
  onSelect,
  label = '定型文を挿入',
  className = '',
}: SparkleDropdownProps) {
  const sparkle = useSparkleDropdown();

  const handleExampleSelect = (example: string) => {
    onSelect(example);
    sparkle.setOpen(false);
  };

  return (
    <>
      <div
        ref={sparkle.refs.setReference}
        {...sparkle.getReferenceProps({})}
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-yellow-400 cursor-pointer align-middle hover:opacity-80 focus:outline-none ${className}`}
        tabIndex={0}
        aria-label={label}
        onClick={() => sparkle.setOpen(v => !v)}
      >
        <HiSparkles className="w-6 h-6" />
      </div>
      {sparkle.open && (
        <FloatingPortal>
          <div
            ref={sparkle.refs.setFloating}
            style={sparkle.floatingStyles}
            {...sparkle.getFloatingProps({
              className:
                'z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[180px] py-1',
            })}
          >
            {examples.map((example, index) => (
              <button
                key={index}
                type="button"
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-none bg-transparent focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                onClick={() => handleExampleSelect(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </FloatingPortal>
      )}
    </>
  );
});

export default SparkleDropdown;