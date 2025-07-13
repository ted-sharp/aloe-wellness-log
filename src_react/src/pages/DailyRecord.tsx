import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaFire } from 'react-icons/fa';
import {
  HiCheck,
  HiCheckCircle,
  HiPencil,
  HiPlus,
  HiXMark,
} from 'react-icons/hi2';
import Button from '../components/Button';
import DailyAchievementItem from '../components/DailyAchievementItem';
import SortableItem from '../components/SortableItem';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useDateSelection } from '../hooks/useDateSelection';
import { formatDate } from '../utils/dateUtils';
import DatePickerBar from '../components/DatePickerBar';
import {
  addDailyField,
  addDailyRecord,
  deleteDailyField,
  deleteDailyRecord,
  getAllDailyFields,
  getAllDailyRecords,
  updateDailyField,
  updateDailyRecord,
} from '../db';
import type { DailyFieldV2, DailyRecordV2 } from '../types/record';

/**
 * 毎日記録ページ（今後実装予定）
 */

const DailyRecord: React.FC = () => {
  // 状態管理
  const [fields, setFields] = useState<DailyFieldV2[]>([]);
  const [records, setRecords] = useState<DailyRecordV2[]>([]);

  // 日付選択管理 - 既存の useDateSelection フックを使用
  const {
    selectedDate,
    setSelectedDate,
    centerDate,
    setCenterDate,
    today,
    recordDate,
    // isRecorded: isRecordedByHook,
  } = useDateSelection({
    records,
    getRecordDate: (record) => record.date,
  });

  // 新規項目追加用state
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [addFieldError, setAddFieldError] = useState('');

  // 編集モード用state
  const [isEditMode, setIsEditMode] = useState(false);
  const boolFields = isEditMode
    ? fields.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : fields
        .filter(f =>
          'display' in f ? (f as DailyFieldV2).display !== false : true
        )
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const [editFields, setEditFields] = useState<DailyFieldV2[]>([]);
  const [editOrder, setEditOrder] = useState(() =>
    boolFields.map(f => f.fieldId)
  );
  const [editDelete, setEditDelete] = useState<string[]>([]);

  // D&D sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // 既存記録の取得
  const getBoolRecord = (fieldId: string) =>
    records.find(r => r.fieldId === fieldId && r.date === recordDate);
  const getAchievementValue = (fieldId: string): 0 | 0.5 | 1 | undefined => {
    const rec = getBoolRecord(fieldId);
    if (typeof rec?.value === 'number') {
      if (rec.value === 1) return 1;
      if (rec.value === 0.5) return 0.5;
      if (rec.value === 0) return 0;
    }
    return undefined;
  };
  // 日付ごとの記録済み判定（scope: 'daily'で絞り込み） - 日課用にカスタマイズ
  const isRecorded = (date: Date) => {
    const d = formatDate(date);
    const dailyFieldIds = fields.map(f => f.fieldId);
    return records.some(r => r.date === d && dailyFieldIds.includes(r.fieldId));
  };
  // V2 APIでfields/recordsを取得
  const loadFields = React.useCallback(async () => {
    const fs = await getAllDailyFields();
    setFields(fs);
  }, []);
  const loadRecords = React.useCallback(async () => {
    const rs = await getAllDailyRecords();
    setRecords(rs);
  }, []);

  // 初期日課項目（運動・食事・睡眠・喫煙・飲酒）
  const DEFAULT_DAILY_FIELDS: DailyFieldV2[] = [
    { fieldId: 'exercise', name: '運動', order: 10, display: true },
    { fieldId: 'meal', name: '食事', order: 20, display: true },
    { fieldId: 'sleep', name: '睡眠', order: 30, display: true },
    { fieldId: 'smoke', name: '喫煙', order: 40, display: false },
    { fieldId: 'alcohol', name: '飲酒', order: 50, display: false },
  ];

  // 初回のみ、日課項目が空なら自動投入
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
  React.useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // ボタン押下時の保存/切替/解除処理
  const handleAchievementInput = async (
    fieldId: string,
    value: 0 | 0.5 | 1
  ) => {
    const rec = getBoolRecord(fieldId);
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
  };
  // 新規bool項目追加処理
  const handleAddField = async () => {
    setAddFieldError('');
    const name = newFieldName.trim();
    if (!name) {
      setAddFieldError('項目名を入力してください');
      return;
    }
    if (fields.some(f => f.name === name)) {
      setAddFieldError('同じ名前の項目が既に存在します');
      return;
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
    if (isEditMode) {
      setEditFields(fields => [...fields, newField]);
      setEditOrder(order => [...order, fieldId]);
    }
    setShowAddField(false);
    setNewFieldName('');
  };

  // 編集モード切替時に最新フィールドで初期化
  useEffect(() => {
    if (isEditMode) {
      const allFields = fields
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setEditFields(
        allFields.map(f => ({
          fieldId: f.fieldId,
          name: f.name,
          order: f.order ?? 0,
          display:
            'display' in f
              ? (f as DailyFieldV2).display
              : typeof (f as any).defaultDisplay === 'boolean'
              ? (f as any).defaultDisplay
              : true,
        }))
      );
      setEditOrder(allFields.map(f => f.fieldId));
      setEditDelete([]);
    }
  }, [isEditMode, fields]);

  // 編集モード用の追加state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  // caretPosMapのstateをrefに置換
  const caretPosRef = useRef<{ [key: string]: { start: number; end: number } }>(
    {}
  );
  useEffect(() => {
    if (!editingFieldId) return;
    const input = inputRefs.current[editingFieldId];
    if (input) {
      const pos = caretPosRef.current[editingFieldId] ?? {
        start: input.value.length,
        end: input.value.length,
      };
      input.setSelectionRange(pos.start, pos.end);
    }
  }, [editingFieldId]);

  // カレット位置変更のコールバック
  const handleCaretPositionChange = useCallback((fieldId: string, start: number, end: number) => {
    caretPosRef.current[fieldId] = { start, end };
  }, []);


  // 編集内容保存
  const handleEditSave = async () => {
    // 削除
    for (const delId of editDelete) {
      await deleteDailyField(delId);
    }
    // 並び替え・名称変更
    for (let i = 0; i < editOrder.length; ++i) {
      const f = editFields.find(f => f.fieldId === editOrder[i]);
      if (f) {
        await updateDailyField({ ...f, order: i * 10 });
      }
    }
    await loadFields();
    setIsEditMode(false);
  };
  // 編集キャンセル
  const handleEditCancel = () => {
    setIsEditMode(false);
  };
  // D&D並び替え
  const handleDragEnd = (event: import('@dnd-kit/core').DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId !== overId) {
      const oldIdx = editOrder.indexOf(activeId);
      const newIdx = editOrder.indexOf(overId);
      setEditOrder(arrayMove(editOrder, oldIdx, newIdx));
    }
  };
  // 削除
  const handleDelete = useCallback((fieldId: string) => {
    setEditDelete(list => [...list, fieldId]);
    setEditFields(fields => fields.filter(f => f.fieldId !== fieldId));
    setEditOrder(order => order.filter(id => id !== fieldId));
  }, []);
  // 表示/非表示トグル
  const handleToggleDisplay = useCallback((fieldId: string) => {
    setEditFields(fields =>
      fields.map(f =>
        f.fieldId === fieldId ? { ...f, display: !f.display } : f
      )
    );
  }, []);

  const getRecent14Days = () => {
    const days: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(formatDate(d));
    }
    return days.reverse();
  };

  // getFieldSuccessStats: 0.5も1カウントとして扱う
  const getFieldSuccessStats = (fieldId: string) => {
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
  };

  // 連続達成日数（streak）を計算
  // const calcStreak = (baseDate: Date) => {
  //   if (records.length === 0) return 0;
  //   const dailyFieldIds = fields.map(f => f.fieldId);
  //   // 記録が存在する日付をbaseDateまで逆順でソート
  //   const dateSet = new Set(records.map(r => r.date));
  //   const allDates = Array.from(dateSet)
  //     .filter(date => new Date(date) <= baseDate)
  //     .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  //   let streak = 0;
  //   for (const dateStr of allDates) {
  //     const hasAny = dailyFieldIds.some(fieldId =>
  //       records.some(
  //         r => r.fieldId === fieldId && r.date === dateStr && r.value === 1
  //       )
  //     );
  //     if (hasAny) {
  //       streak++;
  //     } else {
  //       break;
  //     }
  //   }
  //   return streak;
  // };
  // 修正版: 抜けなし連続達成日数を厳密にカウント
  const calcStreak = (baseDate: Date) => {
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
  };
  const streak = calcStreak(selectedDate);
  const animatedStreak = useAnimatedNumber(streak);

  // baseDateまでの累計達成日数をカウントできるように修正
  const calcTotalAchievedDays = (baseDate: Date) => {
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
  };
  const totalAchievedDays = calcTotalAchievedDays(selectedDate);
  const animatedTotalAchievedDays = useAnimatedNumber(totalAchievedDays);

  // 日付ごとの状態を判定（入力なし: 'none', 1つでも達成または少し達成: 'green', 入力あり全て未達: 'red'）
  const getDateStatus = (date: Date): 'none' | 'green' | 'red' => {
    const d = formatDate(date);
    const dailyFieldIds = fields.map(f => f.fieldId);
    const recs = records.filter(
      r => r.date === d && dailyFieldIds.includes(r.fieldId)
    );
    if (recs.length === 0) return 'none';
    const hasAchieve = recs.some(r => r.value === 1 || r.value === 0.5);
    return hasAchieve ? 'green' : 'red';
  };


  return (
    <div className="bg-transparent">
      {/* 日付ピッカー（共通コンポーネント） */}
      <DatePickerBar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        centerDate={centerDate}
        setCenterDate={setCenterDate}
        getDateStatus={getDateStatus}
        data-testid="date-picker"
      />
      {/* タイトル：日付ピッカー下・左上 */}
      <div className="w-full max-w-md mx-auto mt-3 mb-3 flex justify-start pl-4">
        <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          {recordDate}
          {isRecorded(selectedDate) && (
            <HiCheck
              className="inline-block w-6 h-6 text-green-500 ml-2 align-middle"
              aria-label="入力済み"
            />
          )}
          {/* 連続達成バッジ＋累計達成バッジ（常に両方表示） */}
          <span className="inline-flex items-center">
            {streak >= 2 && (
              <span
                className="ml-3 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold inline-flex items-center"
                title="連続達成日数"
              >
                <FaFire
                  className="inline-block mr-1"
                  style={{ fontSize: '1em' }}
                />
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: '3ch',
                    textAlign: 'right',
                  }}
                >
                  {animatedStreak.toFixed(0)}
                </span>
                日継続中
              </span>
            )}
            <span
              className="ml-3 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-bold inline-flex items-center"
              title="累計達成日数"
            >
              <span className="inline-block mr-1" style={{ fontSize: '1em' }}>
                🏅
              </span>
              <span
                style={{
                  display: 'inline-block',
                  minWidth: '3ch',
                  textAlign: 'right',
                }}
              >
                {animatedTotalAchievedDays.toFixed(0)}
              </span>
              日達成
            </span>
          </span>
        </span>
      </div>
      {/* メインコンテンツ */}
      <div className="flex flex-col items-center justify-start min-h-[60vh]">
        <div className="flex flex-col gap-1 w-full max-w-md">
          {isEditMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={editOrder}
                strategy={verticalListSortingStrategy}
              >
                {editOrder.map(id => {
                  const field = editFields.find(f => f.fieldId === id);
                  if (!field) return null;
                  const isEditing = editingFieldId === field.fieldId;
                  return (
                    <SortableItem
                      key={field.fieldId}
                      field={field}
                      isEditing={isEditing}
                      onStartEdit={() => setEditingFieldId(field.fieldId)}
                      onEndEdit={() => setEditingFieldId(null)}
                      onNameChange={name =>
                        setEditFields(fields =>
                          fields.map(f =>
                            f.fieldId === field.fieldId ? { ...f, name } : f
                          )
                        )
                      }
                      onDelete={() => handleDelete(field.fieldId)}
                      onToggleDisplay={() => handleToggleDisplay(field.fieldId)}
                      inputRef={el => (inputRefs.current[field.fieldId] = el)}
                      onCaretPositionChange={handleCaretPositionChange}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : (
            boolFields.map(field => {
              const value = getAchievementValue(field.fieldId);
              const stats = getFieldSuccessStats(field.fieldId);
              return (
                <DailyAchievementItem
                  key={field.fieldId}
                  field={field}
                  value={value}
                  stats={stats}
                  onAchieve={async () => {
                    await handleAchievementInput(field.fieldId, 1);
                  }}
                  onPartial={async () => {
                    await handleAchievementInput(field.fieldId, 0.5);
                  }}
                  onUnachieve={async () => {
                    await handleAchievementInput(field.fieldId, 0);
                  }}
                />
              );
            })
          )}
        </div>
        {/* 新規項目追加ボタンとフォーム（編集モード時のみ） */}
        {isEditMode && (
          <div className="w-full max-w-md mt-2 mb-2">
            {showAddField ? (
              <div className="flex items-center gap-1 mb-1 bg-white dark:bg-gray-800 rounded-xl shadow p-2">
                <input
                  type="text"
                  value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="新しい項目名"
                  maxLength={20}
                  data-testid="daily-input-2"
                />
                <Button
                  variant="primary"
                  size="md"
                  icon={HiCheck}
                  aria-label="保存"
                  onClick={handleAddField}
                  disabled={!newFieldName.trim()}
                  data-testid="save-btn"
                >
                  {''}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  icon={HiXMark}
                  aria-label="キャンセル"
                  onClick={() => {
                    setShowAddField(false);
                    setNewFieldName('');
                    setAddFieldError('');
                  }}
                >
                  {''}
                </Button>
              </div>
            ) : (
              <Button
                variant="teal"
                size="md"
                icon={HiPlus}
                fullWidth
                onClick={() => setShowAddField(true)}
                data-testid="add-btn"
              >
                新規項目
              </Button>
            )}
            {addFieldError && (
              <div className="text-red-500 text-sm mt-1">{addFieldError}</div>
            )}
          </div>
        )}
        {/* 編集モード切替・保存・キャンセルボタン */}
        <div className="w-full max-w-md mt-2 mb-2">
          {isEditMode ? (
            <div className="flex gap-1">
              <Button
                variant="success"
                size="md"
                icon={HiCheckCircle}
                onClick={handleEditSave}
                fullWidth
              >
                保存
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={HiXMark}
                onClick={handleEditCancel}
                fullWidth
              >
                キャンセル
              </Button>
            </div>
          ) : (
            <Button
              variant="teal"
              size="md"
              icon={HiPencil}
              fullWidth
              onClick={() => setIsEditMode(true)}
            >
              編集
            </Button>
          )}
        </div>
        {/* 日課ワンポイントアドバイス */}
        <div className="w-full max-w-md mx-auto mb-2 px-4">
          <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-100 p-3 rounded shadow-sm text-sm text-left">
            <strong>【ワンポイント】</strong>{' '}
            日課は毎日少しずつでも続けることが大切です。完璧を目指さず、できた日を積み重ねましょう。少しでもやったら微達成として記録しましょう。
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyRecord;
