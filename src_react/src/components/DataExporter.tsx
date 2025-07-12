import { memo, useCallback } from 'react';
import { HiArrowDownTray, HiDocument } from 'react-icons/hi2';
import Button from './Button';
import {
  getAllBpRecords,
  getAllDailyFields,
  getAllDailyRecords,
  getAllWeightRecords,
} from '../db/indexedDb';

function formatDateForFilename(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

interface DataExporterProps {
  onStatusChange?: (status: string | null) => void;
}

const DataExporter = memo(function DataExporter({
  onStatusChange,
}: DataExporterProps) {
  
  const handleExportJSON = useCallback(async () => {
    try {
      onStatusChange?.('データをエクスポート中...');
      
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
      
      onStatusChange?.('JSONエクスポートが完了しました');
    } catch (error) {
      onStatusChange?.(`エクスポートエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onStatusChange]);

  const handleExportCSV = useCallback(async () => {
    try {
      onStatusChange?.('CSVデータをエクスポート中...');
      
      const [weightRecords, bpRecords, dailyRecords, dailyFields] =
        await Promise.all([
          getAllWeightRecords(),
          getAllBpRecords(),
          getAllDailyRecords(),
          getAllDailyFields(),
        ]);

      // 体重データのCSV
      let weightCSV = '日付,時刻,体重(kg),体脂肪率(%),ウェスト(cm),メモ,グラフ除外\n';
      weightRecords
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
        .forEach(record => {
          weightCSV += `${record.date},${record.time || ''},${record.weight},${record.bodyFat || ''},${record.waist || ''},"${(record.note || '').replace(/"/g, '""')}",${record.excludeFromGraph ? 'はい' : 'いいえ'}\n`;
        });

      // 血圧データのCSV
      let bpCSV = '日付,時刻,最高血圧(mmHg),最低血圧(mmHg),心拍数(bpm),メモ\n';
      bpRecords
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
        .forEach(record => {
          bpCSV += `${record.date},${record.time || ''},${record.systolic || ''},${record.diastolic || ''},${record.heartRate || ''},"${(record.note || '').replace(/"/g, '""')}"\n`;
        });

      // 日課データのCSV
      const fieldMap = Object.fromEntries(
        dailyFields.map(field => [field.fieldId, field.name])
      );
      
      let dailyCSV = '日付,項目,達成度\n';
      dailyRecords
        .sort((a, b) => `${a.date} ${a.fieldId}`.localeCompare(`${b.date} ${b.fieldId}`))
        .forEach(record => {
          const fieldName = fieldMap[record.fieldId] || record.fieldId;
          const achievement = record.value === 1 ? '達成' : record.value === 0.5 ? '少し達成' : '未達成';
          dailyCSV += `${record.date},"${fieldName}",${achievement}\n`;
        });

      // ZIPファイルの作成（簡易版）
      const createZipFile = () => {
        const files = [
          { name: 'weight_records.csv', content: weightCSV },
          { name: 'bp_records.csv', content: bpCSV },
          { name: 'daily_records.csv', content: dailyCSV },
        ];

        // 各ファイルを個別にダウンロード
        files.forEach(file => {
          const blob = new Blob(['\uFEFF' + file.content], { 
            type: 'text/csv;charset=utf-8;' 
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${formatDateForFilename(new Date())}_${file.name}`;
          a.click();
          URL.revokeObjectURL(url);
        });
      };

      createZipFile();
      onStatusChange?.('CSVエクスポートが完了しました');
    } catch (error) {
      onStatusChange?.(`CSVエクスポートエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onStatusChange]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">
        データエクスポート
      </h2>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <p>記録したデータをファイルとしてダウンロードできます。</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon={HiDocument}
            onClick={handleExportJSON}
          >
            JSON形式でエクスポート
          </Button>
          <Button
            variant="secondary"
            icon={HiArrowDownTray}
            onClick={handleExportCSV}
          >
            CSV形式でエクスポート
          </Button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>• JSON形式: アプリに再インポートできる形式</p>
          <p>• CSV形式: Excel等で開ける形式（体重・血圧・日課の3ファイル）</p>
        </div>
      </div>
    </div>
  );
});

export default DataExporter;