// 目標データ型
export type GoalData = {
  birthYear: number; // 生年（例: 1990）
  height: number; // 身長（cm）
  targetStart: string; // 目標開始日（YYYY-MM-DD）
  targetEnd: string; // 目標終了日（YYYY-MM-DD）
  targetWeight: number; // 目標体重（kg）
  exerciseGoal?: string; // 運動目標
  dietGoal?: string; // 減食目標
  sleepGoal?: string; // 睡眠目標
  smokingGoal?: string; // 喫煙目標
  alcoholGoal?: string; // 飲酒目標
};
