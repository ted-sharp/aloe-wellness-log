import { memo, useCallback, useState } from 'react';
import { HiSparkles } from 'react-icons/hi2';
import {
  addBpRecord,
  addDailyRecord,
  addWeightRecord,
  getAllBpRecords,
  getAllDailyRecords,
  getAllWeightRecords,
} from '../db';
import { isDev } from '../utils/devTools';
import { performanceMonitor } from '../utils/performanceMonitor';
import Button from './Button';
import ProgressBar from './ProgressBar';
import { ErrorMessage, InfoMessage, SuccessMessage } from './StatusMessage';

interface TestDataGeneratorProps {
  onStatusChange?: (status: string | null) => void;
}

const TestDataGenerator = memo(function TestDataGenerator({
  onStatusChange,
}: TestDataGeneratorProps) {
  const [testDataStatus, setTestDataStatus] = useState<string | null>(null);
  const [testDataProgress, setTestDataProgress] = useState<number>(0);
  const [isGeneratingTestData, setIsGeneratingTestData] = useState(false);

  // 各データタイプの件数とその期間
  const [weightCount, setWeightCount] = useState<number>(0);
  const [dailyCount, setDailyCount] = useState<number>(0);
  const [bpCount, setBpCount] = useState<number>(0);

  const [weightPeriod, setWeightPeriod] = useState<string>('');
  const [dailyPeriod, setDailyPeriod] = useState<string>('');
  const [bpPeriod, setBpPeriod] = useState<string>('');

  // データ件数を更新
  const updateDataCounts = useCallback(async () => {
    try {
      const [weightRecords, dailyRecords, bpRecords] = await Promise.all([
        getAllWeightRecords(),
        getAllDailyRecords(),
        getAllBpRecords(),
      ]);

      setWeightCount(weightRecords.length);
      setDailyCount(dailyRecords.length);
      setBpCount(bpRecords.length);

      // 期間を計算
      if (weightRecords.length > 0) {
        const dates = weightRecords.map(r => r.date).sort();
        setWeightPeriod(`${dates[0]} ～ ${dates[dates.length - 1]}`);
      } else {
        setWeightPeriod('');
      }

      if (dailyRecords.length > 0) {
        const dates = dailyRecords.map(r => r.date).sort();
        setDailyPeriod(`${dates[0]} ～ ${dates[dates.length - 1]}`);
      } else {
        setDailyPeriod('');
      }

      if (bpRecords.length > 0) {
        const dates = bpRecords.map(r => r.date).sort();
        setBpPeriod(`${dates[0]} ～ ${dates[dates.length - 1]}`);
      } else {
        setBpPeriod('');
      }
    } catch (error) {
      console.error('データ件数の取得に失敗しました:', error);
    }
  }, []);

  const generateWeightTestData = useCallback(async () => {
    setTestDataStatus('体重テストデータを生成中...');
    setIsGeneratingTestData(true);
    setTestDataProgress(0);
    onStatusChange?.('体重テストデータを生成中...');

    try {
      const daysBack = 180; // 180日分
      const baseWeight = 75; // 初期体重
      const minWeight = 50;
      const maxWeight = 100;
      let createdCount = 0;

      for (let i = daysBack - 1; i >= 0; i--) {
        // 日付を過去から順に生成
        const date = new Date();
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // 時刻は毎日8:00固定
        const timeStr = '08:00';

        // 体重を徐々に減少させつつ±2kgの範囲でランダム変動
        const trend = (daysBack - i) * 0.05; // 1日あたり0.05kg減少
        const randomDelta = (Math.random() - 0.5) * 2; // -2〜+2kg
        let weight = baseWeight - trend + randomDelta;
        weight = Math.max(
          minWeight,
          Math.min(maxWeight, Math.round(weight * 10) / 10)
        );

        // 体脂肪率も徐々に減少させるパターン
        const baseBodyFat = 25; // 初期体脂肪率: 25%
        const bodyFatTrend = (daysBack - i) * 0.02; // 1日あたり0.02%減少
        const bodyFatRandomDelta = (Math.random() - 0.5) * 0.3; // -0.15〜+0.15%
        let bodyFat = baseBodyFat - bodyFatTrend + bodyFatRandomDelta;
        bodyFat = Math.max(8, Math.min(35, Math.round(bodyFat * 10) / 10)); // 8-35%の範囲

        // 腹囲（ウエスト）も徐々に減少させるパターン
        const baseWaist = 85; // 初期ウエスト: 85cm
        const waistTrend = (daysBack - i) * 0.03; // 1日あたり0.03cm減少
        const waistRandomDelta = (Math.random() - 0.5) * 0.3; // -0.15〜+0.15cm
        let waist = baseWaist - waistTrend + waistRandomDelta;
        waist = Math.max(60, Math.min(100, Math.round(waist * 10) / 10)); // 60-100cmの範囲

        // 一意なIDを生成
        const uniqueId = `test_weight_${dateStr}_${Math.random()
          .toString(36)
          .substr(2, 6)}`;

        const testRecord = {
          id: uniqueId,
          date: dateStr,
          time: timeStr,
          weight: weight,
          bodyFat: Math.random() > 0.2 ? bodyFat : null, // 80%の確率で体脂肪率を記録
          waist: Math.random() > 0.2 ? waist : null, // 80%の確率でウエストを記録
          note: Math.random() > 0.7 ? 'テストメモ' : null,
          excludeFromGraph: Math.random() > 0.5 ? true : false,
        };

        try {
          await addWeightRecord(testRecord);
          createdCount++;
          setTestDataProgress((createdCount / daysBack) * 50); // 50%まで
        } catch (error) {
          if (isDev) {
            console.warn(`体重レコード追加失敗 (${dateStr}):`, error);
          }
        }
      }

      setTestDataStatus(
        `体重テストデータ生成完了: ${createdCount}/${daysBack}件`
      );
      onStatusChange?.(
        `体重テストデータ生成完了: ${createdCount}/${daysBack}件`
      );
      await updateDataCounts();
    } catch (error) {
      setTestDataStatus(
        `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      onStatusChange?.(
        `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsGeneratingTestData(false);
    }
  }, [onStatusChange, updateDataCounts]);

  const generateDailyTestData = useCallback(async () => {
    setTestDataStatus('日課テストデータを生成中...');
    setIsGeneratingTestData(true);
    setTestDataProgress(50); // 50%から開始
    onStatusChange?.('日課テストデータを生成中...');

    try {
      // 既存のデフォルトフィールドIDを使用（新しいフィールドは作成しない）
      const dailyFields = [
        { fieldId: 'exercise' },
        { fieldId: 'meal' },
        { fieldId: 'sleep' },
        { fieldId: 'smoke' },
        { fieldId: 'alcohol' },
      ];

      const daysBack = 180; // 180日分
      let createdCount = 0;

      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // 各フィールドに対してランダムな値を生成
        for (const field of dailyFields) {
          const rand = Math.random();
          let value: 0 | 0.5 | 1;
          if (rand < 0.3) value = 1; // 30%の確率で完全達成
          else if (rand < 0.6) value = 0.5; // 30%の確率で部分達成
          else value = 0; // 40%の確率で未達成

          const uniqueId = `test_daily_${
            field.fieldId
          }_${dateStr}_${Math.random().toString(36).substr(2, 6)}`;

          const testRecord = {
            id: uniqueId,
            date: dateStr,
            fieldId: field.fieldId,
            value: value,
          };

          try {
            await addDailyRecord(testRecord);
          } catch (error) {
            if (isDev) {
              console.warn(
                `日課レコード追加失敗 (${dateStr}, ${field.fieldId}):`,
                error
              );
            }
          }
        }

        createdCount++;
        setTestDataProgress(50 + (createdCount / daysBack) * 25); // 50%から75%まで
      }

      setTestDataStatus(
        `日課テストデータ生成完了: ${createdCount * dailyFields.length}件`
      );
      onStatusChange?.(
        `日課テストデータ生成完了: ${createdCount * dailyFields.length}件`
      );
      await updateDataCounts();
    } catch (error) {
      setTestDataStatus(
        `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      onStatusChange?.(
        `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [onStatusChange, updateDataCounts]);

  const generateBpTestData = useCallback(async () => {
    setTestDataStatus('血圧テストデータを生成中...');
    setTestDataProgress(75); // 75%から開始
    onStatusChange?.('血圧テストデータを生成中...');

    try {
      const daysBack = 180; // 180日分
      let createdCount = 0;

      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // 朝と夜の2回測定
        const times = ['08:00', '22:00'];

        for (const timeStr of times) {
          // 最高血圧: 110-140の範囲
          const systolic = 110 + Math.round(Math.random() * 30);
          // 最低血圧: 60-90の範囲
          const diastolic = 60 + Math.round(Math.random() * 30);
          // 脈拍: 60-100の範囲
          const pulse = 60 + Math.round(Math.random() * 40);

          const uniqueId = `test_bp_${dateStr}_${timeStr.replace(
            ':',
            ''
          )}_${Math.random().toString(36).substr(2, 6)}`;

          const testRecord = {
            id: uniqueId,
            date: dateStr,
            time: timeStr,
            systolic: systolic,
            diastolic: diastolic,
            heartRate: pulse,
            note: Math.random() > 0.8 ? 'テストメモ' : null,
          };

          try {
            await addBpRecord(testRecord);
          } catch (error) {
            if (isDev) {
              console.warn(
                `血圧レコード追加失敗 (${dateStr}, ${timeStr}):`,
                error
              );
            }
          }
        }

        createdCount++;
        setTestDataProgress(75 + (createdCount / daysBack) * 25); // 75%から100%まで
      }

      setTestDataStatus(`血圧テストデータ生成完了: ${createdCount * 2}件`);
      onStatusChange?.(`血圧テストデータ生成完了: ${createdCount * 2}件`);
      await updateDataCounts();
    } catch (error) {
      setTestDataStatus(
        `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      onStatusChange?.(
        `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsGeneratingTestData(false);
      setTestDataProgress(100);
    }
  }, [onStatusChange, updateDataCounts]);

  const generateAllTestData = useCallback(async () => {
    const operationId = `generate-test-data-${Date.now()}`;
    performanceMonitor.trackDatabase.start(operationId, 'generate-test-data');

    try {
      await generateWeightTestData();
      await generateDailyTestData();
      await generateBpTestData();

      setTestDataStatus('すべてのテストデータ生成が完了しました');
      onStatusChange?.('すべてのテストデータ生成が完了しました');
    } catch (error) {
      setTestDataStatus(
        `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      onStatusChange?.(
        `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      performanceMonitor.trackDatabase.end(operationId, 'generate-test-data');
      setIsGeneratingTestData(false);
    }
  }, [
    generateWeightTestData,
    generateDailyTestData,
    generateBpTestData,
    onStatusChange,
  ]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
          <HiSparkles className="w-6 h-6" />
          テストデータ生成
        </h2>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 flex justify-center">
            <div className="text-left max-w-md">
              <p>
                • 体重: {weightCount}件 {weightPeriod && `(${weightPeriod})`}
              </p>
              <p>
                • 日課: {dailyCount}件 {dailyPeriod && `(${dailyPeriod})`}
              </p>
              <p>
                • 血圧: {bpCount}件 {bpPeriod && `(${bpPeriod})`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="primary"
              icon={HiSparkles}
              onClick={generateWeightTestData}
              disabled={isGeneratingTestData}
            >
              体重テストデータ生成
            </Button>
            <Button
              variant="primary"
              icon={HiSparkles}
              onClick={generateDailyTestData}
              disabled={isGeneratingTestData}
            >
              日課テストデータ生成
            </Button>
            <Button
              variant="primary"
              icon={HiSparkles}
              onClick={generateBpTestData}
              disabled={isGeneratingTestData}
            >
              血圧テストデータ生成
            </Button>
            <Button
              variant="success"
              icon={HiSparkles}
              onClick={generateAllTestData}
              disabled={isGeneratingTestData}
            >
              すべて生成
            </Button>
          </div>

          {isGeneratingTestData && (
            <ProgressBar
              value={testDataProgress}
              label="テストデータを生成中..."
            />
          )}

          {testDataStatus && (
            <div className="mt-4">
              {testDataStatus.includes('エラー') ? (
                <ErrorMessage message={testDataStatus} />
              ) : testDataStatus.includes('完了') ? (
                <SuccessMessage message={testDataStatus} />
              ) : (
                <InfoMessage message={testDataStatus} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default TestDataGenerator;
