import { useEffect, useRef, useState } from 'react';
import { HiSparkles, HiXMark } from 'react-icons/hi2';
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

// 運動目標の例リスト
const exerciseExamples = [
  'なるべく階段を使う',
  '通勤で早歩きする',
  '一駅歩く',
  '毎日30分歩く',
  '毎日5000歩歩く',
  '毎日ラジオ体操をする',
  '毎週ジョギングをする',
  '毎週サイクリングをする',
];

// 減食目標の例リスト
const dietExamples = [
  '清涼飲料水をお茶にする',
  '間食を控える',
  '夜食をやめる',
  '野菜を多く食べる',
  '夜はお米を食べない',
  '毎食ご飯を半分にする',
  'よく噛んで20分以上かける',
];

// 睡眠目標の例リスト
const sleepExamples = [
  '7時間以上寝る',
  '23時までに就寝する',
  '就寝90分前に入浴し体温調節をする',
  '寝室の温度を18–22 ℃に保つ',
  '寝室の照明を300lx以下に落とす',
  '寝る前にスマホを見ない',
];

// 喫煙目標の例リスト
const smokingExamples = [
  '家では吸わない',
  '会社では吸わない',
  '電子タバコへ移行し本数を半減する',
  '1週間に1本ずつ減らす',
  '禁煙外来に通う',
];

// 飲酒目標の例リスト
const alcoholExamples = [
  '休肝日を作る',
  '1日1杯までにする',
  '週2回までにする',
  '飲み会は月1回まで',
  'ノンアルコール飲料にする',
];

// 性別の選択肢
const genderOptions = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'unknown', label: '未回答' },
];

export default function GoalInput() {
  const { goal, setGoal, loadGoal } = useGoalStore();
  const { records } = useRecordsStore();
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>(
    'unknown'
  );
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [targetStart, setTargetStart] = useState('');
  const [targetEnd, setTargetEnd] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [exerciseGoal, setExerciseGoal] = useState('');
  const [dietGoal, setDietGoal] = useState('');
  const [sleepGoal, setSleepGoal] = useState('');
  const [smokingGoal, setSmokingGoal] = useState('');
  const [alcoholGoal, setAlcoholGoal] = useState('');
  const [showExerciseExamples, setShowExerciseExamples] = useState(false);
  const [showDietExamples, setShowDietExamples] = useState(false);
  const [showSleepExamples, setShowSleepExamples] = useState(false);
  const [showSmokingExamples, setShowSmokingExamples] = useState(false);
  const [showAlcoholExamples, setShowAlcoholExamples] = useState(false);
  const exerciseExampleRef = useRef<HTMLDivElement | null>(null);
  const dietExampleRef = useRef<HTMLDivElement | null>(null);
  const sleepExampleRef = useRef<HTMLDivElement | null>(null);
  const smokingExampleRef = useRef<HTMLDivElement | null>(null);
  const alcoholExampleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadGoal().then(() => {
      if (goal) {
        setGender(goal.gender || 'unknown');
        setBirthYear(goal.birthYear.toString());
        setHeight(goal.height.toString());
        setTargetStart(goal.targetStart);
        setTargetEnd(goal.targetEnd);
        setTargetWeight(goal.targetWeight.toString());
        setExerciseGoal(goal.exerciseGoal || '');
        setDietGoal(goal.dietGoal || '');
        setSleepGoal(goal.sleepGoal || '');
        setSmokingGoal(goal.smokingGoal || '');
        setAlcoholGoal(goal.alcoholGoal || '');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (goal) {
      setGender(goal.gender || 'unknown');
      setBirthYear(goal.birthYear.toString());
      setHeight(goal.height.toString());
      setTargetStart(goal.targetStart);
      setTargetEnd(goal.targetEnd);
      setTargetWeight(goal.targetWeight.toString());
      setExerciseGoal(goal.exerciseGoal || '');
      setDietGoal(goal.dietGoal || '');
      setSleepGoal(goal.sleepGoal || '');
      setSmokingGoal(goal.smokingGoal || '');
      setAlcoholGoal(goal.alcoholGoal || '');
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
      gender &&
      birthYear &&
      height &&
      targetStart &&
      targetEnd &&
      targetWeight &&
      !validate()
    ) {
      setGoal({
        gender,
        birthYear: Number(birthYear),
        height: Number(height),
        targetStart,
        targetEnd,
        targetWeight: Number(targetWeight),
        exerciseGoal,
        dietGoal,
        sleepGoal,
        smokingGoal,
        alcoholGoal,
      });
    }
  }, [
    gender,
    birthYear,
    height,
    targetStart,
    targetEnd,
    targetWeight,
    exerciseGoal,
    dietGoal,
    sleepGoal,
    smokingGoal,
    alcoholGoal,
  ]);

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

  // フォーム外クリックでポップアップを閉じる処理（useEffectで）
  useEffect(() => {
    if (!showExerciseExamples) return;
    const handleClick = (e: MouseEvent) => {
      const icon = document.querySelector('[aria-label="運動目標の例を表示"]');
      const popup = exerciseExampleRef.current;
      if (
        icon &&
        !icon.contains(e.target as Node) &&
        popup &&
        !popup.contains(e.target as Node)
      ) {
        setShowExerciseExamples(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExerciseExamples]);

  useEffect(() => {
    if (showDietExamples) {
      const handleClick = (e: MouseEvent) => {
        const icon = document.querySelector(
          '[aria-label="減食目標の例を表示"]'
        );
        const popup = dietExampleRef.current;
        if (
          icon &&
          !icon.contains(e.target as Node) &&
          popup &&
          !popup.contains(e.target as Node)
        ) {
          setShowDietExamples(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showDietExamples]);

  useEffect(() => {
    if (showSleepExamples) {
      const handleClick = (e: MouseEvent) => {
        const icon = document.querySelector(
          '[aria-label="睡眠目標の例を表示"]'
        );
        const popup = sleepExampleRef.current;
        if (
          icon &&
          !icon.contains(e.target as Node) &&
          popup &&
          !popup.contains(e.target as Node)
        ) {
          setShowSleepExamples(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showSleepExamples]);

  useEffect(() => {
    if (showSmokingExamples) {
      const handleClick = (e: MouseEvent) => {
        const icon = document.querySelector(
          '[aria-label="喫煙目標の例を表示"]'
        );
        const popup = smokingExampleRef.current;
        if (
          icon &&
          !icon.contains(e.target as Node) &&
          popup &&
          !popup.contains(e.target as Node)
        ) {
          setShowSmokingExamples(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showSmokingExamples]);

  useEffect(() => {
    if (showAlcoholExamples) {
      const handleClick = (e: MouseEvent) => {
        const icon = document.querySelector(
          '[aria-label="飲酒目標の例を表示"]'
        );
        const popup = alcoholExampleRef.current;
        if (
          icon &&
          !icon.contains(e.target as Node) &&
          popup &&
          !popup.contains(e.target as Node)
        ) {
          setShowAlcoholExamples(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showAlcoholExamples]);

  return (
    <div className="flex flex-col items-center justify-start py-0 bg-transparent">
      <form className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 w-full max-w-md flex flex-col gap-4">
        {/* 性別選択欄 */}
        <label className="flex flex-col gap-1">
          <span>性別</span>
          <div className="flex gap-4 mt-1">
            {genderOptions.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-1 text-base"
              >
                <input
                  type="radio"
                  name="gender"
                  value={opt.value}
                  checked={gender === opt.value}
                  onChange={() =>
                    setGender(opt.value as 'male' | 'female' | 'unknown')
                  }
                  className="accent-blue-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </label>
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
              placeholder="例: 1990"
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
          <span>身長[cm] (例: 165.0)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="100"
              max="250"
              value={height}
              onChange={e => setHeight(e.target.value)}
              className="border rounded px-3 py-2 text-base"
              required
              placeholder="例: 165.0"
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
          <span>目標体重[kg] (例: 75.0)</span>
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
              placeholder="例: 75.0"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                latestWeight !== null &&
                setTargetWeight(
                  (Math.round((latestWeight - 2) * 10) / 10).toString()
                )
              }
            >
              -2kg
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                latestWeight !== null &&
                setTargetWeight(
                  (Math.round((latestWeight - 5) * 10) / 10).toString()
                )
              }
            >
              -5kg
            </Button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>運動目標 (例: なるべく階段を使う)</span>
          <div className="flex items-center gap-2 relative">
            <input
              type="text"
              value={exerciseGoal}
              onChange={e => setExerciseGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1"
              placeholder="例: 毎日30分歩く"
            />
            <span
              role="button"
              tabIndex={0}
              aria-label="運動目標の例を表示"
              className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none cursor-pointer select-none"
              style={{ display: 'flex', alignItems: 'center' }}
              onClick={() => setShowExerciseExamples(v => !v)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ')
                  setShowExerciseExamples(v => !v);
              }}
            >
              <HiSparkles
                className="w-8 h-8"
                style={{ minHeight: '2.5rem', minWidth: '2.5rem' }}
              />
            </span>
            {showExerciseExamples && (
              <div
                ref={exerciseExampleRef}
                className="absolute z-20 top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 flex flex-col gap-2"
                style={{ minWidth: '220px' }}
                tabIndex={-1}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                    運動目標の例
                  </span>
                  <button
                    type="button"
                    aria-label="閉じる"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                    onClick={() => setShowExerciseExamples(false)}
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                </div>
                <ul className="flex flex-col gap-1">
                  {exerciseExamples.map(ex => (
                    <li key={ex}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm text-gray-700 dark:text-gray-100"
                        onClick={() => {
                          setExerciseGoal(ex);
                          setShowExerciseExamples(false);
                        }}
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>減食目標 (例: 間食を控える)</span>
          <div className="flex items-center gap-2 relative">
            <input
              type="text"
              value={dietGoal}
              onChange={e => setDietGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1"
              placeholder="例: 間食を控える"
            />
            <span
              role="button"
              tabIndex={0}
              aria-label="減食目標の例を表示"
              className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none cursor-pointer select-none"
              style={{ display: 'flex', alignItems: 'center' }}
              onClick={() => setShowDietExamples(v => !v)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ')
                  setShowDietExamples(v => !v);
              }}
            >
              <HiSparkles
                className="w-8 h-8"
                style={{ minHeight: '2.5rem', minWidth: '2.5rem' }}
              />
            </span>
            {showDietExamples && (
              <div
                ref={dietExampleRef}
                className="absolute z-20 top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 flex flex-col gap-2"
                style={{ minWidth: '220px' }}
                tabIndex={-1}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                    減食目標の例
                  </span>
                  <button
                    type="button"
                    aria-label="閉じる"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                    onClick={() => setShowDietExamples(false)}
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                </div>
                <ul className="flex flex-col gap-1">
                  {dietExamples.map(ex => (
                    <li key={ex}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm text-gray-700 dark:text-gray-100"
                        onClick={() => {
                          setDietGoal(ex);
                          setShowDietExamples(false);
                        }}
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>睡眠目標 (例: 23時までに就寝する)</span>
          <div className="flex items-center gap-2 relative">
            <input
              type="text"
              value={sleepGoal}
              onChange={e => setSleepGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1"
              placeholder="例: 23時までに就寝する"
            />
            <span
              role="button"
              tabIndex={0}
              aria-label="睡眠目標の例を表示"
              className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none cursor-pointer select-none"
              style={{ display: 'flex', alignItems: 'center' }}
              onClick={() => setShowSleepExamples(v => !v)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ')
                  setShowSleepExamples(v => !v);
              }}
            >
              <HiSparkles
                className="w-8 h-8"
                style={{ minHeight: '2.5rem', minWidth: '2.5rem' }}
              />
            </span>
            {showSleepExamples && (
              <div
                ref={sleepExampleRef}
                className="absolute z-20 top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 flex flex-col gap-2"
                style={{ minWidth: '220px' }}
                tabIndex={-1}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                    睡眠目標の例
                  </span>
                  <button
                    type="button"
                    aria-label="閉じる"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                    onClick={() => setShowSleepExamples(false)}
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                </div>
                <ul className="flex flex-col gap-1">
                  {sleepExamples.map(ex => (
                    <li key={ex}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm text-gray-700 dark:text-gray-100"
                        onClick={() => {
                          setSleepGoal(ex);
                          setShowSleepExamples(false);
                        }}
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>喫煙目標 (例: 1日○本までにする)</span>
          <div className="flex items-center gap-2 relative">
            <input
              type="text"
              value={smokingGoal}
              onChange={e => setSmokingGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1"
              placeholder="例: 1日○本までにする"
            />
            <span
              role="button"
              tabIndex={0}
              aria-label="喫煙目標の例を表示"
              className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none cursor-pointer select-none"
              style={{ display: 'flex', alignItems: 'center' }}
              onClick={() => setShowSmokingExamples(v => !v)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ')
                  setShowSmokingExamples(v => !v);
              }}
            >
              <HiSparkles
                className="w-8 h-8"
                style={{ minHeight: '2.5rem', minWidth: '2.5rem' }}
              />
            </span>
            {showSmokingExamples && (
              <div
                ref={smokingExampleRef}
                className="absolute z-20 top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 flex flex-col gap-2"
                style={{ minWidth: '220px' }}
                tabIndex={-1}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                    喫煙目標の例
                  </span>
                  <button
                    type="button"
                    aria-label="閉じる"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                    onClick={() => setShowSmokingExamples(false)}
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                </div>
                <ul className="flex flex-col gap-1">
                  {smokingExamples.map(ex => (
                    <li key={ex}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm text-gray-700 dark:text-gray-100"
                        onClick={() => {
                          setSmokingGoal(ex);
                          setShowSmokingExamples(false);
                        }}
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>飲酒目標 (例: 週2回までにする)</span>
          <div className="flex items-center gap-2 relative">
            <input
              type="text"
              value={alcoholGoal}
              onChange={e => setAlcoholGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1"
              placeholder="例: 週2回までにする"
            />
            <span
              role="button"
              tabIndex={0}
              aria-label="飲酒目標の例を表示"
              className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none cursor-pointer select-none"
              style={{ display: 'flex', alignItems: 'center' }}
              onClick={() => setShowAlcoholExamples(v => !v)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ')
                  setShowAlcoholExamples(v => !v);
              }}
            >
              <HiSparkles
                className="w-8 h-8"
                style={{ minHeight: '2.5rem', minWidth: '2.5rem' }}
              />
            </span>
            {showAlcoholExamples && (
              <div
                ref={alcoholExampleRef}
                className="absolute z-20 top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 flex flex-col gap-2"
                style={{ minWidth: '220px' }}
                tabIndex={-1}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                    飲酒目標の例
                  </span>
                  <button
                    type="button"
                    aria-label="閉じる"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                    onClick={() => setShowAlcoholExamples(false)}
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                </div>
                <ul className="flex flex-col gap-1">
                  {alcoholExamples.map(ex => (
                    <li key={ex}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm text-gray-700 dark:text-gray-100"
                        onClick={() => {
                          setAlcoholGoal(ex);
                          setShowAlcoholExamples(false);
                        }}
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </label>
      </form>
    </div>
  );
}
