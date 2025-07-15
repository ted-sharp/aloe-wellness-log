import { memo, useMemo } from 'react';

interface CalorieCalculatorProps {
  startWeight: string;
  targetWeight: string;
  targetStart: string;
  targetEnd: string;
  gender: 'male' | 'female' | 'unknown';
  type?: 'total' | 'daily' | 'exercise' | 'diet';
}

const CalorieCalculator = memo(function CalorieCalculator({
  startWeight,
  targetWeight,
  targetStart,
  targetEnd,
  gender,
  type = 'total',
}: CalorieCalculatorProps) {
  const { isValid, totalCalories, dailyCalories } = useMemo(() => {
    // 性別による1kgあたりのカロリー値
    const kcalPerKg = gender === 'female' ? 7000 : 6500;

    // バリデーション
    const isValidData =
      startWeight &&
      targetWeight &&
      targetStart &&
      targetEnd &&
      !isNaN(Number(startWeight)) &&
      !isNaN(Number(targetWeight)) &&
      Number(targetWeight) < Number(startWeight) &&
      /^\d{4}-\d{2}-\d{2}$/.test(targetStart) &&
      /^\d{4}-\d{2}-\d{2}$/.test(targetEnd) &&
      new Date(targetEnd) >= new Date(targetStart);

    if (!isValidData) {
      return { isValid: false, totalCalories: 0, dailyCalories: 0 };
    }

    const totalCal = (Number(startWeight) - Number(targetWeight)) * kcalPerKg;
    const start = new Date(targetStart);
    const end = new Date(targetEnd);
    const days =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return { isValid: false, totalCalories: 0, dailyCalories: 0 };
    }

    const perDay = Math.round(totalCal / days);

    return {
      isValid: true,
      totalCalories: totalCal,
      dailyCalories: perDay,
    };
  }, [startWeight, targetWeight, targetStart, targetEnd, gender]);

  if (!isValid) {
    return null;
  }

  const weightLoss = (Number(startWeight) - Number(targetWeight)).toFixed(1);

  switch (type) {
    case 'total':
      return (
        <div className="text-sm mb-2 text-black dark:text-white">
          あと{weightLoss}kg減らすには
          <span className="text-blue-700 dark:text-blue-300">
            約{Math.round(totalCalories).toLocaleString()}kcal
          </span>
          の消費が必要です
        </div>
      );

    case 'daily':
      return (
        <div className="text-sm mb-2 text-black dark:text-white">
          期間中に一日あたり
          <span className="text-blue-700 dark:text-blue-300">
            約{dailyCalories.toLocaleString()}kcal
          </span>
          の消費が必要です
        </div>
      );

    case 'exercise':
      return (
        <div className="text-sm text-black dark:text-white">
          運動で一日あたり
          <span className="text-blue-700 dark:text-blue-300">
            約{Math.round(dailyCalories / 2).toLocaleString()}kcal
          </span>
          の消費を目標にしましょう。
        </div>
      );

    case 'diet':
      return (
        <div className="text-sm text-black dark:text-white">
          減食で一日あたり
          <span className="text-blue-700 dark:text-blue-300">
            約{Math.round(dailyCalories / 2).toLocaleString()}kcal
          </span>
          の消費を目標にしましょう。
        </div>
      );

    default:
      return null;
  }
});

export default CalorieCalculator;
