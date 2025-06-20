import React, { useEffect } from 'react';
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
  const { records, fields, loadRecords, loadFields, deleteAllData, initializeFields } = useRecordsStore();

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
      <h1 className="text-4xl font-bold text-gray-800 mb-12">管理</h1>

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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={handleExportCSV}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-purple-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <HiArrowDownTray className="w-5 h-5" />
            CSV形式でダウンロード
          </button>
          <button
            onClick={handleExportJSON}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-purple-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <HiDocument className="w-5 h-5" />
            JSON形式でダウンロード
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>• CSV形式: Excel等での分析に適しています</p>
          <p>• JSON形式: プログラムでの処理やバックアップに適しています</p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-red-800 mb-6 flex items-center gap-2">
          <HiExclamationTriangle className="w-6 h-6 text-red-600" />
          危険な操作
        </h2>
        <div className="mb-6">
          <p className="text-base text-red-700 mb-3">
            <strong>全データ削除:</strong> すべての記録データと項目設定が完全に削除されます。
          </p>
          <p className="text-base text-red-600">
            削除前にデータのエクスポートでバックアップを取ることを強くお勧めします。
          </p>
        </div>
        <button
          onClick={handleDeleteAllData}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-red-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <HiTrash className="w-5 h-5" />
          全データを削除
        </button>
      </div>
    </div>
  );
}
