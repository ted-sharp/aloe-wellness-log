import { observer } from 'mobx-react-lite';
import Button from '../components/Button';
import CalorieCalculator from '../components/CalorieCalculator';
import SparkleDropdown from '../components/SparkleDropdown';
import { useGoalInputLogic } from '../hooks/business/useGoalInputLogic';

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


export default observer(function GoalInput() {
  const {
    // フォーム状態
    gender,
    setGender,
    birthYear,
    setBirthYear,
    height,
    setHeight,
    startWeight,
    setStartWeight,
    targetStart,
    setTargetStart,
    targetEnd,
    setTargetEnd,
    targetWeight,
    setTargetWeight,
    exerciseGoal,
    setExerciseGoal,
    dietGoal,
    setDietGoal,
    sleepGoal,
    setSleepGoal,
    smokingGoal,
    setSmokingGoal,
    alcoholGoal,
    setAlcoholGoal,

    // データ取得状態
    latestWeight,
    oldestWeight,
    oldestDate,

    // バリデーション
    birthYearError,
    heightError,
    startWeightError,
    targetWeightError,
    targetStartError,
    targetEndError,
    dateRangeError,

    // ヘルパー
    currentYear,
    yearFromAge,
    heightNum,

    // クイック入力
    setLatestWeightAsStart,
    setOldestWeightAsStart,
    setTodayAsTargetStart,
    setOldestDateAsTargetStart,
    setTargetEndFromStart,
    setTargetWeightFromStart,
  } = useGoalInputLogic();



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
                onClick={setLatestWeightAsStart}
              >
                最新
              </Button>
            )}
            {oldestWeight !== null && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={setOldestWeightAsStart}
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
              onClick={() => setTargetWeightFromStart(-2)}
            >
              -2kg
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTargetWeightFromStart(-5)}
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
              onClick={setTodayAsTargetStart}
            >
              今日
            </Button>
            {oldestDate && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={setOldestDateAsTargetStart}
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
              onClick={() => setTargetEndFromStart(3)}
            >
              3か月後
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTargetEndFromStart(6)}
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
});
