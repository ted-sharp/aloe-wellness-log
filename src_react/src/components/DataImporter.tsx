import { memo, useCallback, useRef, useState } from 'react';
import { HiArrowUpTray, HiExclamationTriangle, HiArrowDownTray, HiFolder } from 'react-icons/hi2';
import Button from './Button';
import { ErrorMessage, InfoMessage, SuccessMessage } from './StatusMessage';
import {
  addBpRecord,
  addDailyField,
  addDailyRecord,
  addWeightRecord,
} from '../db/indexedDb';

interface DataImporterProps {
  onStatusChange?: (status: string | null) => void;
  onDataUpdated?: () => void;
}

const DataImporter = memo(function DataImporter({
  onStatusChange,
  onDataUpdated,
}: DataImporterProps) {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async (file: File) => {
    setImportStatus('データをインポート中...');
    onStatusChange?.('データをインポート中...');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // データ構造の検証
      if (!data || typeof data !== 'object') {
        throw new Error('無効なJSONファイルです');
      }

      const {
        weightRecords = [],
        bpRecords = [],
        dailyRecords = [],
        dailyFields = [],
      } = data;

      let importedCount = 0;

      // 日課フィールドを先にインポート
      if (Array.isArray(dailyFields)) {
        for (const field of dailyFields) {
          if (
            field &&
            typeof field === 'object' &&
            field.fieldId &&
            field.name
          ) {
            try {
              await addDailyField({
                fieldId: field.fieldId,
                name: field.name,
                order: field.order || 0,
                display: field.display !== false,
              });
              importedCount++;
            } catch (error) {
              // 重複エラーは無視
              if (
                error instanceof Error &&
                !error.message.includes('already exists')
              ) {
                console.warn('日課フィールドインポート失敗:', field, error);
              }
            }
          }
        }
      }

      // 体重記録をインポート
      if (Array.isArray(weightRecords)) {
        for (const record of weightRecords) {
          if (
            record &&
            typeof record === 'object' &&
            record.id &&
            record.date &&
            typeof record.weight === 'number'
          ) {
            try {
              await addWeightRecord({
                id: record.id,
                date: record.date,
                time: record.time || '',
                weight: record.weight,
                bodyFat: record.bodyFat || null,
                waist: record.waist || null,
                note: record.note || null,
                excludeFromGraph: record.excludeFromGraph || false,
              });
              importedCount++;
            } catch (error) {
              console.warn('体重記録インポート失敗:', record, error);
            }
          }
        }
      }

      // 血圧記録をインポート
      if (Array.isArray(bpRecords)) {
        for (const record of bpRecords) {
          if (
            record &&
            typeof record === 'object' &&
            record.id &&
            record.date &&
            typeof record.systolic === 'number' &&
            typeof record.diastolic === 'number'
          ) {
            try {
              await addBpRecord({
                id: record.id,
                date: record.date,
                time: record.time || '',
                systolic: record.systolic,
                diastolic: record.diastolic,
                heartRate: record.heartRate || record.pulse || null,
                note: record.note || null,
              });
              importedCount++;
            } catch (error) {
              console.warn('血圧記録インポート失敗:', record, error);
            }
          }
        }
      }

      // 日課記録をインポート
      if (Array.isArray(dailyRecords)) {
        for (const record of dailyRecords) {
          if (
            record &&
            typeof record === 'object' &&
            record.id &&
            record.date &&
            record.fieldId &&
            typeof record.value === 'number'
          ) {
            try {
              await addDailyRecord({
                id: record.id,
                date: record.date,
                fieldId: record.fieldId,
                value: record.value,
              });
              importedCount++;
            } catch (error) {
              console.warn('日課記録インポート失敗:', record, error);
            }
          }
        }
      }

      setImportStatus(`インポート完了: ${importedCount}件のレコードを追加しました`);
      onStatusChange?.(`インポート完了: ${importedCount}件のレコードを追加しました`);
      onDataUpdated?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setImportStatus(`インポートに失敗しました: ${errorMessage}`);
      onStatusChange?.(`インポートに失敗しました: ${errorMessage}`);
    }
  }, [onStatusChange, onDataUpdated]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        handleImport(file);
      } else {
        setImportStatus('JSONファイルを選択してください');
        onStatusChange?.('JSONファイルを選択してください');
      }
    }
  }, [handleImport, onStatusChange]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 justify-center">
        <HiArrowDownTray className="w-6 h-6" />
        データインポート
      </h2>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex justify-center">
          <div className="text-left max-w-md">
            <p>以前にエクスポートしたJSONファイルからデータを復元できます。</p>
          </div>
        </div>

        <div className="flex items-center gap-4 justify-center">
          <Button
            variant="primary"
            icon={HiFolder}
            onClick={handleImportClick}
          >
            JSONファイルを選択
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="flex justify-center">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-md">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <HiExclamationTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">注意事項</p>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200 text-left">
                <li>既存のデータは保持され、新しいデータが追加されます</li>
                <li>同じIDのレコードがある場合は、既存データが優先されます</li>
                <li>インポート前に現在のデータをバックアップすることをお勧めします</li>
                <li>このアプリでエクスポートしたJSONファイルのみ対応しています</li>
              </ul>
            </div>
          </div>
        </div>

        {importStatus && (
          <div className="mt-4">
            {importStatus.includes('失敗') || importStatus.includes('エラー') ? (
              <ErrorMessage message={importStatus} />
            ) : importStatus.includes('完了') ? (
              <SuccessMessage message={importStatus} />
            ) : (
              <InfoMessage message={importStatus} />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default DataImporter;