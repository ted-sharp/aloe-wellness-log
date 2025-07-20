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

  return {
    exportAsJSON,
    getAllData,
    formatDateForFilename,
    downloadFile,
  };
};