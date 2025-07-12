import { useEffect, useState, memo } from 'react';
import type { GoalData } from '../types/goal';

interface BMIIndicatorProps {
  currentWeight: number | null;
  goal: GoalData | null;
  showWeightDiff?: boolean;
}

interface BMIBand {
  min: number;
  max: number;
  color: string;
  label: string;
  range: string;
}

const bmiBands: BMIBand[] = [
  { min: 0, max: 18.5, color: '#6ec6f1', label: '低体重', range: '<18.5' },
  { min: 18.5, max: 25, color: '#7edfa0', label: '普通体重', range: '18.5-24.9' },
  { min: 25, max: 30, color: '#b6d97a', label: '肥満(1度)', range: '25-29.9' },
  { min: 30, max: 35, color: '#ffe066', label: '肥満(2度)', range: '30-34.9' },
  { min: 35, max: 40, color: '#ff9800', label: '肥満(3度)', range: '35-39.9' },
  { min: 40, max: 100, color: '#f44336', label: '肥満(4度)', range: '40.0+' },
];

const BMIIndicator = memo(function BMIIndicator({
  currentWeight,
  goal,
  showWeightDiff = true,
}: BMIIndicatorProps) {
  // BMI計算
  const bmi =
    currentWeight && goal && goal.height
      ? currentWeight / Math.pow(goal.height / 100, 2)
      : null;
  
  const safeBmi = typeof bmi === 'number' && !isNaN(bmi) ? bmi : 0;

  // BMIマーカーの位置計算
  const markerLeft = (() => {
    if (bmi === null) return 0;
    let total = 0;
    for (let i = 0; i < bmiBands.length; i++) {
      const band = bmiBands[i];
      if (bmi < band.max) {
        const bandWidth = 100 / bmiBands.length;
        const ratio = (bmi - band.min) / (band.max - band.min);
        return total + bandWidth * ratio;
      }
      total += 100 / bmiBands.length;
    }
    return 100;
  })();

  // BMIアニメーション
  const [animatedBmi, setAnimatedBmi] = useState(0);
  useEffect(() => {
    if (typeof bmi !== 'number' || isNaN(bmi)) return;
    
    const start = 0;
    const duration = 800;
    const startTime = performance.now();
    
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimatedBmi(start + (safeBmi - start) * progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedBmi(safeBmi);
      }
    }
    
    requestAnimationFrame(animate);
  }, [safeBmi, bmi]);

  // 体重差アニメーション
  const [animatedDiff, setAnimatedDiff] = useState(0);
  useEffect(() => {
    if (
      showWeightDiff &&
      goal &&
      goal.startWeight !== undefined &&
      currentWeight !== null &&
      currentWeight - goal.startWeight < 0
    ) {
      const diff = currentWeight - goal.startWeight;
      const start = 0;
      const duration = 800;
      const startTime = performance.now();
      
      function animate(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimatedDiff(start + (diff - start) * progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setAnimatedDiff(diff);
        }
      }
      
      requestAnimationFrame(animate);
    } else {
      setAnimatedDiff(0);
    }
  }, [goal, currentWeight, showWeightDiff]);

  if (!bmi || !goal || !goal.height) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* BMI値表示 - showWeightDiffがtrueの時のみ表示 */}
      {showWeightDiff && (
        <div className="flex items-center justify-center mb-2">
          <span className="text-base font-semibold text-blue-700 dark:text-blue-200">
            BMI{' '}
            <span
              style={{
                display: 'inline-block',
                minWidth: '4ch',
                textAlign: 'right',
                fontFamily: 'monospace',
              }}
            >
              {animatedBmi.toFixed(1)}
            </span>
          </span>
          {showWeightDiff && animatedDiff < 0 && (
            <span className="ml-2 text-base font-semibold text-green-600 dark:text-green-400">
              🏆{animatedDiff.toFixed(1)}kg
            </span>
          )}
        </div>
      )}

      {/* BMIインジケーターバー */}
      <div className="flex flex-col items-center mb-2">
        <div
          className="relative w-full h-8 flex rounded overflow-hidden shadow"
          style={{ minWidth: 240 }}
        >
          {bmiBands.map(band => (
            <div
              key={band.label}
              className="flex-1 flex flex-col items-center justify-center"
              style={{ backgroundColor: band.color }}
              title={`${band.label} (${band.range})`}
            >
              <span className="text-[10px] font-bold text-gray-800 dark:text-gray-900">
                {band.label}
              </span>
            </div>
          ))}
          {/* BMIマーカー */}
          <div
            className="absolute top-0 text-red-600 text-lg font-bold"
            style={{
              left: `${markerLeft}%`,
              transform: 'translateX(-50%)',
              lineHeight: '32px',
              fontSize: '20px',
              fontWeight: 'bold',
              textShadow: '0 0 2px #fff, 0 0 2px #fff, 1px 1px 2px #0002',
              zIndex: 2,
            }}
            aria-label="現在のBMI位置"
          >
            ▼
          </div>
        </div>
        
        {/* BMI範囲表示 */}
        <div className="w-full flex justify-between mt-1 px-1">
          {bmiBands.map(band => (
            <span
              key={band.label + '-range'}
              className="text-[10px] text-gray-700 dark:text-gray-200"
              style={{ flex: 1, textAlign: 'center' }}
            >
              {band.range}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

export default BMIIndicator;