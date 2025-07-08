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
  migrateDailyRecordsV1ToV2,
  migrateWeightRecordsV1ToV2,
} from '../db/indexedDb';
import { useRecordsStore } from '../store/records';
import type { DailyFieldV2, DailyRecordV2, RecordItem } from '../types/record';
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

function toCSV(
  records: RecordItem[],
  fields: { fieldId: string; name: string }[],
  t: (key: string) => string
) {
  const header = [
    'id',
    'date',
    'time',
    'datetime',
    'fieldId',
    'fieldName',
    'value',
  ];
  const rows = records.map(rec => {
    const field = fields.find(f => f.fieldId === rec.fieldId);
    return [
      rec.id,
      rec.date,
      rec.time,
      rec.datetime,
      rec.fieldId,
      field ? field.name : '',
      typeof rec.value === 'boolean'
        ? rec.value
          ? t('fields.yes')
          : t('fields.no')
        : rec.value,
    ];
  });
  return [header, ...rows]
    .map(row =>
      row
        .map(String)
        .map(s => `"${s.replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\r\n');
}

export default function RecordExport({
  showTipsModal,
}: {
  showTipsModal?: () => void;
}) {
  const {
    records,
    fields,
    loadRecords,
    loadFields,
    deleteAllData,
    initializeFields,
    addRecord,
  } = useRecordsStore();
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [testDataStatus, setTestDataStatus] = useState<string | null>(null);
  const [testDataProgress, setTestDataProgress] = useState<number>(0);
  const [isGeneratingTestData, setIsGeneratingTestData] =
    useState<boolean>(false);

  // エラーテスト用の状態
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);

  // 日課データ移行処理
  const [migrateStatus, setMigrateStatus] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

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
      console.log(`📊 Total Records: ${records.length}`);
      console.log(`📊 Total Fields: ${fields.length}`);
      console.log(`📊 Import Status: ${importStatus || 'none'}`);
      console.log(`📊 Test Data Status: ${testDataStatus || 'none'}`);
      console.log(`📊 Test Data Progress: ${testDataProgress}%`);
      console.log(`📊 Is Generating: ${isGeneratingTestData}`);
      console.groupEnd();
    };

    const timeout = setTimeout(logPerformanceInfo, 2000);
    return () => clearTimeout(timeout);
  }, [
    records.length,
    fields.length,
    importStatus,
    testDataStatus,
    testDataProgress,
    isGeneratingTestData,
  ]);

  // 日付・時刻で降順ソート（新しい順）（パフォーマンス監視付き）
  const sortedRecords = (() => {
    const startTime = performance.now();
    const result = [...records].sort((a, b) => {
      const aKey = `${a.date} ${a.time}`;
      const bKey = `${b.date} ${b.time}`;
      return bKey.localeCompare(aKey);
    });

    const duration = performance.now() - startTime;
    if (isDev && duration > 10) {
      console.warn(
        `🐌 Slow record sorting: ${duration.toFixed(2)}ms for ${
          records.length
        } records`
      );
    }

    return result;
  })();

  const handleExportCSV = () => {
    const csv = toCSV(sortedRecords, fields, t => t);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `records-${formatDateForFilename(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(sortedRecords, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `records-${formatDateForFilename(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSVパース関数
  const parseCSV = (csvText: string): RecordItem[] => {
    // 改行文字を統一（\r\n や \r を \n に統一）
    const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.trim().split('\n');

    if (lines.length < 2)
      throw new Error('CSVファイルが空または形式が正しくありません');

    // CSVの行をパースする関数（カンマ区切りだがダブルクォート内のカンマは無視）
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;

      while (i < line.length) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // エスケープされたダブルクォート
            current += '"';
            i += 2;
          } else {
            // クォートの開始または終了
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          // カンマ区切り（クォート外）
          result.push(current);
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }

      result.push(current);
      return result;
    };

    const header = parseCSVLine(lines[0]);

    const expectedHeader = [
      'id',
      'date',
      'time',
      'datetime',
      'fieldId',
      'fieldName',
      'value',
    ];

    if (!expectedHeader.every(col => header.includes(col))) {
      console.error('Expected headers:', expectedHeader);
      console.error('Actual headers:', header);
      throw new Error(
        `CSV file format is incorrect. Required columns: ${expectedHeader.join(
          ', '
        )}`
      );
    }

    const records: RecordItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        // 空行をスキップ
        if (!lines[i].trim()) continue;

        const values = parseCSVLine(lines[i]);

        // 列数チェック
        if (values.length !== header.length) {
          console.warn(
            `Row ${i}: 列数が一致しません (expected: ${header.length}, actual: ${values.length})`
          );
          continue;
        }

        const record: RecordItem = {
          id: values[header.indexOf('id')],
          date: values[header.indexOf('date')],
          time: values[header.indexOf('time')],
          datetime: values[header.indexOf('datetime')],
          fieldId: values[header.indexOf('fieldId')],
          value: values[header.indexOf('value')],
        };

        // 必須フィールドのチェック
        if (!record.id || !record.date || !record.time || !record.fieldId) {
          console.warn(`Row ${i}: 必須項目が不足`, record);
          continue;
        }

        // boolean値の変換
        if (record.value === 'yes' || record.value === 'あり') {
          record.value = true;
        } else if (record.value === 'no' || record.value === 'なし') {
          record.value = false;
        } else if (!isNaN(Number(record.value)) && record.value !== '') {
          record.value = Number(record.value);
        }

        records.push(record);
      } catch (error) {
        console.error(`Row ${i} parsing error:`, error);
        throw new Error(
          `${i}行目の処理でエラーが発生しました: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`
        );
      }
    }

    return records;
  };

  // インポート処理
  const handleImport = async (file: File, format: 'csv' | 'json') => {
    setImportStatus('データをインポート中...');

    try {
      const text = await file.text();
      let records: RecordItem[];

      if (format === 'json') {
        records = JSON.parse(text);
        if (!Array.isArray(records)) {
          throw new Error('JSON file format is incorrect');
        }
      } else {
        records = parseCSV(text);
      }

      // データ検証
      for (const record of records) {
        if (!record.id || !record.date || !record.time || !record.fieldId) {
          throw new Error('Data is missing required fields');
        }
      }

      // インポート実行
      let importCount = 0;
      for (const record of records) {
        try {
          await addRecord(record);
          importCount++;
        } catch (error) {
          console.warn('Skipping record addition:', record.id, error);
        }
      }

      await loadRecords();
      setImportStatus(`✅ ${importCount}データをインポートしました`);
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
      // 拡張子で自動判別
      const fileName = file.name.toLowerCase();
      let format: 'csv' | 'json';

      if (fileName.endsWith('.csv')) {
        format = 'csv';
      } else if (fileName.endsWith('.json')) {
        format = 'json';
      } else {
        setImportStatus('サポートされていないファイル形式です');
        setTimeout(() => setImportStatus(null), 3000);
        event.target.value = '';
        return;
      }

      handleImport(file, format);
    }
    // input要素をリセット
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
          // 初期項目を再度作成
          await initializeFields();
          await loadFields();
          await loadRecords();
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
      await loadFields();
      const weightField = fields.find(
        f => f.fieldId === 'weight' && f.defaultDisplay !== false
      );
      if (!weightField) {
        throw new Error('体重フィールドが見つかりません。');
      }
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
        const datetimeStr = `${dateStr}T${timeStr}:00`;
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
      await loadRecords();
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
      await loadFields();
      const dailyFields = fields.filter(f => f.scope === 'daily');
      if (dailyFields.length === 0) {
        throw new Error('日課フィールドが見つかりません。');
      }
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
        // ランダムなフィールド
        const randomField =
          dailyFields[Math.floor(Math.random() * dailyFields.length)];
        // ランダムな値（0 or 1）
        const value = Math.random() > 0.5 ? 1 : 0;
        const uniqueId = `test_daily_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const testRecord = {
          id: uniqueId,
          date: dateStr,
          fieldId: randomField.fieldId,
          value,
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
        const progress = ((i + 1) / dataCount) * 100;
        setTestDataProgress(progress);
        if ((i + 1) % 10 === 0) {
          setTestDataStatus(
            `日課テストデータを生成中... ${i + 1}/${dataCount}`
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

  // 日課データ移行処理
  const handleMigrateDaily = async () => {
    setMigrateStatus('日課データを移行中...');
    setIsMigrating(true);
    try {
      // 既存のdaily系フィールドを抽出
      const dailyFields = fields.filter(f => f.scope === 'daily');
      // V2フィールド型に変換
      const v2Fields: DailyFieldV2[] = dailyFields.map(f => ({
        fieldId: f.fieldId,
        name: f.name,
        order: f.order ?? 0,
        display: f.defaultDisplay !== false,
      }));
      // 既存のdailyレコードを抽出
      const dailyFieldIds = new Set(v2Fields.map(f => f.fieldId));
      const dailyRecords = records.filter(r => dailyFieldIds.has(r.fieldId));
      // V2レコード型に変換（boolean→number変換）
      const v2Records: DailyRecordV2[] = dailyRecords.map(r => ({
        id: r.id,
        date: r.date,
        fieldId: r.fieldId,
        value:
          typeof r.value === 'boolean'
            ? r.value
              ? 1
              : 0
            : Number(r.value) || 0,
      }));
      // 既存V2フィールド・レコードを一旦全削除（重複防止）
      const oldFields = await getAllDailyFields();
      for (const f of oldFields)
        await addDailyField({ ...f, name: f.name + ' (old)', display: false });
      const oldRecords = await getAllDailyRecords();
      for (const r of oldRecords)
        await addDailyRecord({ ...r, id: r.id + '_old' });
      // V2フィールド・レコードを追加
      for (const f of v2Fields) await addDailyField(f);
      for (const r of v2Records) await addDailyRecord(r);
      setMigrateStatus(
        `✅ 日課フィールド${v2Fields.length}件・レコード${v2Records.length}件を移行しました`
      );
      setTimeout(() => setMigrateStatus(null), 4000);
    } catch (error) {
      setMigrateStatus(
        `❌ 移行失敗: ${error instanceof Error ? error.message : error}`
      );
      setTimeout(() => setMigrateStatus(null), 5000);
    } finally {
      setIsMigrating(false);
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
          データをCSVまたはJSON形式でエクスポートします。
        </div>
        <div className="flex flex-col gap-4 mb-6">
          <Button
            variant="purple"
            size="lg"
            icon={HiDocument}
            onClick={handleExportCSV}
            fullWidth={false}
            data-testid="download-csv-btn"
          >
            CSV形式でエクスポート
          </Button>
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
          データをCSVまたはJSON形式でインポートします。
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
              accept=".csv,.json"
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

      {/* 体重データV2移行ボタン（管理者用・最下部） */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl shadow-md p-6 mt-8">
        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2">
          <HiSparkles className="w-5 h-5 text-blue-600 dark:text-blue-500" />
          データV2移行（管理者用）
        </h2>
        <div className="mb-4 text-left">
          <p className="text-base text-blue-700 dark:text-blue-300 mb-2">
            既存の体重データ（V1）・日課データ（V1）を新しいテーブル（V2）へ一括移行します。
            <br />
            ※通常利用時は不要です。管理者のみご利用ください。
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="primary"
            size="lg"
            icon={HiSparkles}
            onClick={async () => {
              const count = await migrateWeightRecordsV1ToV2();
              window.alert(`体重データ移行が完了しました（${count}件）`);
            }}
            fullWidth={false}
          >
            体重データV2へ移行（管理者用）
          </Button>
          <Button
            variant="teal"
            size="lg"
            icon={HiSparkles}
            onClick={async () => {
              const count = await migrateDailyRecordsV1ToV2();
              window.alert(`日課データ移行が完了しました（${count}件）`);
            }}
            fullWidth={false}
          >
            日課データV2へ移行（管理者用）
          </Button>
        </div>
        {migrateStatus && (
          <div className="mt-2">
            {migrateStatus.includes('✅') ? (
              <SuccessMessage message={migrateStatus.replace('✅ ', '')} />
            ) : migrateStatus.includes('❌') ? (
              <ErrorMessage message={migrateStatus.replace('❌ ', '')} />
            ) : (
              <InfoMessage message={migrateStatus} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
