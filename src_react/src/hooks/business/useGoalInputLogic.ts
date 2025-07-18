import { useCallback, useEffect, useState } from 'react';
import { getAllWeightRecords, getAllBpRecords, getAllDailyRecords } from '../../db';
import { 
  useYearValidation,
  useHeightValidation, 
  useWeightValidation 
} from '../useNumericValidation';
import { useGoalStore } from '../../store/goal.mobx';

/**
 * 目標入力のビジネスロジックを管理するカスタムHook
 */
export const useGoalInputLogic = () => {
  const { goal, setGoal, loadGoal } = useGoalStore();
  
  // フォーム状態
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
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

  // データ取得状態
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [oldestWeight, setOldestWeight] = useState<number | null>(null);
  const [oldestDate, setOldestDate] = useState<string | null>(null);

  // バリデーション（新しいフックを使用）
  const birthYearError = useYearValidation(birthYear, '生年');
  const heightError = useHeightValidation(height, '身長');
  const startWeightError = useWeightValidation(startWeight, '開始体重');
  const targetWeightError = useWeightValidation(targetWeight, '目標体重');

  // 日付バリデーション
  const validateDate = useCallback((date: string, fieldName: string) => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return `${fieldName}はYYYY-MM-DD形式で入力してください。`;
    }
    return null;
  }, []);

  const targetStartError = validateDate(targetStart, '目標開始日');
  const targetEndError = validateDate(targetEnd, '目標終了日');
  const dateRangeError = targetStart && targetEnd && targetStart > targetEnd 
    ? '目標終了日は開始日以降の日付にしてください。' 
    : null;

  // 統合バリデーション
  const validate = useCallback(() => {
    return birthYearError || 
           heightError || 
           startWeightError || 
           targetStartError || 
           targetEndError || 
           dateRangeError || 
           targetWeightError;
  }, [birthYearError, heightError, startWeightError, targetStartError, 
      targetEndError, dateRangeError, targetWeightError]);

  // データ取得処理
  const fetchData = useCallback(async () => {
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
  }, []);

  // 初期化処理
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 初回goal読み込み
  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  // goalが変更されたときの画面更新
  useEffect(() => {
    if (goal) {
      console.info('Loading saved goal data:', goal);
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

  // 入力変更時に即保存
  const saveGoal = useCallback(() => {
    const validationError = validate();
    
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
    validate,
  ]);

  // デバウンス付きの保存
  useEffect(() => {
    const timer = setTimeout(saveGoal, 300);
    return () => clearTimeout(timer);
  }, [saveGoal]);

  // ヘルパー関数
  const currentYear = new Date().getFullYear();
  const yearFromAge = useCallback((age: number) => (currentYear - age).toString(), [currentYear]);
  const heightNum = Number(height) || 170;

  // クイック入力関数
  const setLatestWeightAsStart = useCallback(() => {
    if (latestWeight !== null) {
      setStartWeight(latestWeight.toString());
    }
  }, [latestWeight]);

  const setOldestWeightAsStart = useCallback(() => {
    if (oldestWeight !== null) {
      setStartWeight(oldestWeight.toString());
    }
  }, [oldestWeight]);

  const setTodayAsTargetStart = useCallback(() => {
    setTargetStart(new Date().toISOString().slice(0, 10));
  }, []);

  const setOldestDateAsTargetStart = useCallback(() => {
    if (oldestDate) {
      setTargetStart(oldestDate);
    }
  }, [oldestDate]);

  const setTargetEndFromStart = useCallback((months: number) => {
    const d = targetStart ? new Date(targetStart) : new Date();
    d.setMonth(d.getMonth() + months);
    setTargetEnd(d.toISOString().slice(0, 10));
  }, [targetStart]);

  const setTargetWeightFromStart = useCallback((diff: number) => {
    if (startWeight && !isNaN(Number(startWeight))) {
      setTargetWeight(
        (Math.round((Number(startWeight) + diff) * 10) / 10).toString()
      );
    }
  }, [startWeight]);

  return {
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
    validate,

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
  };
};