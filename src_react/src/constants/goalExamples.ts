/**
 * 目標設定フォームで使用する例文とオプションの定数定義
 */

// 運動に関する例文
export const EXERCISE_EXAMPLES = [
  '毎日30分のウォーキングを続ける',
  '週3回のジムでの筋トレを行う',
  '朝のラジオ体操を習慣にする',
  '階段を使うことを心がける',
  'ヨガで柔軟性を向上させる',
  '水泳で有酸素運動を継続する',
  'サイクリングで体力作りをする',
  'ストレッチで体をほぐす',
  '散歩で自然を楽しみながら運動する',
] as const;

// 食事に関する例文
export const DIET_EXAMPLES = [
  'バランスの良い食事を心がける',
  '野菜を多く摂取するようにする',
  '間食を控えめにする',
  '水分補給をこまめに行う',
  '腹八分目を意識して食べる',
  '食事時間を規則正しく保つ',
] as const;

// 睡眠に関する例文
export const SLEEP_EXAMPLES = [
  '毎日7-8時間の睡眠を確保する',
  '23時までには床に就く',
  '朝の目覚めを良くするために規則正しい生活を送る',
  '寝る前のスマホ使用を控える',
  'リラックスできる睡眠環境を整える',
  '昼寝は30分以内に抑える',
] as const;

// 禁煙に関する例文
export const SMOKING_EXAMPLES = [
  '完全に禁煙する',
  '1日の本数を半分に減らす',
  '禁煙外来でサポートを受ける',
  'ニコチンガムやパッチを活用する',
  '禁煙アプリで進捗を管理する',
] as const;

// 禁酒に関する例文
export const ALCOHOL_EXAMPLES = [
  '週に2日は休肝日を設ける',
  '1日の飲酒量を適量に抑える',
  '夜遅い飲酒を控える',
  'アルコール度数の低いものを選ぶ',
  '完全に禁酒する',
] as const;

// 性別オプション
export const GENDER_OPTIONS = [
  { value: '男性', label: '男性' },
  { value: '女性', label: '女性' },
  { value: 'その他', label: 'その他' },
] as const;

// 例文のカテゴリマッピング
export const GOAL_EXAMPLES = {
  exercise: EXERCISE_EXAMPLES,
  diet: DIET_EXAMPLES,
  sleep: SLEEP_EXAMPLES,
  smoking: SMOKING_EXAMPLES,
  alcohol: ALCOHOL_EXAMPLES,
} as const;

// 例文カテゴリの型定義
export type GoalExampleCategory = keyof typeof GOAL_EXAMPLES;

// フィールドラベルのマッピング
export const GOAL_FIELD_LABELS = {
  exercise: '運動',
  diet: '食事',
  sleep: '睡眠',
  smoking: '禁煙',
  alcohol: '禁酒',
} as const;

// プレースホルダーテキスト
export const GOAL_PLACEHOLDERS = {
  exercise: '運動に関する目標を設定してください',
  diet: '食事に関する目標を設定してください',
  sleep: '睡眠に関する目標を設定してください',
  smoking: '禁煙に関する目標を設定してください',
  alcohol: '禁酒に関する目標を設定してください',
} as const;

// バリデーションメッセージ
export const VALIDATION_MESSAGES = {
  required: '必須項目です',
  invalidYear: '有効な年を入力してください',
  invalidHeight: '身長は100cm〜250cmの範囲で入力してください',
  invalidWeight: '体重は20kg〜300kgの範囲で入力してください',
  invalidDateFormat: '正しい日付形式で入力してください',
  invalidDateRange: '開始日は終了日より前の日付を入力してください',
  futureDateRequired: '今日以降の日付を入力してください',
  pastDateNotAllowed: '過去の日付は入力できません',
} as const;

// フォームフィールドの設定
export const FORM_FIELD_CONFIG = {
  birthYear: {
    min: 1900,
    max: new Date().getFullYear(),
    label: '生年',
  },
  height: {
    min: 100,
    max: 250,
    label: '身長',
    unit: 'cm',
  },
  weight: {
    min: 20,
    max: 300,
    label: '体重',
    unit: 'kg',
  },
} as const;