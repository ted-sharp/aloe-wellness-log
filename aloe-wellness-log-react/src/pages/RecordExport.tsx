import React, { useEffect, useState } from 'react';
import {
  HiArrowDownTray,
  HiCalendarDays,
  HiChartBarSquare,
  HiClipboardDocumentList,
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
import { useI18n } from '../hooks/useI18n';
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';
import { isDev } from '../utils/devTools';
import {
  performanceMonitor,
  trackDatabaseOperation,
} from '../utils/performanceMonitor';

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

export default function RecordExport() {
  const { t } = useI18n();
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

  // データ読み込み（パフォーマンス監視付き）
  useEffect(() => {
    const loadData = async () => {
      try {
        await trackDatabaseOperation(
          'load-fields-export',
          async _operationId => {
            await loadFields();
          }
        );

        await trackDatabaseOperation(
          'load-records-export',
          async _operationId => {
            await loadRecords();
          }
        );
      } catch (error) {
        console.error('Data loading error:', error);
      }
    };

    loadData();
  }, [loadFields, loadRecords]);

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
    const csv = toCSV(sortedRecords, fields, t);
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
        if (record.value === t('fields.yes') || record.value === 'あり') {
          record.value = true;
        } else if (record.value === t('fields.no') || record.value === 'なし') {
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
    setImportStatus(t('pages.export.importing'));

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
      setImportStatus(`✅ ${importCount}${t('pages.export.importSuccess')}`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error('Unknown error');
      console.error('Import error:', errorInstance);

      setImportStatus(
        `${t('pages.export.importError')} ${errorInstance.message}`
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
        setImportStatus(t('pages.export.unsupportedFileFormat'));
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
    const isConfirmed = window.confirm(t('pages.export.confirmDeleteAll'));

    if (isConfirmed) {
      const doubleConfirm = window.confirm(
        t('pages.export.confirmDeleteAllFinal')
      );

      if (doubleConfirm) {
        try {
          await deleteAllData();
          // 初期項目を再度作成
          await initializeFields();
          alert(t('pages.export.deleteAllSuccess'));
        } catch (error) {
          console.error('Delete error:', error);
          alert(t('pages.export.deleteAllError'));
        }
      }
    }
  };

  // テストデータ生成関数
  const generateTestData = async () => {
    setTestDataStatus(t('pages.export.generatingTestData'));
    setIsGeneratingTestData(true);
    setTestDataProgress(0);

    try {
      await loadFields(); // 最新の項目を取得

      if (fields.length === 0) {
        throw new Error('No fields exist. Please initialize fields first.');
      }

      const dataCount = 100; // 生成するデータ数
      const daysBack = 30; // 過去30日分
      let createdCount = 0;

      for (let i = 0; i < dataCount; i++) {
        // ランダムな日付を生成（過去30日以内）
        const randomDaysAgo = Math.floor(Math.random() * daysBack);
        const date = new Date();
        date.setDate(date.getDate() - randomDaysAgo);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // ランダムな時刻を生成
        const hours = Math.floor(Math.random() * 24);
        const minutes = Math.floor(Math.random() * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}`;
        const datetimeStr = `${dateStr} ${timeStr}`;

        // ランダムな項目を選択
        const randomField = fields[Math.floor(Math.random() * fields.length)];

        // 項目の型に応じてランダムな値を生成
        let value: string | number | boolean;

        if (randomField.type === 'boolean') {
          value = Math.random() > 0.5;
        } else if (randomField.type === 'number') {
          // 項目に応じて適切な数値範囲を設定
          if (randomField.fieldId === 'weight') {
            value = Math.round((50 + Math.random() * 50) * 10) / 10; // 50-100kg
          } else if (randomField.fieldId === 'systolic_bp') {
            value = Math.round(90 + Math.random() * 60); // 90-150mmHg
          } else if (randomField.fieldId === 'diastolic_bp') {
            value = Math.round(60 + Math.random() * 40); // 60-100mmHg
          } else if (randomField.fieldId === 'heart_rate') {
            value = Math.round(60 + Math.random() * 60); // 60-120bpm
          } else if (randomField.fieldId === 'body_temperature') {
            value = Math.round((35.5 + Math.random() * 2) * 10) / 10; // 35.5-37.5℃
          } else {
            value = Math.round(Math.random() * 100 * 10) / 10; // デフォルト: 0-100
          }
        } else {
          // string型の場合
          if (randomField.fieldId === 'notes') {
            const sampleNotes = [
              'Feeling good today',
              'A bit tired',
              'Refreshed after exercise',
              'Food was delicious',
              'Want to sleep early',
              'Great weather, feeling refreshed',
              'Busy day at work',
              'Nice weekend break',
              '',
            ];
            value = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
          } else {
            value = `Test value ${Math.floor(Math.random() * 1000)}`;
          }
        }

        // 一意なIDを生成
        const uniqueId = `test_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        const testRecord = {
          id: uniqueId,
          date: dateStr,
          time: timeStr,
          datetime: datetimeStr,
          fieldId: randomField.fieldId,
          value: value,
        };

        try {
          await addRecord(testRecord);
          createdCount++;
        } catch (error) {
          console.warn('テストレコードの追加をスキップ:', testRecord.id, error);
        }

        // 進捗を更新
        const progress = ((i + 1) / dataCount) * 100;
        setTestDataProgress(progress);

        // 進捗を表示（10件ごと）
        if ((i + 1) % 10 === 0) {
          setTestDataStatus(
            `${t('pages.export.generatingTestData')}... ${i + 1}${t(
              'pages.export.testDataOf'
            )}${dataCount}`
          );
        }
      }

      await loadRecords();
      setTestDataStatus(
        `✅ ${createdCount}${t('pages.export.testDataSuccess')}`
      );
      setTimeout(() => {
        setTestDataStatus(null);
        setTestDataProgress(0);
      }, 3000);
    } catch (error) {
      console.error('Test data generation error:', error);
      setTestDataStatus(
        `${t('pages.export.testDataError')} ${
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

  const handleGenerateTestData = () => {
    const isConfirmed = window.confirm(
      t('pages.export.confirmGenerateTestData')
    );

    if (isConfirmed) {
      generateTestData();
    }
  };

  return (
    <div className="max-w-full sm:max-w-4xl mx-auto px-2 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-12">
        {t('pages.export.title')}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          {t('pages.export.dataDetails')}
        </h2>
        <div className="text-base text-gray-600 dark:text-gray-300 space-y-3">
          <p className="flex items-center gap-2">
            <HiChartBarSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <strong className="text-gray-800 dark:text-white">
              {t('pages.export.totalRecords')}
            </strong>{' '}
            {sortedRecords.length}
          </p>
          <p className="flex items-center gap-2">
            <HiCalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <strong className="text-gray-800 dark:text-white">
              {t('pages.export.period')}
            </strong>{' '}
            {sortedRecords.length > 0
              ? `${sortedRecords[sortedRecords.length - 1]?.date} 〜 ${
                  sortedRecords[0]?.date
                }`
              : t('pages.export.noData')}
          </p>
          <p className="flex items-center gap-2">
            <HiClipboardDocumentList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <strong className="text-gray-800 dark:text-white">
              {t('pages.export.fields')}
            </strong>{' '}
            {t('pages.export.allHealthFields')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          {t('pages.export.exportData')}
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {t('pages.export.exportDescription')}
        </div>
        <div className="flex flex-col gap-4 mb-6">
          <Button
            variant="purple"
            size="lg"
            icon={HiDocument}
            onClick={handleExportCSV}
            fullWidth={false}
          >
            {t('pages.export.exportCSV')}
          </Button>
          <Button
            variant="purple"
            size="lg"
            icon={HiDocument}
            onClick={handleExportJSON}
            fullWidth={false}
          >
            {t('pages.export.exportJSON')}
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          {t('pages.export.importData')}
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {t('pages.export.importDescription')}
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
              {t('pages.export.selectFile')}
            </label>
          </div>
        </div>
      </div>

      {/* テストデータ生成セクション（開発環境のみ表示） */}
      {isDev && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-dashed border-purple-400 dark:border-purple-500 rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-purple-800 dark:text-purple-400 mb-6">
            {t('pages.export.testData')}（開発環境専用）
          </h2>
          <div className="text-sm text-purple-700 dark:text-purple-300 mb-6">
            {t('pages.export.testDataDescription')}
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
                label={t('pages.export.generatingTestData')}
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
              onClick={handleGenerateTestData}
              fullWidth={false}
              disabled={isGeneratingTestData}
              loading={isGeneratingTestData}
            >
              {t('pages.export.generateTestData')}
            </Button>
          </div>
        </div>
      )}

      {/* エラーテストUIセクション */}
      {isDev && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-dashed border-orange-200 dark:border-orange-700 rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-orange-800 dark:text-orange-400 mb-6 flex items-center gap-2">
            <HiExclamationTriangle className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            {t(
              'pages.export.errorTestTitle',
              '🐛 エラーダイアログテスト (開発環境のみ)'
            )}
          </h2>
          <div className="mb-6 text-left">
            <p className="text-base text-orange-700 dark:text-orange-300 mb-3">
              {t(
                'pages.export.errorTestDescription',
                '下のボタンを押すと、強制的にエラーが発生し、アプリ全体のエラーダイアログが表示されます。'
              )}
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {t(
                'pages.export.errorTestNote',
                '※自動リトライや試行回数のデモは廃止されました。'
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setErrorToThrow(
                  new Error(
                    t(
                      'pages.export.errorTestRender',
                      'テスト用レンダリングエラー: コンポーネントでエラーが発生しました'
                    )
                  )
                );
              }}
              fullWidth={false}
            >
              {t('pages.export.errorTestRenderBtn', '💥 レンダリングエラー')}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setErrorToThrow(
                  new Error(
                    t(
                      'pages.export.errorTestType',
                      'テスト用型エラー: undefined プロパティアクセスエラー'
                    )
                  )
                );
              }}
              fullWidth={false}
            >
              {t('pages.export.errorTestTypeBtn', '🚫 型エラー')}
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
                            t(
                              'pages.export.errorTestAsync',
                              'テスト用非同期エラー: Promise が拒否されました'
                            )
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
              {t('pages.export.errorTestAsyncBtn', '⏰ 非同期エラー')}
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
                      t(
                        'pages.export.errorTestJson',
                        `テスト用JSONパースエラー: ${
                          error instanceof Error
                            ? error.message
                            : '不明なエラー'
                        }`
                      )
                    )
                  );
                }
              }}
              fullWidth={false}
            >
              {t('pages.export.errorTestJsonBtn', '📝 JSONエラー')}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setErrorToThrow(
                  new Error(
                    t(
                      'pages.export.errorTestMemory',
                      'テスト用メモリエラー: 大量のデータ処理中にエラーが発生しました'
                    )
                  )
                );
              }}
              fullWidth={false}
            >
              {t('pages.export.errorTestMemoryBtn', '🧠 メモリエラー')}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setErrorToThrow(
                  new Error(
                    t(
                      'pages.export.errorTestStack',
                      'テスト用スタックオーバーフローエラー: 無限再帰呼び出しが発生しました'
                    )
                  )
                );
              }}
              fullWidth={false}
            >
              {t('pages.export.errorTestStackBtn', '♾️ スタックオーバーフロー')}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-red-800 dark:text-red-400 mb-6 flex items-center gap-2">
          <HiExclamationTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
          {t('pages.export.dangerZone')}
        </h2>
        <div className="mb-6 text-left">
          <p className="text-base text-red-700 dark:text-red-300 mb-3">
            {t('pages.export.dangerZoneDescription')}
          </p>
        </div>
        <Button
          variant="danger"
          size="lg"
          icon={HiTrash}
          onClick={handleDeleteAllData}
          fullWidth={false}
        >
          {t('pages.export.deleteAllData')}
        </Button>
      </div>
    </div>
  );
}
