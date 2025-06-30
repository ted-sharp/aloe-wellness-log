import { useEffect, useState } from 'react';
import Button from '../components/Button';
import { useGoalStore } from '../store/goal';
import { useRecordsStore } from '../store/records';

const currentYear = new Date().getFullYear();
const todayStr = new Date().toISOString().slice(0, 10);

function addMonths(dateStr: string, months: number) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export default function GoalInput() {
  const { goal, setGoal, loadGoal } = useGoalStore();
  const { records } = useRecordsStore();
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [targetStart, setTargetStart] = useState('');
  const [targetEnd, setTargetEnd] = useState('');
  const [targetWeight, setTargetWeight] = useState('');

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

  // 入力変更時に即保存
  useEffect(() => {
    // すべての値が有効な場合のみ保存
    if (
      birthYear &&
      height &&
      targetStart &&
      targetEnd &&
      targetWeight &&
      !validate()
    ) {
      setGoal({
        birthYear: Number(birthYear),
        height: Number(height),
        targetStart,
        targetEnd,
        targetWeight: Number(targetWeight),
      });
    }
  }, [birthYear, height, targetStart, targetEnd, targetWeight]);

  // 年齢→生年変換
  const yearFromAge = (age: number) => (currentYear - age).toString();
  // 身長の+5/-5
  const heightNum = Number(height) || 170;
  // 最新体重取得
  const latestWeight = (() => {
    const weightRecords = records
      .filter(r => r.fieldId === 'weight' && typeof r.value === 'number')
      .sort((a, b) => {
        // datetime優先、なければdate+time降順
        const adt = a.datetime || `${a.date}T${a.time}`;
        const bdt = b.datetime || `${b.date}T${b.time}`;
        return bdt.localeCompare(adt);
      });
    return weightRecords.length > 0 ? Number(weightRecords[0].value) : null;
  })();

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 py-8">
      <h1 className="text-2xl sm:text-4xl font-bold mb-6 text-gray-800 dark:text-white whitespace-nowrap">
        目標設定
      </h1>
      <form className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 w-full max-w-md flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span>生年（例: 1990）</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1900"
              max={currentYear}
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              className="border rounded px-3 py-2 text-base"
              required
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setBirthYear(yearFromAge(40))}
            >
              40
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setBirthYear((Number(birthYear) - 5).toString())}
            >
              -5
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setBirthYear((Number(birthYear) + 5).toString())}
            >
              +5
            </Button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>身長（cm）</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="100"
              max="250"
              value={height}
              onChange={e => setHeight(e.target.value)}
              className="border rounded px-3 py-2 text-base"
              required
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setHeight('170')}
            >
              170
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setHeight((heightNum - 5).toString())}
            >
              -5
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setHeight((heightNum + 5).toString())}
            >
              +5
            </Button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>目標開始日</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={targetStart}
              onChange={e => setTargetStart(e.target.value)}
              className="border rounded px-3 py-2 text-base"
              required
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTargetStart(todayStr)}
            >
              今日
            </Button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>目標終了日</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={targetEnd}
              onChange={e => setTargetEnd(e.target.value)}
              className="border rounded px-3 py-2 text-base"
              required
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTargetEnd(addMonths(targetStart, 3))}
            >
              3か月後
            </Button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>目標体重（kg）</span>
          <div className="flex items-center gap-2">
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                latestWeight !== null &&
                setTargetWeight((latestWeight - 2).toString())
              }
            >
              -2kg
            </Button>
          </div>
        </label>
      </form>
    </div>
  );
}
