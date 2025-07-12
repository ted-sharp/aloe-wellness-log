import { memo } from 'react';
import Button from './Button';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import type { DailyFieldV2 } from '../types/record';

interface AchievementStats {
  total: number;
  success: number;
  percent: number;
}

interface DailyAchievementItemProps {
  field: DailyFieldV2;
  value: 0 | 0.5 | 1 | undefined;
  stats: AchievementStats;
  onAchieve: () => Promise<void>;
  onPartial: () => Promise<void>;
  onUnachieve: () => Promise<void>;
}

const DailyAchievementItem = memo(function DailyAchievementItem({
  field,
  value,
  stats,
  onAchieve,
  onPartial,
  onUnachieve,
}: DailyAchievementItemProps) {
  const animatedPercent = useAnimatedNumber(stats.percent);

  return (
    <div className="flex flex-col gap-1 bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-1">
      <div className="flex items-center gap-1">
        <span className="text-lg font-semibold text-gray-700 dark:text-gray-200 min-w-[5em]">
          {field.name}
        </span>
        <Button
          variant={value === 1 ? 'primary' : 'secondary'}
          size="md"
          onClick={onAchieve}
          aria-pressed={value === 1}
          className="flex-1"
          data-testid={`daily-input-${field.fieldId}-achieve`}
        >
          達成
        </Button>
        <Button
          variant={value === 0.5 ? 'primary' : 'secondary'}
          size="md"
          onClick={onPartial}
          aria-pressed={value === 0.5}
          className="flex-1"
          data-testid={`daily-input-${field.fieldId}-partial`}
        >
          微達成
        </Button>
        <Button
          variant={value === 0 ? 'primary' : 'secondary'}
          size="md"
          onClick={onUnachieve}
          aria-pressed={value === 0}
          className="flex-1"
          data-testid={`daily-input-${field.fieldId}-unachieve`}
        >
          未達
        </Button>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        <span className="text-base font-semibold text-blue-700 dark:text-blue-200 align-middle">
          直近2週間の達成率：
        </span>
        {stats.total > 0 ? (
          <>
            <span className="ml-4 text-base font-semibold text-blue-700 dark:text-blue-200 align-middle">
              <span
                style={{
                  display: 'inline-block',
                  minWidth: '3ch',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                }}
              >
                {animatedPercent.toFixed(0)}
              </span>
              %
            </span>
            <span className="ml-2 text-base font-semibold text-blue-700 dark:text-blue-200 align-middle">
              ({stats.success}/{stats.total}日)
            </span>
          </>
        ) : (
          '記録なし'
        )}
      </div>
    </div>
  );
});

export default DailyAchievementItem;