import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import {
  addDailyField,
  addDailyRecord,
  deleteDailyField,
  deleteDailyRecord,
  getAllDailyFields,
  getAllDailyRecords,
  updateDailyField,
  updateDailyRecord,
} from '../../db';
import type { DailyFieldV2, DailyRecordV2 } from '../../types/record';

/**
 * 日課記録のビジネスロジックを管理するカスタムHook
 */
export const useDailyRecordLogic = () => {
  // 状態管理
  const [fields, setFields] = useState<DailyFieldV2[]>([]);
  const [records, setRecords] = useState<DailyRecordV2[]>([]);

  // 初期日課項目（運動・食事・睡眠・喫煙・飲酒）
  const DEFAULT_DAILY_FIELDS: DailyFieldV2[] = [
    { fieldId: 'exercise', name: '運動', order: 10, display: true },
    { fieldId: 'meal', name: '食事', order: 20, display: true },
    { fieldId: 'sleep', name: '睡眠', order: 30, display: true },
    { fieldId: 'smoke', name: '喫煙', order: 40, display: false },
    { fieldId: 'alcohol', name: '飲酒', order: 50, display: false },
  ];

  // データロード関数
  const loadFields = useCallback(async () => {
    const fs = await getAllDailyFields();
    setFields(fs);
  }, []);

  const loadRecords = useCallback(async () => {
    const rs = await getAllDailyRecords();
    setRecords(rs);
  }, []);

  // 初期化処理
  useEffect(() => {
    (async () => {
      const fs = await getAllDailyFields();
      if (!fs || fs.length === 0) {
        for (const field of DEFAULT_DAILY_FIELDS) {
          await addDailyField(field);
        }
        // 再取得して反映
        setFields(await getAllDailyFields());
      }
    })();
  }, []);

  // 初回マウント時に必ずロード
  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // 記録取得ユーティリティ
  const getBoolRecord = useCallback((fieldId: string, recordDate: string) =>
    records.find(r => r.fieldId === fieldId && r.date === recordDate)
  , [records]);

  const getAchievementValue = useCallback((fieldId: string, recordDate: string): 0 | 0.5 | 1 | undefined => {
    const rec = getBoolRecord(fieldId, recordDate);
    if (typeof rec?.value === 'number') {
      if (rec.value === 1) return 1;
      if (rec.value === 0.5) return 0.5;
      if (rec.value === 0) return 0;
    }
    return undefined;
  }, [getBoolRecord]);

  // 日付ごとの記録済み判定
  const isRecorded = useCallback((date: Date) => {
    const d = formatDate(date);
    const dailyFieldIds = fields.map(f => f.fieldId);
    return records.some(r => r.date === d && dailyFieldIds.includes(r.fieldId));
  }, [fields, records]);

  // 達成状況の入力処理
  const handleAchievementInput = useCallback(async (
    fieldId: string,
    value: 0 | 0.5 | 1,
    recordDate: string
  ) => {
    const rec = getBoolRecord(fieldId, recordDate);
    if (rec && rec.value === value) {
      await deleteDailyRecord(rec.id);
      await loadRecords();
    } else if (rec) {
      await updateDailyRecord({ ...rec, value });
      await loadRecords();
    } else {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await addDailyRecord({
        id,
        fieldId,
        date: recordDate,
        value,
      });
      await loadRecords();
    }
  }, [getBoolRecord, loadRecords]);

  // フィールド管理
  const addField = useCallback(async (name: string) => {
    if (!name.trim()) {
      throw new Error('項目名を入力してください');
    }
    if (fields.some(f => f.name === name)) {
      throw new Error('同じ名前の項目が既に存在します');
    }
    
    const fieldId = `custom_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;
    const newField: DailyFieldV2 = {
      fieldId,
      name,
      order: (fields.length + 1) * 10,
      display: true,
    };
    
    await addDailyField(newField);
    await loadFields();
    return newField;
  }, [fields, loadFields]);

  const deleteField = useCallback(async (fieldId: string) => {
    await deleteDailyField(fieldId);
    await loadFields();
  }, [loadFields]);

  const updateField = useCallback(async (field: DailyFieldV2) => {
    await updateDailyField(field);
    await loadFields();
  }, [loadFields]);

  // 統計計算
  const getRecent14Days = useCallback(() => {
    const today = new Date();
    const days: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(formatDate(d));
    }
    return days.reverse();
  }, []);

  const getFieldSuccessStats = useCallback((fieldId: string) => {
    const days = getRecent14Days();
    let total = 0;
    let success = 0;
    days.forEach(date => {
      const rec = records.find(r => r.fieldId === fieldId && r.date === date);
      if (typeof rec?.value === 'number') {
        total++;
        if (rec.value > 0) success++;
      }
    });
    return {
      total,
      success,
      percent: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  }, [records, getRecent14Days]);

  // 連続達成日数計算
  const calcStreak = useCallback((baseDate: Date) => {
    if (records.length === 0) return 0;
    const dailyFieldIds = fields.map(f => f.fieldId);
    const allDates = records.map(r => r.date).sort();
    if (allDates.length === 0) return 0;
    
    const firstDate = new Date(allDates[0]);
    const endDate = baseDate;
    let streak = 0;
    
    for (
      let d = new Date(endDate);
      d >= firstDate;
      d.setDate(d.getDate() - 1)
    ) {
      const dateStr = formatDate(d);
      // その日に1つでも value > 0（達成または少し達成）があるか
      const hasAny = dailyFieldIds.some(fieldId =>
        records.some(
          r =>
            r.fieldId === fieldId &&
            r.date === dateStr &&
            typeof r.value === 'number' &&
            r.value > 0
        )
      );
      if (hasAny) {
        streak++;
      } else {
        // 未達成または未入力でストップ
        break;
      }
    }
    // 1日だけの場合は0とする
    return streak > 1 ? streak : 0;
  }, [records, fields]);

  // 累計達成日数計算
  const calcTotalAchievedDays = useCallback((baseDate: Date) => {
    const dailyFieldIds = fields.map(f => f.fieldId);
    if (records.length === 0) return 0;
    
    const dates = records.map(r => r.date).sort();
    const firstDate = new Date(dates[0]);
    const endDate = baseDate;
    let count = 0;
    
    for (
      let d = new Date(firstDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = formatDate(d);
      const hasAny = dailyFieldIds.some(fieldId =>
        records.some(
          r =>
            r.fieldId === fieldId &&
            r.date === dateStr &&
            typeof r.value === 'number' &&
            r.value > 0
        )
      );
      if (hasAny) count++;
    }
    return count;
  }, [records, fields]);

  // 日付ごとの状態を判定
  const getDateStatus = useCallback((date: Date): 'none' | 'green' | 'red' => {
    const d = formatDate(date);
    const dailyFieldIds = fields.map(f => f.fieldId);
    const recs = records.filter(
      r => r.date === d && dailyFieldIds.includes(r.fieldId)
    );
    if (recs.length === 0) return 'none';
    const hasAchieve = recs.some(r => r.value === 1 || r.value === 0.5);
    return hasAchieve ? 'green' : 'red';
  }, [records, fields]);

  // フィールドフィルタリング
  const getDisplayFields = useCallback((isEditMode: boolean, targetDate?: string) => {
    return isEditMode
      ? fields.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : fields
          .filter(f => {
            // 表示設定がtrueのフィールドは常に表示
            if ('display' in f && (f as DailyFieldV2).display !== false) {
              return true;
            }
            // 表示設定がfalseでも、既存の記録があるフィールドは表示
            // ただし、実際に値が入力されている記録のみを対象とする
            // targetDateが指定された場合は、その日付での入力有無をチェック
            if (targetDate) {
              return records.some(record => 
                record.fieldId === f.fieldId && 
                record.date === targetDate &&
                record.value !== null && 
                record.value !== undefined
              );
            }
            // targetDateが未指定の場合は、全期間での入力有無をチェック
            return records.some(record => 
              record.fieldId === f.fieldId && 
              record.value !== null && 
              record.value !== undefined
            );
          })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [fields, records]);

  return {
    // 状態
    fields,
    records,
    
    // データロード
    loadFields,
    loadRecords,
    
    // 記録取得
    getBoolRecord,
    getAchievementValue,
    isRecorded,
    
    // 記録操作
    handleAchievementInput,
    
    // フィールド管理
    addField,
    deleteField,
    updateField,
    
    // 統計
    getFieldSuccessStats,
    calcStreak,
    calcTotalAchievedDays,
    getDateStatus,
    
    // フィルタリング
    getDisplayFields,
  };
};