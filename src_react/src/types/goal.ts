// 目標データ型
export type GoalData = {
  gender?: 'male' | 'female' | 'unknown'; // 性別
  age?: number | null; // 年齢
  birthYear?: number; // 生年（例: 1990）
  height?: number; // 身長（cm）
  currentWeight?: number; // 現在の体重（kg）
  startWeight?: number; // 開始体重（kg）
  targetWeight: number; // 目標体重（kg）
  targetStart?: string; // 目標開始日（YYYY-MM-DD）
  targetEnd?: string; // 目標終了日（YYYY-MM-DD）
  targetDate?: string; // 目標終了日（旧プロパティとの互換性）
  exerciseGoal?: string; // 運動目標
  dietGoal?: string; // 減食目標
  sleepGoal?: string; // 睡眠目標
  smokingGoal?: string; // 喫煙目標
  alcoholGoal?: string; // 飲酒目標
};
