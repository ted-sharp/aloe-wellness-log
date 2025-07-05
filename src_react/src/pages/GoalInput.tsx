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
import { useEffect, useRef, useState } from 'react';
import { HiSparkles } from 'react-icons/hi2';
import Button from '../components/Button';
import { useGoalStore } from '../store/goal';
import { useRecordsStore } from '../store/records';

const currentYear = new Date().getFullYear();

// 運動目標の例リスト
const exerciseExamples = [
  '毎日ラジオ体操(第2まで)をする',
  'なるべく階段を使う',
  '通勤で早歩きする',
  '一駅歩く',
  '毎日30分歩く',
  '毎日5000歩歩く',
  '毎日ジョギングをする',
];

// 減食目標の例リスト
const dietExamples = [
  '清涼飲料水を 0 cal にする',
  '間食、夜食を控える',
  '野菜を多く食べる',
  'よく噛んで20分以上かける',
  '夜はお米を食べない',
  '毎食ご飯を半分にする',
];

// 睡眠目標の例リスト
const sleepExamples = [
  '7時間以上寝る',
  '23時までに就寝する',
  '就寝90分前に入浴し体温調節をする',
  '寝室の温度を 18–22 ℃ に保つ',
  '寝室の照明を 300 lx 以下に落とす',
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

// --- 目標入力用 floating-ui スパークル共通フック ---
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

export default function GoalInput() {
  const { goal, setGoal, loadGoal } = useGoalStore();
  const { records } = useRecordsStore();
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>(
    'unknown'
  );
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
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

  // --- スパークル定型文ドロップダウン ---
  const exerciseSparkle = useSparkleDropdown();
  const dietSparkle = useSparkleDropdown();
  const sleepSparkle = useSparkleDropdown();
  const smokingSparkle = useSparkleDropdown();
  const alcoholSparkle = useSparkleDropdown();

  useEffect(() => {
    loadGoal().then(() => {
      if (goal) {
        setGender(goal.gender || 'unknown');
        setBirthYear(goal.birthYear.toString());
        setHeight(goal.height.toString());
        setStartWeight(
          goal.startWeight !== undefined
            ? goal.startWeight.toString()
            : latestWeight !== null
            ? latestWeight.toString()
            : ''
        );
        setTargetStart(goal.targetStart);
        setTargetEnd(goal.targetEnd);
        setTargetWeight(goal.targetWeight.toString());
        setExerciseGoal(goal.exerciseGoal || '');
        setDietGoal(goal.dietGoal || '');
        setSleepGoal(goal.sleepGoal || '');
        setSmokingGoal(goal.smokingGoal || '');
        setAlcoholGoal(goal.alcoholGoal || '');
      } else {
        setStartWeight(latestWeight !== null ? latestWeight.toString() : '');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (goal) {
      setGender(goal.gender || 'unknown');
      setBirthYear(goal.birthYear.toString());
      setHeight(goal.height.toString());
      setStartWeight(
        goal.startWeight !== undefined
          ? goal.startWeight.toString()
          : latestWeight !== null
          ? latestWeight.toString()
          : ''
      );
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
    if (
      !startWeight ||
      isNaN(Number(startWeight)) ||
      Number(startWeight) < 30 ||
      Number(startWeight) > 200
    ) {
      return '開始体重は30～200kgの範囲で入力してください。';
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
      startWeight &&
      targetStart &&
      targetEnd &&
      targetWeight &&
      !validate()
    ) {
      setGoal({
        gender,
        birthYear: Number(birthYear),
        height: Number(height),
        startWeight: Number(startWeight),
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
    startWeight,
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

  // 性別による1kgあたりのカロリー値
  const kcalPerKg = gender === 'female' ? 7000 : 6500;

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
              className="border rounded px-3 py-2 text-base w-32"
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
              className="border rounded px-3 py-2 text-base w-32"
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
          <span>開始体重[kg] (例: 68.0)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="30"
              max="200"
              step="0.1"
              value={startWeight}
              onChange={e => setStartWeight(e.target.value)}
              className="border rounded px-3 py-2 text-base w-32"
              required
              placeholder="例: 68.0"
              data-testid="goal-weight-input"
            />
            {latestWeight !== null && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setStartWeight(latestWeight.toString())}
              >
                最新体重
              </Button>
            )}
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
              className="border rounded px-3 py-2 text-base w-32"
              required
              placeholder="例: 75.0"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (startWeight && !isNaN(Number(startWeight))) {
                  setTargetWeight(
                    (Math.round((Number(startWeight) - 2) * 10) / 10).toString()
                  );
                }
              }}
            >
              -2kg
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (startWeight && !isNaN(Number(startWeight))) {
                  setTargetWeight(
                    (Math.round((Number(startWeight) - 5) * 10) / 10).toString()
                  );
                }
              }}
            >
              -5kg
            </Button>
          </div>
        </label>
        {/* 目標体重入力後に必要カロリー表示（目標体重の直後に移動） */}
        {startWeight &&
          targetWeight &&
          !isNaN(Number(startWeight)) &&
          !isNaN(Number(targetWeight)) &&
          Number(targetWeight) < Number(startWeight) && (
            <div className="text-blue-700 dark:text-blue-300 text-sm font-semibold mb-2">
              あと{(Number(startWeight) - Number(targetWeight)).toFixed(1)}
              kg減らすには約
              {Math.round(
                (Number(startWeight) - Number(targetWeight)) * kcalPerKg
              ).toLocaleString()}
              kcalの消費が必要です
            </div>
          )}
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
              onClick={() =>
                setTargetStart(new Date().toISOString().slice(0, 10))
              }
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
              onClick={() => {
                // 目標開始日から3か月後を自動入力
                const d = targetStart ? new Date(targetStart) : new Date();
                d.setMonth(d.getMonth() + 3);
                setTargetEnd(d.toISOString().slice(0, 10));
              }}
            >
              3か月後
            </Button>
          </div>
        </label>
        {/* 目標終了日の下に一日あたり消費カロリーを表示 */}
        {startWeight &&
          targetWeight &&
          targetStart &&
          targetEnd &&
          !isNaN(Number(startWeight)) &&
          !isNaN(Number(targetWeight)) &&
          Number(targetWeight) < Number(startWeight) &&
          /^\d{4}-\d{2}-\d{2}$/.test(targetStart) &&
          /^\d{4}-\d{2}-\d{2}$/.test(targetEnd) &&
          new Date(targetEnd) >= new Date(targetStart) &&
          (() => {
            const totalCal =
              (Number(startWeight) - Number(targetWeight)) * kcalPerKg;
            const start = new Date(targetStart);
            const end = new Date(targetEnd);
            const days =
              Math.floor(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1;
            if (days > 0) {
              const perDay = Math.round(totalCal / days);
              return (
                <div className="text-blue-700 dark:text-blue-300 text-sm font-semibold mb-2">
                  期間中に一日あたり約{perDay.toLocaleString()}
                  kcalの消費が必要です
                </div>
              );
            }
            return null;
          })()}
        <label className="flex flex-col gap-1">
          <span>運動目標 (例: なるべく階段を使う)</span>
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={exerciseGoal}
              onChange={e => setExerciseGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1 pr-10"
              placeholder="例: 毎日30分歩く"
            />
            <div
              ref={exerciseSparkle.refs.setReference}
              {...exerciseSparkle.getReferenceProps({})}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-yellow-400 cursor-pointer align-middle hover:opacity-80 focus:outline-none"
              tabIndex={0}
              aria-label="定型文を挿入"
              onClick={() => exerciseSparkle.setOpen(v => !v)}
            >
              <HiSparkles className="w-6 h-6" />
            </div>
            {exerciseSparkle.open && (
              <FloatingPortal>
                <div
                  ref={exerciseSparkle.refs.setFloating}
                  style={exerciseSparkle.floatingStyles}
                  {...exerciseSparkle.getFloatingProps({
                    className:
                      'z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[180px] py-1',
                  })}
                >
                  {exerciseExamples.map(option => (
                    <button
                      key={option}
                      type="button"
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900"
                      onClick={() => {
                        setExerciseGoal(option);
                        exerciseSparkle.setOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </FloatingPortal>
            )}
          </div>
        </label>
        {/* 運動目標の下に一日あたり消費カロリーの半分を表示 */}
        {startWeight &&
          targetWeight &&
          targetStart &&
          targetEnd &&
          !isNaN(Number(startWeight)) &&
          !isNaN(Number(targetWeight)) &&
          Number(targetWeight) < Number(startWeight) &&
          /^\d{4}-\d{2}-\d{2}$/.test(targetStart) &&
          /^\d{4}-\d{2}-\d{2}$/.test(targetEnd) &&
          new Date(targetEnd) >= new Date(targetStart) &&
          (() => {
            const totalCal =
              (Number(startWeight) - Number(targetWeight)) * kcalPerKg;
            const start = new Date(targetStart);
            const end = new Date(targetEnd);
            const days =
              Math.floor(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1;
            if (days > 0) {
              const perDay = Math.round(totalCal / days);
              const halfPerDay = Math.round(perDay / 2);
              return (
                <div className="text-blue-700 dark:text-blue-300 text-sm font-semibold mb-2">
                  運動で一日あたり約{halfPerDay.toLocaleString()}
                  kcalの消費を目標にしましょう。
                </div>
              );
            }
            return null;
          })()}
        <label className="flex flex-col gap-1">
          <span>減食目標 (例: 間食を控える)</span>
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={dietGoal}
              onChange={e => setDietGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1 pr-10"
              placeholder="例: 間食を控える"
            />
            <div
              ref={dietSparkle.refs.setReference}
              {...dietSparkle.getReferenceProps({})}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-yellow-400 cursor-pointer align-middle hover:opacity-80 focus:outline-none"
              tabIndex={0}
              aria-label="定型文を挿入"
              onClick={() => dietSparkle.setOpen(v => !v)}
            >
              <HiSparkles className="w-6 h-6" />
            </div>
            {dietSparkle.open && (
              <FloatingPortal>
                <div
                  ref={dietSparkle.refs.setFloating}
                  style={dietSparkle.floatingStyles}
                  {...dietSparkle.getFloatingProps({
                    className:
                      'z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[180px] py-1',
                  })}
                >
                  {dietExamples.map(option => (
                    <button
                      key={option}
                      type="button"
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900"
                      onClick={() => {
                        setDietGoal(option);
                        dietSparkle.setOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </FloatingPortal>
            )}
          </div>
        </label>
        {/* 減食目標の下に一日あたり消費カロリーの半分を表示 */}
        {startWeight &&
          targetWeight &&
          targetStart &&
          targetEnd &&
          !isNaN(Number(startWeight)) &&
          !isNaN(Number(targetWeight)) &&
          Number(targetWeight) < Number(startWeight) &&
          /^\d{4}-\d{2}-\d{2}$/.test(targetStart) &&
          /^\d{4}-\d{2}-\d{2}$/.test(targetEnd) &&
          new Date(targetEnd) >= new Date(targetStart) &&
          (() => {
            const totalCal =
              (Number(startWeight) - Number(targetWeight)) * kcalPerKg;
            const start = new Date(targetStart);
            const end = new Date(targetEnd);
            const days =
              Math.floor(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1;
            if (days > 0) {
              const perDay = Math.round(totalCal / days);
              const halfPerDay = Math.round(perDay / 2);
              return (
                <div className="text-blue-700 dark:text-blue-300 text-sm font-semibold mb-2">
                  減食で一日あたり約{halfPerDay.toLocaleString()}
                  kcalの消費を目標にしましょう。
                </div>
              );
            }
            return null;
          })()}
        <label className="flex flex-col gap-1">
          <span>睡眠目標 (例: 23時までに就寝する)</span>
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={sleepGoal}
              onChange={e => setSleepGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1 pr-10"
              placeholder="例: 7時間以上寝る"
            />
            <div
              ref={sleepSparkle.refs.setReference}
              {...sleepSparkle.getReferenceProps({})}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-yellow-400 cursor-pointer align-middle hover:opacity-80 focus:outline-none"
              tabIndex={0}
              aria-label="定型文を挿入"
              onClick={() => sleepSparkle.setOpen(v => !v)}
            >
              <HiSparkles className="w-6 h-6" />
            </div>
            {sleepSparkle.open && (
              <FloatingPortal>
                <div
                  ref={sleepSparkle.refs.setFloating}
                  style={sleepSparkle.floatingStyles}
                  {...sleepSparkle.getFloatingProps({
                    className:
                      'z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[180px] py-1',
                  })}
                >
                  {sleepExamples.map(option => (
                    <button
                      key={option}
                      type="button"
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900"
                      onClick={() => {
                        setSleepGoal(option);
                        sleepSparkle.setOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </FloatingPortal>
            )}
          </div>
        </label>
        <div className="text-blue-700 dark:text-blue-300 text-sm font-semibold mb-2">
          十分な睡眠(7時間以上)をとると痩せやすくなります。
        </div>
        <label className="flex flex-col gap-1">
          <span>喫煙目標 (例: 1日○本までにする)</span>
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={smokingGoal}
              onChange={e => setSmokingGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1 pr-10"
              placeholder="例: 1日○本までにする"
            />
            <div
              ref={smokingSparkle.refs.setReference}
              {...smokingSparkle.getReferenceProps({})}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-yellow-400 cursor-pointer align-middle hover:opacity-80 focus:outline-none"
              tabIndex={0}
              aria-label="定型文を挿入"
              onClick={() => smokingSparkle.setOpen(v => !v)}
            >
              <HiSparkles className="w-6 h-6" />
            </div>
            {smokingSparkle.open && (
              <FloatingPortal>
                <div
                  ref={smokingSparkle.refs.setFloating}
                  style={smokingSparkle.floatingStyles}
                  {...smokingSparkle.getFloatingProps({
                    className:
                      'z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[180px] py-1',
                  })}
                >
                  {smokingExamples.map(option => (
                    <button
                      key={option}
                      type="button"
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900"
                      onClick={() => {
                        setSmokingGoal(option);
                        smokingSparkle.setOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </FloatingPortal>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span>飲酒目標 (例: 週2回までにする)</span>
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={alcoholGoal}
              onChange={e => setAlcoholGoal(e.target.value)}
              className="border rounded px-3 py-2 text-base flex-1 pr-10"
              placeholder="例: 週2回までにする"
            />
            <div
              ref={alcoholSparkle.refs.setReference}
              {...alcoholSparkle.getReferenceProps({})}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-yellow-400 cursor-pointer align-middle hover:opacity-80 focus:outline-none"
              tabIndex={0}
              aria-label="定型文を挿入"
              onClick={() => alcoholSparkle.setOpen(v => !v)}
            >
              <HiSparkles className="w-6 h-6" />
            </div>
            {alcoholSparkle.open && (
              <FloatingPortal>
                <div
                  ref={alcoholSparkle.refs.setFloating}
                  style={alcoholSparkle.floatingStyles}
                  {...alcoholSparkle.getFloatingProps({
                    className:
                      'z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[180px] py-1',
                  })}
                >
                  {alcoholExamples.map(option => (
                    <button
                      key={option}
                      type="button"
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900"
                      onClick={() => {
                        setAlcoholGoal(option);
                        alcoholSparkle.setOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </FloatingPortal>
            )}
          </div>
        </label>
        <Button
          type="submit"
          size="lg"
          variant="primary"
          data-testid="save-btn"
        >
          保存
        </Button>
      </form>
    </div>
  );
}
