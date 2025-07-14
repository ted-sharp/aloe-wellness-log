import { useEffect, useState } from 'react';
import Button from '../components/Button';
import CalorieCalculator from '../components/CalorieCalculator';
import SparkleDropdown from '../components/SparkleDropdown';
import { getAllWeightRecords, getAllBpRecords, getAllDailyRecords } from '../db';
import { 
  useYearValidation,
  useHeightValidation, 
  useWeightValidation 
} from '../hooks/useNumericValidation';
import { useGoalStore } from '../store/goal';


const currentYear = new Date().getFullYear();

// 運動目標の例リスト
const exerciseExamples = [
  '毎日ラジオ体操(第1,2)をする',
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


export default function GoalInput() {
  const { goal, setGoal, loadGoal } = useGoalStore();
  
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
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [oldestWeight, setOldestWeight] = useState<number | null>(null);
  const [oldestDate, setOldestDate] = useState<string | null>(null);

  // バリデーション（新しいフックを使用）
  const birthYearError = useYearValidation(birthYear, '生年');
  const heightError = useHeightValidation(height, '身長');
  const startWeightError = useWeightValidation(startWeight, '開始体重');
  const targetWeightError = useWeightValidation(targetWeight, '目標体重');

  // 日付バリデーション
  const validateDate = (date: string, fieldName: string) => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return `${fieldName}はYYYY-MM-DD形式で入力してください。`;
    }
    return null;
  };

  const targetStartError = validateDate(targetStart, '目標開始日');
  const targetEndError = validateDate(targetEnd, '目標終了日');
  const dateRangeError = targetStart && targetEnd && targetStart > targetEnd 
    ? '目標終了日は開始日以降の日付にしてください。' 
    : null;

  useEffect(() => {
    // 最新体重と最古体重、最古日付を取得（ボタン用）
    const fetchData = async () => {
      try {
        // 体重データ、血圧データ、日常記録データを並行取得
        const [weightRecords, bpRecords, dailyRecords] = await Promise.all([
          getAllWeightRecords(),
          getAllBpRecords(),
          getAllDailyRecords()
        ]);

        // 体重データの処理
        if (weightRecords.length > 0) {
          const sorted = [...weightRecords].sort((a, b) => {
            const adt = new Date(`${a.date}T${a.time}`).getTime();
            const bdt = new Date(`${b.date}T${b.time}`).getTime();
            return adt - bdt; // 昇順ソート
          });
          
          setOldestWeight(sorted[0].weight);
          setLatestWeight(sorted[sorted.length - 1].weight);
        } else {
          setLatestWeight(null);
          setOldestWeight(null);
        }

        // 全データから最古の日付を取得
        const allDates: string[] = [];
        
        // 体重データの日付を追加
        weightRecords.forEach(record => {
          allDates.push(record.date);
        });
        
        // 血圧データの日付を追加
        bpRecords.forEach(record => {
          allDates.push(record.date);
        });
        
        // 日常記録データの日付を追加
        dailyRecords.forEach(record => {
          allDates.push(record.date);
        });

        // 最古の日付を取得
        if (allDates.length > 0) {
          const sortedDates = allDates.sort();
          setOldestDate(sortedDates[0]);
        } else {
          setOldestDate(null);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLatestWeight(null);
        setOldestWeight(null);
        setOldestDate(null);
      }
    };

    fetchData();
  }, []);

  // 初回goal読み込み
  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  // goalが変更されたときの画面更新
  useEffect(() => {
    if (goal) {
      console.log('Loading saved goal data:', goal);
      setGender(goal.gender || 'unknown');
      setBirthYear(goal.birthYear ? goal.birthYear.toString() : '');
      setHeight(goal.height ? goal.height.toString() : '');
      setStartWeight(goal.startWeight ? goal.startWeight.toString() : '');
      setTargetStart(goal.targetStart || '');
      setTargetEnd(goal.targetEnd || '');
      setTargetWeight(goal.targetWeight.toString());
      setExerciseGoal(goal.exerciseGoal || '');
      setDietGoal(goal.dietGoal || '');
      setSleepGoal(goal.sleepGoal || '');
      setSmokingGoal(goal.smokingGoal || '');
      setAlcoholGoal(goal.alcoholGoal || '');
    }
  }, [goal]);

  // 統合バリデーション（新しいフックベースのバリデーションを使用）
  const validate = () => {
    return birthYearError || 
           heightError || 
           startWeightError || 
           targetStartError || 
           targetEndError || 
           dateRangeError || 
           targetWeightError;
  };

  // 入力変更時に即保存
  useEffect(() => {
    // すべての値が有効な場合のみ保存
    const validationError = validate();
    
    console.log('Goal save validation:', {
      gender: !!gender,
      birthYear: !!birthYear,
      height: !!height,
      startWeight: !!startWeight,
      targetStart: !!targetStart,
      targetEnd: !!targetEnd,
      targetWeight: !!targetWeight,
      validationError,
      startWeightValue: startWeight,
    });
    
    if (
      gender &&
      birthYear &&
      height &&
      startWeight &&
      targetStart &&
      targetEnd &&
      targetWeight &&
      !validationError
    ) {
      const goalData = {
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
      };
      
      console.log('Saving goal data:', goalData);
      setGoal(goalData);
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
    setGoal,
    // バリデーションエラーは関数内で取得するため依存関係から除外
  ]);

  // 年齢→生年変換
  const yearFromAge = (age: number) => (currentYear - age).toString();
  // 身長の+5/-5
  const heightNum = Number(height) || 170;



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
                最新
              </Button>
            )}
            {oldestWeight !== null && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setStartWeight(oldestWeight.toString())}
              >
                最古
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
        <CalorieCalculator
          startWeight={startWeight}
          targetWeight={targetWeight}
          targetStart={targetStart}
          targetEnd={targetEnd}
          gender={gender}
          type="total"
        />
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
            {oldestDate && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setTargetStart(oldestDate)}
              >
                最古
              </Button>
            )}
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                // 目標開始日から6か月後を自動入力
                const d = targetStart ? new Date(targetStart) : new Date();
                d.setMonth(d.getMonth() + 6);
                setTargetEnd(d.toISOString().slice(0, 10));
              }}
            >
              半年後
            </Button>
          </div>
        </label>
        {/* 目標終了日の下に一日あたり消費カロリーを表示 */}
        <CalorieCalculator
          startWeight={startWeight}
          targetWeight={targetWeight}
          targetStart={targetStart}
          targetEnd={targetEnd}
          gender={gender}
          type="daily"
        />
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
            <SparkleDropdown
              examples={exerciseExamples}
              onSelect={(example) => setExerciseGoal(example)}
              label="運動目標の定型文を挿入"
            />
          </div>
        </label>
        {/* 運動目標の下に一日あたり消費カロリーの半分を表示 */}
        <CalorieCalculator
          startWeight={startWeight}
          targetWeight={targetWeight}
          targetStart={targetStart}
          targetEnd={targetEnd}
          gender={gender}
          type="exercise"
        />
        <div className="text-blue-700 dark:text-blue-300 text-sm font-semibold mb-2">
          簡単に取り組める日常の動作の延長が効果的です。
        </div>
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
            <SparkleDropdown
              examples={dietExamples}
              onSelect={(example) => setDietGoal(example)}
              label="減食目標の定型文を挿入"
            />
          </div>
        </label>
        {/* 減食目標の下に一日あたり消費カロリーの半分を表示 */}
        <CalorieCalculator
          startWeight={startWeight}
          targetWeight={targetWeight}
          targetStart={targetStart}
          targetEnd={targetEnd}
          gender={gender}
          type="diet"
        />
        <div className="text-blue-700 dark:text-blue-300 text-sm font-semibold mb-2">
          カロリーコントロールが一番効果があります。
        </div>
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
            <SparkleDropdown
              examples={sleepExamples}
              onSelect={(example) => setSleepGoal(example)}
              label="睡眠目標の定型文を挿入"
            />
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
            <SparkleDropdown
              examples={smokingExamples}
              onSelect={(example) => setSmokingGoal(example)}
              label="喫煙目標の定型文を挿入"
            />
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
            <SparkleDropdown
              examples={alcoholExamples}
              onSelect={(example) => setAlcoholGoal(example)}
              label="飲酒目標の定型文を挿入"
            />
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
