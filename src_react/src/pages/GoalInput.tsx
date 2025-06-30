import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import { useGoalStore } from '../store/goal';

const currentYear = new Date().getFullYear();

export default function GoalInput() {
  const { goal, setGoal, clearGoal, loadGoal } = useGoalStore();
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [targetStart, setTargetStart] = useState('');
  const [targetEnd, setTargetEnd] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadGoal().then(() => {
      if (goal) {
        setBirthYear(goal.birthYear.toString());
        setHeight(goal.height.toString());
        setTargetStart(goal.targetStart);
        setTargetEnd(goal.targetEnd);
        setTargetWeight(goal.targetWeight.toString());
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (goal) {
      setBirthYear(goal.birthYear.toString());
      setHeight(goal.height.toString());
      setTargetStart(goal.targetStart);
      setTargetEnd(goal.targetEnd);
      setTargetWeight(goal.targetWeight.toString());
    }
  }, [goal]);

  const validate = () => {
    if (
      !birthYear ||
      isNaN(Number(birthYear)) ||
      Number(birthYear) < 1900 ||
      Number(birthYear) > currentYear
    ) {
      return '生年は1900年以降、今年以下の数字で入力してください。';
    }
    if (
      !height ||
      isNaN(Number(height)) ||
      Number(height) < 100 ||
      Number(height) > 250
    ) {
      return '身長は100～250cmの範囲で入力してください。';
    }
    if (!targetStart || !/^\d{4}-\d{2}-\d{2}$/.test(targetStart)) {
      return '目標開始日はYYYY-MM-DD形式で入力してください。';
    }
    if (!targetEnd || !/^\d{4}-\d{2}-\d{2}$/.test(targetEnd)) {
      return '目標終了日はYYYY-MM-DD形式で入力してください。';
    }
    if (targetStart > targetEnd) {
      return '目標終了日は開始日以降の日付にしてください。';
    }
    if (
      !targetWeight ||
      isNaN(Number(targetWeight)) ||
      Number(targetWeight) < 30 ||
      Number(targetWeight) > 200
    ) {
      return '目標体重は30～200kgの範囲で入力してください。';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    await setGoal({
      birthYear: Number(birthYear),
      height: Number(height),
      targetStart,
      targetEnd,
      targetWeight: Number(targetWeight),
    });
    setSuccess('目標を保存しました！');
  };

  const handleClear = async () => {
    setBirthYear('');
    setHeight('');
    setTargetStart('');
    setTargetEnd('');
    setTargetWeight('');
    await clearGoal();
    setError(null);
    setSuccess('目標データをリセットしました。');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 py-8">
      <h1 className="text-2xl sm:text-4xl font-bold mb-6 text-gray-800 dark:text-white whitespace-nowrap">
        目標設定
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 w-full max-w-md flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1">
          生年（例: 1990）
          <input
            type="number"
            min="1900"
            max={currentYear}
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            className="border rounded px-3 py-2 text-base"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          身長（cm）
          <input
            type="number"
            min="100"
            max="250"
            value={height}
            onChange={e => setHeight(e.target.value)}
            className="border rounded px-3 py-2 text-base"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          目標開始日
          <input
            type="date"
            value={targetStart}
            onChange={e => setTargetStart(e.target.value)}
            className="border rounded px-3 py-2 text-base"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          目標終了日
          <input
            type="date"
            value={targetEnd}
            onChange={e => setTargetEnd(e.target.value)}
            className="border rounded px-3 py-2 text-base"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          目標体重（kg）
          <input
            type="number"
            min="30"
            max="200"
            step="0.1"
            value={targetWeight}
            onChange={e => setTargetWeight(e.target.value)}
            className="border rounded px-3 py-2 text-base"
            required
          />
        </label>
        {error && <div className="text-red-600 font-bold text-sm">{error}</div>}
        {success && (
          <div className="text-green-600 font-bold text-sm">{success}</div>
        )}
        <div className="flex gap-2 mt-2">
          <Button type="submit" variant="primary" size="md" fullWidth>
            保存
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleClear}
          >
            リセット
          </Button>
        </div>
      </form>
    </div>
  );
}
