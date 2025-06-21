import React, { useEffect, useState } from 'react';
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';
import {
  HiChartBarSquare,
  HiCalendarDays,
  HiClipboardDocumentList,
  HiDocument,
  HiExclamationTriangle,
  HiTrash,
  HiArrowDownTray
} from 'react-icons/hi2';

function formatDateForFilename(date: Date) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 15);
}

function toCSV(records: RecordItem[], fields: { fieldId: string; name: string }[]) {
  const header = ['id', 'date', 'time', 'datetime', 'fieldId', 'fieldName', 'value'];
  const rows = records.map(rec => {
    const field = fields.find(f => f.fieldId === rec.fieldId);
    return [
      rec.id,
      rec.date,
      rec.time,
      rec.datetime,
      rec.fieldId,
      field ? field.name : '',
      typeof rec.value === 'boolean' ? (rec.value ? 'あり' : 'なし') : rec.value
    ];
  });
  return [header, ...rows].map(row => row.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export default function RecordExport() {
  const { records, fields, loadRecords, loadFields, deleteAllData, initializeFields, addRecord } = useRecordsStore();
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

    if (lines.length < 2) throw new Error('CSVファイルが空または形式が正しくありません');

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
    console.log('CSV Header:', header);

    const expectedHeader = ['id', 'date', 'time', 'datetime', 'fieldId', 'fieldName', 'value'];

    if (!expectedHeader.every(col => header.includes(col))) {
      console.error('Expected headers:', expectedHeader);
      console.error('Actual headers:', header);
      throw new Error(`CSVファイルの形式が正しくありません。必要な列: ${expectedHeader.join(', ')}`);
    }

    const records: RecordItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        // 空行をスキップ
        if (!lines[i].trim()) continue;

        const values = parseCSVLine(lines[i]);
        console.log(`Row ${i}:`, values);

        // 列数チェック
        if (values.length !== header.length) {
          console.warn(`Row ${i}: 列数が一致しません (expected: ${header.length}, actual: ${values.length})`);
          continue;
        }

        const record: RecordItem = {
          id: values[header.indexOf('id')],
          date: values[header.indexOf('date')],
          time: values[header.indexOf('time')],
          datetime: values[header.indexOf('datetime')],
          fieldId: values[header.indexOf('fieldId')],
          value: values[header.indexOf('value')]
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
        throw new Error(`${i}行目の処理でエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    }

    console.log('Parsed records:', records.length);
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
      console.error('インポートエラー:', error);
      setImportStatus(`❌ インポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
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
        setImportStatus('❌ サポートされていないファイル形式です（.csv または .json のみ）');
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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-12">管理</h1>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">データ詳細</h2>
        <div className="text-base text-gray-600 space-y-3">
          <p className="flex items-center gap-2">
            <HiChartBarSquare className="w-5 h-5 text-blue-600" />
            <strong className="text-gray-800">対象レコード数:</strong> {sortedRecords.length}件
          </p>
          <p className="flex items-center gap-2">
            <HiCalendarDays className="w-5 h-5 text-blue-600" />
            <strong className="text-gray-800">期間:</strong> {sortedRecords.length > 0
              ? `${sortedRecords[sortedRecords.length - 1]?.date} 〜 ${sortedRecords[0]?.date}`
              : 'データなし'}
          </p>
          <p className="flex items-center gap-2">
            <HiClipboardDocumentList className="w-5 h-5 text-blue-600" />
            <strong className="text-gray-800">対象項目:</strong> すべての健康記録項目
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">データエクスポート</h2>
        <div className="flex flex-col gap-4 mb-6">
          <button
            onClick={handleExportCSV}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-purple-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-auto"
          >
            <HiDocument className="w-5 h-5" />
            CSV形式でダウンロード
          </button>
          <button
            onClick={handleExportJSON}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-purple-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-auto"
          >
            <HiDocument className="w-5 h-5" />
            JSON形式でダウンロード
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-1 text-left">
          <p>• CSV形式: Excel等での分析に適しています。</p>
          <p>• JSON形式: プログラムでの処理やバックアップに適しています。</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">データインポート</h2>

        {importStatus && (
          <div className={`mb-6 p-4 rounded-lg border ${
            importStatus.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' :
            importStatus.includes('❌') ? 'bg-red-50 border-red-200 text-red-700' :
            'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {importStatus}
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
        <button
          onClick={handleDeleteAllData}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-red-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-auto"
        >
          <HiTrash className="w-5 h-5" />
          全データを削除
        </button>
      </div>
    </div>
  );
}
