import { memo, useCallback } from 'react';
import { HiArrowUpTray, HiDocument } from 'react-icons/hi2';
import { useDataExportLogic } from '../hooks/business/useDataExportLogic';
import Button from './Button';

interface DataExporterProps {
  onStatusChange?: (status: string | null) => void;
}

const DataExporter = memo(function DataExporter({
  onStatusChange,
}: DataExporterProps) {
  const { exportAsJSON, exportAsCSV } = useDataExportLogic();

  const handleExportJSON = useCallback(async () => {
    await exportAsJSON(onStatusChange);
  }, [exportAsJSON, onStatusChange]);

  const handleExportCSV = useCallback(async () => {
    await exportAsCSV(onStatusChange);
  }, [exportAsCSV, onStatusChange]);

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
          <Button
            variant="secondary"
            icon={HiDocument}
            onClick={handleExportCSV}
          >
            CSV形式でエクスポート
          </Button>
        </div>
      </div>
    </div>
  );
});

export default DataExporter;
