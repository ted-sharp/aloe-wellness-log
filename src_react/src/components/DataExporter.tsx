import { memo, useCallback } from 'react';
import { HiDocument, HiArrowUpTray } from 'react-icons/hi2';
import Button from './Button';
import {
  getAllBpRecords,
  getAllDailyFields,
  getAllDailyRecords,
  getAllWeightRecords,
} from '../db';

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


  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
        <HiArrowUpTray className="w-6 h-6" />
        データエクスポート
      </h2>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex justify-center">
          <div className="text-left max-w-md">
            <p>記録したデータをファイルとしてダウンロードできます。</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant="primary"
            icon={HiDocument}
            onClick={handleExportJSON}
          >
            JSON形式でエクスポート
          </Button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>• JSON形式: アプリに再インポートできる形式</p>
        </div>
      </div>
    </div>
  );
});

export default DataExporter;