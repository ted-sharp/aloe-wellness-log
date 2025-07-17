import { useCallback } from 'react';
import {
  getAllBpRecords,
  getAllDailyFields,
  getAllDailyRecords,
  getAllWeightRecords,
} from '../../db';

/**
 * データエクスポートのビジネスロジックを管理するカスタムHook
 */
export const useDataExportLogic = () => {
  
  /**
   * 日付をファイル名用にフォーマット
   */
  const formatDateForFilename = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }, []);

  /**
   * ファイルダウンロード処理
   */
  const downloadFile = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /**
   * 全データを取得
   */
  const getAllData = useCallback(async () => {
    const [weightRecords, bpRecords, dailyRecords, dailyFields] = await Promise.all([
      getAllWeightRecords(),
      getAllBpRecords(),
      getAllDailyRecords(),
      getAllDailyFields(),
    ]);

    return {
      weightRecords,
      bpRecords,
      dailyRecords,
      dailyFields,
    };
  }, []);

  /**
   * JSONファイルとしてエクスポート
   */
  const exportAsJSON = useCallback(async (onStatusChange?: (status: string | null) => void) => {
    try {
      onStatusChange?.('データをエクスポート中...');

      const exportData = await getAllData();
      
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const filename = `records-v2-${formatDateForFilename(new Date())}.json`;
      
      downloadFile(blob, filename);

      onStatusChange?.('JSONエクスポートが完了しました');
    } catch (error) {
      onStatusChange?.(
        `エクスポートエラー: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }, [getAllData, formatDateForFilename, downloadFile]);

  /**
   * CSVファイルとしてエクスポート（将来の拡張用）
   */
  const exportAsCSV = useCallback(async (onStatusChange?: (status: string | null) => void) => {
    try {
      onStatusChange?.('CSVエクスポート中...');

      const data = await getAllData();
      
      // 体重データのCSV変換
      const weightCSV = [
        'Date,Time,Weight,BodyFat,Waist,Note,ExcludeFromGraph',
        ...data.weightRecords.map(record => 
          `${record.date},${record.time},${record.weight},${record.bodyFat || ''},${record.waist || ''},${record.note || ''},${record.excludeFromGraph || false}`
        )
      ].join('\n');

      // 血圧データのCSV変換
      const bpCSV = [
        'Date,Time,Systolic,Diastolic,HeartRate,Note,ExcludeFromGraph',
        ...data.bpRecords.map(record => 
          `${record.date},${record.time},${record.systolic},${record.diastolic},${record.heartRate || ''},${record.note || ''},${record.excludeFromGraph || false}`
        )
      ].join('\n');

      // 日常記録のCSV変換
      const dailyCSV = [
        'Date,FieldId,Value',
        ...data.dailyRecords.map(record => 
          `${record.date},${record.fieldId},${record.value}`
        )
      ].join('\n');

      // 複数のCSVファイルを作成
      const timestamp = formatDateForFilename(new Date());
      
      downloadFile(new Blob([weightCSV], { type: 'text/csv' }), `weight-records-${timestamp}.csv`);
      downloadFile(new Blob([bpCSV], { type: 'text/csv' }), `bp-records-${timestamp}.csv`);
      downloadFile(new Blob([dailyCSV], { type: 'text/csv' }), `daily-records-${timestamp}.csv`);

      onStatusChange?.('CSVエクスポートが完了しました');
    } catch (error) {
      onStatusChange?.(
        `CSVエクスポートエラー: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }, [getAllData, formatDateForFilename, downloadFile]);

  return {
    exportAsJSON,
    exportAsCSV,
    getAllData,
    formatDateForFilename,
    downloadFile,
  };
};