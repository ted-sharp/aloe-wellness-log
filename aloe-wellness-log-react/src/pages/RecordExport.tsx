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
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';

function formatDateForFilename(date: Date) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 15);
}

function toCSV(
  records: RecordItem[],
  fields: { fieldId: string; name: string }[]
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
          ? 'あり'
          : 'なし'
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

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // 日付・時刻で降順ソート（新しい順）
  const sortedRecords = [...records].sort((a, b) => {
    const aKey = `${a.date} ${a.time}`;
    const bKey = `${b.date} ${b.time}`;
    return bKey.localeCompare(aKey);
  });

  const handleExportCSV = () => {
    const csv = toCSV(sortedRecords, fields);
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
        `CSVファイルの形式が正しくありません。必要な列: ${expectedHeader.join(
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
        if (record.value === 'あり') {
          record.value = true;
        } else if (record.value === 'なし') {
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
    setImportStatus('インポート中...');

    try {
      const text = await file.text();
      let records: RecordItem[];

      if (format === 'json') {
        records = JSON.parse(text);
        if (!Array.isArray(records)) {
          throw new Error('JSONファイルの形式が正しくありません');
        }
      } else {
        records = parseCSV(text);
      }

      // データ検証
      for (const record of records) {
        if (!record.id || !record.date || !record.time || !record.fieldId) {
          throw new Error('データに必須項目が不足しています');
        }
      }

      // インポート実行
      let importCount = 0;
      for (const record of records) {
        try {
          await addRecord(record);
          importCount++;
        } catch (error) {
          console.warn('レコードの追加をスキップ:', record.id, error);
        }
      }

      await loadRecords();
      setImportStatus(`✅ ${importCount}件のレコードをインポートしました`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error('不明なエラー');
      console.error('インポートエラー:', errorInstance);

      setImportStatus(`❌ インポートに失敗しました: ${errorInstance.message}`);
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
        setImportStatus(
          '❌ サポートされていないファイル形式です（.csv または .json のみ）'
        );
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
      '⚠️ 警告: すべてのデータ（記録・項目）が完全に削除されます。\n\nこの操作は取り消すことができません。\n\n本当にすべてのデータを削除してもよろしいですか？'
    );

    if (isConfirmed) {
      const doubleConfirm = window.confirm(
        '🚨 最終確認: 本当にすべてのデータを削除しますか？\n\nデータのバックアップを取ることをお勧めします。'
      );

      if (doubleConfirm) {
        try {
          await deleteAllData();
          // 初期項目を再度作成
          await initializeFields();
          alert('✅ すべてのデータが削除され、初期項目が復元されました。');
        } catch (error) {
          console.error('削除エラー:', error);
          alert('❌ データの削除に失敗しました。');
        }
      }
    }
  };

  // テストデータ生成関数
  const generateTestData = async () => {
    setTestDataStatus('テストデータを生成中...');
    setIsGeneratingTestData(true);
    setTestDataProgress(0);

    try {
      await loadFields(); // 最新の項目を取得

      if (fields.length === 0) {
        throw new Error('項目が存在しません。先に項目を初期化してください。');
      }

      const dataCount = 100; // 生成するデータ数
      const daysBack = 30; // 過去30日分
      let createdCount = 0;

      for (let i = 0; i < dataCount; i++) {
        // ランダムな日付を生成（過去30日以内）
        const randomDaysAgo = Math.floor(Math.random() * daysBack);
        const date = new Date();
        date.setDate(date.getDate() - randomDaysAgo);
        const dateStr = date.toISOString().split('T')[0];

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
              '今日は調子が良い',
              '少し疲れている',
              '運動後でスッキリ',
              '食事が美味しかった',
              '早めに寝たい',
              '天気が良くて気分爽快',
              '仕事が忙しかった',
              '久しぶりの休日',
              '',
            ];
            value = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
          } else {
            value = `テスト値${Math.floor(Math.random() * 1000)}`;
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
          setTestDataStatus(`テストデータを生成中... ${i + 1}/${dataCount}`);
        }
      }

      await loadRecords();
      setTestDataStatus(`✅ ${createdCount}件のテストデータを生成しました`);
      setTimeout(() => {
        setTestDataStatus(null);
        setTestDataProgress(0);
      }, 3000);
    } catch (error) {
      console.error('テストデータ生成エラー:', error);
      setTestDataStatus(
        `❌ テストデータの生成に失敗しました: ${
          error instanceof Error ? error.message : '不明なエラー'
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
      '🧪 テストデータを生成しますか？\n\n過去30日分のランダムなデータを約100件作成します。\n既存のデータに追加されます。'
    );

    if (isConfirmed) {
      generateTestData();
    }
  };

  return (
    <div className="max-w-full sm:max-w-4xl mx-auto px-2 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-800 mb-12">管理</h1>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          データ詳細
        </h2>
        <div className="text-base text-gray-600 space-y-3">
          <p className="flex items-center gap-2">
            <HiChartBarSquare className="w-5 h-5 text-blue-600" />
            <strong className="text-gray-800">対象レコード数:</strong>{' '}
            {sortedRecords.length}件
          </p>
          <p className="flex items-center gap-2">
            <HiCalendarDays className="w-5 h-5 text-blue-600" />
            <strong className="text-gray-800">期間:</strong>{' '}
            {sortedRecords.length > 0
              ? `${sortedRecords[sortedRecords.length - 1]?.date} 〜 ${
                  sortedRecords[0]?.date
                }`
              : 'データなし'}
          </p>
          <p className="flex items-center gap-2">
            <HiClipboardDocumentList className="w-5 h-5 text-blue-600" />
            <strong className="text-gray-800">対象項目:</strong>{' '}
            すべての健康記録項目
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          テスト用データ
        </h2>

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
              label="テストデータ生成進捗"
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
            テストデータを生成（約100件）
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-1 text-left">
          <p>• 過去30日分のランダムなデータを約100件作成します。</p>
          <p>• 各項目について適切な値の範囲でランダム生成されます。</p>
          <p>• 既存のデータに追加されます。</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          データエクスポート
        </h2>
        <div className="flex flex-col gap-4 mb-6">
          <Button
            variant="purple"
            size="lg"
            icon={HiDocument}
            onClick={handleExportCSV}
            fullWidth={false}
          >
            CSV形式でダウンロード
          </Button>
          <Button
            variant="purple"
            size="lg"
            icon={HiDocument}
            onClick={handleExportJSON}
            fullWidth={false}
          >
            JSON形式でダウンロード
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-1 text-left">
          <p>• CSV形式: Excel等での分析に適しています。</p>
          <p>• JSON形式: プログラムでの処理やバックアップに適しています。</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          データインポート
        </h2>

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
              データをインポート（CSV・JSON）
            </label>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-1 text-left">
          <p>• 既存のデータに追加されます。（重複IDは上書き）</p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-red-800 mb-6 flex items-center gap-2">
          <HiExclamationTriangle className="w-6 h-6 text-red-600" />
          危険な操作
        </h2>
        <div className="mb-6 text-left">
          <p className="text-base text-red-700 mb-3">
            <strong>全データ削除:</strong> 記録データが完全に削除されます。
          </p>
        </div>
        <Button
          variant="danger"
          size="lg"
          icon={HiTrash}
          onClick={handleDeleteAllData}
          fullWidth={false}
        >
          全データを削除
        </Button>
      </div>
    </div>
  );
}
