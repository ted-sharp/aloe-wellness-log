import React, { useEffect, useState } from 'react';
import {
  HiArrowDownTray,
  HiChartBarSquare,
  HiDocument,
  HiExclamationTriangle,
  HiSparkles,
  HiTrash,
} from 'react-icons/hi2';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import {
  ErrorMessage,
  InfoMessage,
  SuccessMessage,
} from '../components/StatusMessage';
import {
  addBpRecord,
  addDailyField,
  addDailyRecord,
  addWeightRecord,
  getAllBpRecords,
  getAllDailyFields,
  getAllDailyRecords,
  getAllWeightRecords,
} from '../db/indexedDb';
import { useRecordsStore } from '../store/records';
import { isDev } from '../utils/devTools';
import { performanceMonitor } from '../utils/performanceMonitor';

function formatDateForFilename(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export default function RecordExport({
  showTipsModal,
}: {
  showTipsModal?: () => void;
}) {
  const { deleteAllData } = useRecordsStore();
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [testDataStatus, setTestDataStatus] = useState<string | null>(null);
  const [testDataProgress, setTestDataProgress] = useState<number>(0);
  const [isGeneratingTestData, setIsGeneratingTestData] =
    useState<boolean>(false);

  // エラーテスト用の状態
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);

  // 体重・日課・血圧レコード数
  const [weightCount, setWeightCount] = useState<number>(0);
  const [dailyCount, setDailyCount] = useState<number>(0);
  const [bpCount, setBpCount] = useState<number>(0);
  // 期間（最小・最大日付）
  const [weightPeriod, setWeightPeriod] = useState<string>('');
  const [dailyPeriod, setDailyPeriod] = useState<string>('');
  const [bpPeriod, setBpPeriod] = useState<string>('');

  useEffect(() => {
    // 体重
    getAllWeightRecords().then(recs => {
      setWeightCount(recs.length);
      if (recs.length > 0) {
        const dates = recs.map(r => r.date).sort();
        setWeightPeriod(`${dates[0]} 〜 ${dates[dates.length - 1]}`);
      } else {
        setWeightPeriod('データなし');
      }
    });
    // 日課
    getAllDailyRecords().then(recs => {
      setDailyCount(recs.length);
      if (recs.length > 0) {
        const dates = recs.map(r => r.date).sort();
        setDailyPeriod(`${dates[0]} 〜 ${dates[dates.length - 1]}`);
      } else {
        setDailyPeriod('データなし');
      }
    });
    // 血圧
    getAllBpRecords().then(recs => {
      setBpCount(recs.length);
      if (recs.length > 0) {
        const dates = recs.map(r => r.date).sort();
        setBpPeriod(`${dates[0]} 〜 ${dates[dates.length - 1]}`);
      } else {
        setBpPeriod('データなし');
      }
    });
  }, []);

  // エラーテスト用: レンダリング時にエラーを投げる
  if (errorToThrow) {
    throw errorToThrow;
  }

  // パフォーマンス監視の初期化
  useEffect(() => {
    performanceMonitor.trackRender.start('RecordExport');
    return () => {
      performanceMonitor.trackRender.end('RecordExport');
    };
  });

  // 開発環境でのパフォーマンス情報表示
  useEffect(() => {
    if (!isDev) return;

    const logPerformanceInfo = () => {
      console.group('🔍 RecordExport Performance Info');

      console.log(`📊 Import Status: ${importStatus || 'none'}`);
      console.log(`📊 Test Data Status: ${testDataStatus || 'none'}`);
      console.log(`📊 Test Data Progress: ${testDataProgress}%`);
      console.log(`📊 Is Generating: ${isGeneratingTestData}`);
      console.groupEnd();
    };

    const timeout = setTimeout(logPerformanceInfo, 2000);
    return () => clearTimeout(timeout);
  }, [importStatus, testDataStatus, testDataProgress, isGeneratingTestData]);

  // V2形式エクスポート
  const handleExportJSON = async () => {
    const [weightRecords, bpRecords, dailyRecords, dailyFields] =
      await Promise.all([
        getAllWeightRecords(),
        getAllBpRecords(),
        getAllDailyRecords(),
        getAllDailyFields(),
      ]);
    const exportData = {
      weightRecords,
      bpRecords,
      dailyRecords,
      dailyFields,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `records-v2-${formatDateForFilename(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // V2形式インポートのみ
  const handleImport = async (file: File) => {
    setImportStatus('データをインポート中...');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (
        !data ||
        typeof data !== 'object' ||
        !Array.isArray(data.weightRecords) ||
        !Array.isArray(data.bpRecords) ||
        !Array.isArray(data.dailyRecords) ||
        !Array.isArray(data.dailyFields)
      ) {
        throw new Error('V2 JSON file format is incorrect');
      }
      let importCount = 0;
      // 体重
      for (const rec of data.weightRecords) {
        try {
          await addWeightRecord(rec);
          importCount++;
        } catch (error) {
          console.warn('Skipping weight record:', rec.id, error);
        }
      }
      // 血圧
      for (const rec of data.bpRecords) {
        try {
          await addBpRecord(rec);
          importCount++;
        } catch (error) {
          console.warn('Skipping bp record:', rec.id, error);
        }
      }
      // 日課フィールド
      for (const field of data.dailyFields) {
        try {
          await addDailyField(field);
        } catch (error) {
          console.warn('Skipping daily field:', field.fieldId, error);
        }
      }
      // 日課レコード
      for (const rec of data.dailyRecords) {
        try {
          // valueが0, 0.5, 1以外の場合は0に矯正し、型を明示
          let safeValue: 0 | 0.5 | 1 = 0;
          if (rec.value === 1) safeValue = 1;
          else if (rec.value === 0.5) safeValue = 0.5;
          // それ以外は0
          const { id, date, fieldId } = rec;
          await addDailyRecord({ id, date, fieldId, value: safeValue });
          importCount++;
        } catch (error) {
          console.warn('Skipping daily record:', rec.id, error);
        }
      }

      setImportStatus(`✅ ${importCount}件のデータをインポートしました`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error('Unknown error');
      console.error('Import error:', errorInstance);
      setImportStatus(
        `❌ データのインポートに失敗しました: ${errorInstance.message}`
      );
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.json')) {
        setImportStatus('サポートされていないファイル形式です');
        setTimeout(() => setImportStatus(null), 3000);
        event.target.value = '';
        return;
      }
      handleImport(file);
    }
    event.target.value = '';
  };

  const handleDeleteAllData = async () => {
    const isConfirmed = window.confirm(
      'すべてのデータを削除してもよろしいですか？'
    );

    if (isConfirmed) {
      const doubleConfirm = window.confirm(
        '本当に削除してもよろしいですか？この操作は元に戻せません。'
      );

      if (doubleConfirm) {
        try {
          await deleteAllData();

          alert('すべてのデータを削除しました');
        } catch (error) {
          console.error('Delete error:', error);
          alert('データの削除に失敗しました');
        }
      }
    }
  };

  // 体重専用テストデータ生成関数
  const generateWeightTestData = async () => {
    setTestDataStatus('体重テストデータを生成中...');
    setIsGeneratingTestData(true);
    setTestDataProgress(0);
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
        const randomDelta = (Math.random() - 0.5) * 2; // -2〜+2kg（1日あたりの変化幅を±2に制限）
        let weight = baseWeight - trend + randomDelta;
        weight = Math.max(
          minWeight,
          Math.min(maxWeight, Math.round(weight * 10) / 10)
        );
        // 一意なIDを生成
        const uniqueId = `test_weight_${dateStr}_${Math.random()
          .toString(36)
          .substr(2, 6)}`;
        const testRecord = {
          id: uniqueId,
          date: dateStr,
          time: timeStr,
          weight: weight,
          bodyFat:
            Math.random() > 0.2
              ? Math.round((15 + Math.random() * 20) * 10) / 10
              : null, // 15〜35%くらい
          waist:
            Math.random() > 0.2
              ? Math.round((65 + Math.random() * 25) * 10) / 10
              : null, // 65〜90cmくらい
          note: Math.random() > 0.7 ? 'テストメモ' : null,
          excludeFromGraph: Math.random() > 0.5 ? true : false,
        };
        try {
          await addWeightRecord(testRecord);
          createdCount++;
        } catch (error) {
          console.warn(
            '体重テストレコードの追加をスキップ:',
            testRecord.id,
            error
          );
        }
        // 進捗を更新
        const progress = ((daysBack - i + 1) / daysBack) * 100;
        setTestDataProgress(progress);
        if ((daysBack - i + 1) % 10 === 0) {
          setTestDataStatus(
            `体重テストデータを生成中... ${daysBack - i + 1}/${daysBack}`
          );
        }
      }

      setTestDataStatus(`✅ 体重テストデータ${createdCount}件を生成しました`);
      setTimeout(() => {
        setTestDataStatus(null);
        setTestDataProgress(0);
      }, 3000);
    } catch (error) {
      console.error('体重テストデータ生成エラー:', error);
      setTestDataStatus(
        `❌ 体重テストデータの生成に失敗しました: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      setTimeout(() => {
        setTestDataStatus(null);
        setTestDataProgress(0);
      }, 5000);
    } finally {
      setIsGeneratingTestData(false);
    }
  };

  const handleGenerateWeightTestData = () => {
    const isConfirmed = window.confirm(
      '本当に体重テストデータを生成してもよろしいですか？'
    );
    if (isConfirmed) {
      generateWeightTestData();
    }
  };

  // 日課テストデータ生成関数（V2）
  const generateDailyTestData = async () => {
    setTestDataStatus('日課テストデータを生成中...');
    setIsGeneratingTestData(true);
    setTestDataProgress(0);
    try {
      const dataCount = 100;
      let createdCount = 0;
      const fieldIds = ['exercise', 'meal', 'sleep'];
      for (let i = 0; i < dataCount; i++) {
        // ランダムな日付
        const randomDaysAgo = Math.floor(Math.random() * 180);
        const date = new Date();
        date.setDate(date.getDate() - randomDaysAgo);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        for (const fieldId of fieldIds) {
          // ランダムな値（0 or 1）
          const value = Math.random() > 0.5 ? 1 : 0;
          const uniqueId = `test_daily_${fieldId}_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          const testRecord = {
            id: uniqueId,
            date: dateStr,
            fieldId: fieldId,
            value: value as 0 | 0.5 | 1,
          };
          try {
            await addDailyRecord(testRecord);
            createdCount++;
          } catch (error) {
            console.warn(
              '日課テストレコードの追加をスキップ:',
              testRecord.id,
              error
            );
          }
        }
        const progress = ((i + 1) / dataCount) * 100;
        setTestDataProgress(progress);
        if ((i + 1) % 10 === 0) {
          setTestDataStatus(
            `日課テストデータを生成中... ${(i + 1) * fieldIds.length}/${
              dataCount * fieldIds.length
            }`
          );
        }
      }
      setTestDataStatus(`✅ 日課テストデータ${createdCount}件を生成しました`);
      setTimeout(() => {
        setTestDataStatus(null);
        setTestDataProgress(0);
      }, 3000);
    } catch (error) {
      console.error('日課テストデータ生成エラー:', error);
      setTestDataStatus(
        `❌ 日課テストデータの生成に失敗しました: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      setTimeout(() => {
        setTestDataStatus(null);
        setTestDataProgress(0);
      }, 5000);
    } finally {
      setIsGeneratingTestData(false);
    }
  };

  const handleGenerateDailyTestData = () => {
    const isConfirmed = window.confirm(
      '本当に日課テストデータを生成してもよろしいですか？'
    );
    if (isConfirmed) {
      generateDailyTestData();
    }
  };

  // 血圧テストデータ生成関数（V2）
  const generateBpTestData = async () => {
    setTestDataStatus('血圧テストデータを生成中...');
    setIsGeneratingTestData(true);
    setTestDataProgress(0);
    try {
      const dataCount = 100;
      let createdCount = 0;
      for (let i = 0; i < dataCount; i++) {
        // ランダムな日付
        const randomDaysAgo = Math.floor(Math.random() * 180);
        const date = new Date();
        date.setDate(date.getDate() - randomDaysAgo);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        // ランダムな時刻
        const hours = Math.floor(Math.random() * 24);
        const minutes = Math.floor(Math.random() * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}`;
        // ランダムな血圧値
        const systolic = Math.round(90 + Math.random() * 60); // 90-150
        const diastolic = Math.round(60 + Math.random() * 40); // 60-100
        const heartRate = Math.round(60 + Math.random() * 60); // 60-120
        const uniqueId = `test_bp_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const testRecord = {
          id: uniqueId,
          date: dateStr,
          time: timeStr,
          systolic,
          diastolic,
          heartRate,
        };
        try {
          await addBpRecord(testRecord);
          createdCount++;
        } catch (error) {
          console.warn(
            '血圧テストレコードの追加をスキップ:',
            testRecord.id,
            error
          );
        }
        const progress = ((i + 1) / dataCount) * 100;
        setTestDataProgress(progress);
        if ((i + 1) % 10 === 0) {
          setTestDataStatus(
            `血圧テストデータを生成中... ${i + 1}/${dataCount}`
          );
        }
      }
      setTestDataStatus(`✅ 血圧テストデータ${createdCount}件を生成しました`);
      setTimeout(() => {
        setTestDataStatus(null);
        setTestDataProgress(0);
      }, 3000);
    } catch (error) {
      console.error('血圧テストデータ生成エラー:', error);
      setTestDataStatus(
        `❌ 血圧テストデータの生成に失敗しました: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      setTimeout(() => {
        setTestDataStatus(null);
        setTestDataProgress(0);
      }, 5000);
    } finally {
      setIsGeneratingTestData(false);
    }
  };

  const handleGenerateBpTestData = () => {
    const isConfirmed = window.confirm(
      '本当に血圧テストデータを生成してもよろしいですか？'
    );
    if (isConfirmed) {
      generateBpTestData();
    }
  };

  return (
    <div className="max-w-full sm:max-w-4xl mx-auto sm:px-0">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          データの詳細
        </h2>
        <div className="text-base text-gray-600 dark:text-gray-300 space-y-3">
          <p className="flex items-center gap-2">
            <HiChartBarSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <strong className="text-gray-800 dark:text-white">
              体重レコード数
            </strong>{' '}
            {weightCount}
            <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
              {weightPeriod}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <HiChartBarSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <strong className="text-gray-800 dark:text-white">
              日課レコード数
            </strong>{' '}
            {dailyCount}
            <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
              {dailyPeriod}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <HiChartBarSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <strong className="text-gray-800 dark:text-white">
              血圧レコード数
            </strong>{' '}
            {bpCount}
            <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
              {bpPeriod}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          データのエクスポート
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          体重・血圧・日課（記録・項目）すべてを1つのJSONファイル（V2形式）でエクスポートします。
        </div>
        <div className="flex flex-col gap-4 mb-6">
          <Button
            variant="purple"
            size="lg"
            icon={HiDocument}
            onClick={handleExportJSON}
            fullWidth={false}
            data-testid="download-json-btn"
          >
            JSON形式でエクスポート
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          データのインポート
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          体重・血圧・日課（記録・項目）すべてを1つのJSONファイル（V2形式）でインポートします。
        </div>

        {importStatus && (
          <div className="mb-6">
            {importStatus.includes('✅') && (
              <SuccessMessage message={importStatus.replace('✅ ', '')} />
            )}
            {importStatus.includes('❌') && (
              <ErrorMessage message={importStatus.replace('❌ ', '')} />
            )}
            {!importStatus.includes('✅') && !importStatus.includes('❌') && (
              <InfoMessage message={importStatus} />
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 mb-6">
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="data-import"
            />
            <label
              htmlFor="data-import"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-purple-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-auto cursor-pointer"
            >
              <HiArrowDownTray className="w-5 h-5" />
              ファイルを選択
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
          TIPS
        </h2>
        <Button
          variant="purple"
          size="lg"
          icon={HiSparkles}
          onClick={() => showTipsModal && showTipsModal()}
          fullWidth={true}
        >
          TIPSを表示
        </Button>
      </div>

      {/* テストデータ生成セクション（開発環境のみ表示） */}
      {isDev && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-dashed border-purple-400 dark:border-purple-500 rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-purple-800 dark:text-purple-400 mb-6">
            テストデータ生成（開発環境専用）
          </h2>
          <div className="text-sm text-purple-700 dark:text-purple-300 mb-6">
            テストデータを生成してデータベースに追加します。
          </div>

          {testDataStatus && (
            <div className="mb-6">
              {testDataStatus.includes('✅') && (
                <SuccessMessage message={testDataStatus.replace('✅ ', '')} />
              )}
              {testDataStatus.includes('❌') && (
                <ErrorMessage message={testDataStatus.replace('❌ ', '')} />
              )}
              {!testDataStatus.includes('✅') &&
                !testDataStatus.includes('❌') && (
                  <InfoMessage message={testDataStatus} />
                )}
            </div>
          )}

          {isGeneratingTestData && (
            <div className="mb-6">
              <ProgressBar
                value={testDataProgress}
                label="テストデータを生成中..."
                showPercentage={true}
                variant="primary"
                size="md"
              />
            </div>
          )}

          <div className="flex flex-col gap-4 mb-6">
            <Button
              variant="purple"
              size="lg"
              icon={HiSparkles}
              onClick={handleGenerateWeightTestData}
              fullWidth={false}
              disabled={isGeneratingTestData}
              loading={isGeneratingTestData}
            >
              体重テストデータ生成
            </Button>
            <Button
              variant="purple"
              size="lg"
              icon={HiSparkles}
              onClick={handleGenerateDailyTestData}
              fullWidth={false}
              disabled={isGeneratingTestData}
              loading={isGeneratingTestData}
            >
              日課テストデータ生成
            </Button>
            <Button
              variant="purple"
              size="lg"
              icon={HiSparkles}
              onClick={handleGenerateBpTestData}
              fullWidth={false}
              disabled={isGeneratingTestData}
              loading={isGeneratingTestData}
            >
              血圧テストデータ生成
            </Button>
          </div>
        </div>
      )}

      {/* エラーテストUIセクション */}
      {isDev && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-dashed border-orange-200 dark:border-orange-700 rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-orange-800 dark:text-orange-400 mb-6 flex items-center gap-2">
            <HiExclamationTriangle className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            エラーテスト（開発環境のみ）
          </h2>
          <div className="mb-6 text-left">
            <p className="text-base text-orange-700 dark:text-orange-300 mb-3">
              下のボタンを押すと、強制的にエラーが発生し、アプリ全体のエラーダイアログが表示されます。
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              ※自動リトライや試行回数のデモは廃止されました。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setErrorToThrow(
                  new Error(
                    'テスト用レンダリングエラー: コンポーネントでエラーが発生しました'
                  )
                );
              }}
              fullWidth={false}
            >
              💥 レンダリングエラー
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setErrorToThrow(
                  new Error(
                    'テスト用型エラー: undefined プロパティアクセスエラー'
                  )
                );
              }}
              fullWidth={false}
            >
              🚫 型エラー
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                const asyncError = async () => {
                  await new Promise((_, reject) => {
                    setTimeout(
                      () =>
                        reject(
                          new Error(
                            'テスト用非同期エラー: Promise が拒否されました'
                          )
                        ),
                      100
                    );
                  });
                };
                asyncError().catch(error => {
                  setErrorToThrow(error);
                });
              }}
              fullWidth={false}
            >
              ⏰ 非同期エラー
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                try {
                  JSON.parse('{ invalid json syntax }');
                } catch (error) {
                  setErrorToThrow(
                    new Error(
                      `テスト用JSONパースエラー: ${
                        error instanceof Error ? error.message : '不明なエラー'
                      }`
                    )
                  );
                }
              }}
              fullWidth={false}
            >
              📝 JSONエラー
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setErrorToThrow(
                  new Error(
                    'テスト用メモリエラー: 大量のデータ処理中にエラーが発生しました'
                  )
                );
              }}
              fullWidth={false}
            >
              🧠 メモリエラー
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setErrorToThrow(
                  new Error(
                    'テスト用スタックオーバーフローエラー: 無限再帰呼び出しが発生しました'
                  )
                );
              }}
              fullWidth={false}
            >
              ♾️ スタックオーバーフロー
            </Button>
          </div>
        </div>
      )}

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-red-800 dark:text-red-400 mb-6 flex items-center gap-2">
          <HiExclamationTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
          危険ゾーン
        </h2>
        <div className="mb-6 text-left">
          <p className="text-base text-red-700 dark:text-red-300 mb-3">
            すべてのデータを削除してもよろしいですか？この操作は元に戻せません。
          </p>
        </div>
        <Button
          variant="danger"
          size="lg"
          icon={HiTrash}
          onClick={handleDeleteAllData}
          fullWidth={false}
        >
          すべてのデータを削除
        </Button>
      </div>
    </div>
  );
}
