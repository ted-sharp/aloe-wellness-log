import React, { useCallback, useEffect, useRef, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { HiCalendarDays } from 'react-icons/hi2';
import Button from '../components/Button';
import { useI18n } from '../hooks/useI18n';
import { useRecordsStore } from '../store/records';

/**
 * 毎日記録ページ（今後実装予定）
 */

// 日付ユーティリティ
const BUTTON_WIDTH = 56; // px, Tailwind w-14
const MIN_BUTTONS = 5; // 最低表示数
const MAX_BUTTONS = 21; // 最大表示数（過剰な横スクロール防止）

const getDateArray = (centerDate: Date, range: number) => {
  const arr = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    arr.push(new Date(d));
  }
  return arr;
};

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDay = (date: Date) => {
  return `${date.getDate()}`;
};

const formatWeekday = (date: Date) => {
  return ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
};

// ダミー：偶数日なら入力済み
const isRecorded = (date: Date) => date.getDate() % 2 === 0;

// 日付・時刻ユーティリティ
const formatLocalTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};
const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const DailyRecord: React.FC = () => {
  const today = new Date();
  const [centerDate, setCenterDate] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [buttonCount, setButtonCount] = useState<number>(MIN_BUTTONS);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 日付ピッカーとボタン群のref
  const pickerRef = useRef<HTMLDivElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);

  const {
    fields,
    addRecord,
    updateRecord,
    deleteRecord,
    records,
    addField,
    loadRecords,
  } = useRecordsStore();
  const { t, translateFieldName } = useI18n();

  // 新規項目追加用state
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [addFieldError, setAddFieldError] = useState('');

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        handleNext();
      } else if (e.deltaY > 0) {
        handlePrev();
      }
    };
    const picker = pickerRef.current;
    const btns = btnsRef.current;
    if (picker)
      picker.addEventListener('wheel', handleWheel, { passive: false });
    if (btns) btns.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      if (picker) picker.removeEventListener('wheel', handleWheel);
      if (btns) btns.removeEventListener('wheel', handleWheel);
    };
    // eslint-disable-next-line
  }, [centerDate]);

  // 画面幅に応じてボタン数を再計算
  const updateButtonCount = useCallback(() => {
    const width = window.innerWidth;
    // 左右の余白やボタン間gap(8px*個数)を考慮
    const maxButtons = Math.floor((width - 64) / (BUTTON_WIDTH + 8));
    setButtonCount(Math.max(MIN_BUTTONS, Math.min(MAX_BUTTONS, maxButtons)));
  }, []);

  useEffect(() => {
    updateButtonCount();
    window.addEventListener('resize', updateButtonCount);
    return () => window.removeEventListener('resize', updateButtonCount);
  }, [updateButtonCount]);

  const range = Math.floor(buttonCount / 2);
  const dateArray = getDateArray(centerDate, range);

  const handlePrev = () => {
    const prev = new Date(centerDate);
    prev.setDate(centerDate.getDate() - 1);
    setCenterDate(prev);
  };
  const handleNext = () => {
    const next = new Date(centerDate);
    next.setDate(centerDate.getDate() + 1);
    setCenterDate(next);
  };

  const handleSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // 表示するbool型フィールド
  const boolFields = fields
    .filter(f => f.type === 'boolean' && f.defaultDisplay)
    .sort((a, b) => (a.order || 999) - (b.order || 999));
  // 日付・時刻文字列
  const recordDate = formatDate(selectedDate);
  const recordTime = formatLocalTime(selectedDate);
  // 既存記録の取得
  const getBoolRecord = (fieldId: string) =>
    records.find(r => r.fieldId === fieldId && r.date === recordDate);
  const getBoolValue = (fieldId: string): boolean | undefined => {
    const rec = getBoolRecord(fieldId);
    return typeof rec?.value === 'boolean' ? rec.value : undefined;
  };
  // ボタン押下時の保存/切替/解除処理
  const handleBoolInput = async (fieldId: string, value: boolean) => {
    const rec = getBoolRecord(fieldId);
    if (rec && rec.value === value) {
      // 同じ値を押したら記録削除
      await deleteRecord(rec.id);
      await loadRecords();
    } else if (rec) {
      // 異なる値なら上書き
      await updateRecord({ ...rec, value });
      await loadRecords();
    } else {
      // 新規追加
      const now = new Date();
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await addRecord({
        id,
        fieldId,
        value,
        date: recordDate,
        time: recordTime,
        datetime: formatLocalDateTime(now),
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
    // 重複チェック
    if (fields.some(f => f.name === name)) {
      setAddFieldError('同じ名前の項目が既に存在します');
      return;
    }
    const fieldId = `custom_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;
    await addField({
      fieldId,
      name,
      type: 'boolean',
      order: (fields.length + 1) * 10,
      defaultDisplay: true,
    });
    setShowAddField(false);
    setNewFieldName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-800 dark:to-gray-900">
      {/* 日付ピッカー */}
      <div
        ref={pickerRef}
        className="w-full flex items-center justify-center py-6 bg-white/80 dark:bg-gray-900/80 shadow-md sticky top-0 z-10"
      >
        {/* カレンダーアイコンボタン（左端） */}
        <button
          type="button"
          onClick={() => setIsCalendarOpen(true)}
          className="ml-2 mr-1 flex items-center justify-center w-12 h-12 rounded-full border-2 border-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="カレンダーを開く"
        >
          <HiCalendarDays className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </button>
        <div
          ref={btnsRef}
          className="flex-1 flex gap-1 mx-1 overflow-x-auto justify-center"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* スクロールバー非表示 for Webkit */}
          <style>{`
            .scrollbar-hide::-webkit-scrollbar, .scrollbar-none::-webkit-scrollbar, .scrollbar-fake::-webkit-scrollbar {
              display: none !important;
            }
          `}</style>
          {dateArray.map((date, idx) => {
            const isSelected = formatDate(date) === formatDate(selectedDate);
            const isToday = formatDate(date) === formatDate(today);
            const prevDate = idx > 0 ? dateArray[idx - 1] : null;
            const showMonth =
              idx === 0 ||
              (prevDate && date.getMonth() !== prevDate.getMonth());
            // 曜日ごとの文字色
            const dayOfWeek = date.getDay();
            const weekdayColor =
              dayOfWeek === 0
                ? 'text-red-500'
                : dayOfWeek === 6
                ? 'text-blue-500'
                : '';
            // 中央ボタン判定
            const isCenter = idx === range;
            return (
              <React.Fragment key={formatDate(date)}>
                {showMonth && (
                  <span
                    className="flex flex-col items-center justify-center min-w-14 w-14 max-w-14 h-14 px-0 py-0 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold select-none cursor-default border border-gray-300 dark:border-gray-600"
                    aria-hidden="true"
                  >
                    {date.getMonth() + 1}月
                  </span>
                )}
                <button
                  onClick={() => handleSelect(date)}
                  className={`flex flex-col items-center justify-center min-w-14 w-14 max-w-14 h-14 px-0 py-0 rounded-xl border-2 transition-colors duration-150
                    ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isToday
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    }
                    hover:bg-blue-200 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400
                    ${isCenter ? 'border-4 border-blue-400 z-10' : ''}`}
                  aria-current={isSelected ? 'date' : undefined}
                  style={{ position: 'relative' }}
                >
                  <span className={`text-xs font-medium ${weekdayColor}`}>
                    {formatWeekday(date)}
                  </span>
                  <span className="text-lg font-bold">{formatDay(date)}</span>
                  {isRecorded(date) && (
                    <span className="absolute top-1 right-1">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="9"
                          stroke="#22c55e"
                          strokeWidth="2"
                          fill="white"
                        />
                        <path
                          d="M6 10.5l3 3 5-5"
                          stroke="#22c55e"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {/* タイトル：日付ピッカー下・左上 */}
      <div className="w-full max-w-md mx-auto mt-2 mb-4 flex justify-start pl-4">
        <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          {formatDate(selectedDate)}
        </span>
      </div>
      {/* メインコンテンツ */}
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col gap-6 w-full max-w-md">
          {boolFields.map(field => {
            const value = getBoolValue(field.fieldId);
            return (
              <div
                key={field.fieldId}
                className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow p-4"
              >
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200 min-w-[5em]">
                  {translateFieldName(field.fieldId)}
                </span>
                <Button
                  variant={value === true ? 'primary' : 'secondary'}
                  size="md"
                  onClick={async () => {
                    if (value === true) {
                      // あり→未選択（解除）
                      const rec = getBoolRecord(field.fieldId);
                      if (rec) {
                        await deleteRecord(rec.id);
                        await loadRecords();
                      }
                    } else {
                      await handleBoolInput(field.fieldId, true);
                    }
                  }}
                  aria-pressed={value === true}
                  className="flex-1"
                >
                  {t('fields.yes')}
                </Button>
                <Button
                  variant={value === false ? 'primary' : 'secondary'}
                  size="md"
                  onClick={async () => {
                    if (value === false) {
                      // なし→未選択（解除）
                      const rec = getBoolRecord(field.fieldId);
                      if (rec) {
                        await deleteRecord(rec.id);
                        await loadRecords();
                      }
                    } else {
                      await handleBoolInput(field.fieldId, false);
                    }
                  }}
                  aria-pressed={value === false}
                  className="flex-1"
                >
                  {t('fields.no')}
                </Button>
              </div>
            );
          })}
        </div>
        {/* 新規項目追加ボタンとフォーム（下部） */}
        <div className="w-full max-w-md mt-8">
          {showAddField ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="新しい項目名を入力"
                autoFocus
              />
              <Button variant="success" size="sm" onClick={handleAddField}>
                {t('actions.save') || '保存'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddField(false);
                  setNewFieldName('');
                }}
              >
                {t('actions.cancel') || 'キャンセル'}
              </Button>
            </div>
          ) : (
            <Button
              variant="teal"
              size="md"
              fullWidth
              onClick={() => setShowAddField(true)}
            >
              {t('pages.input.fieldManagement.addNewField') || '＋新規項目'}
            </Button>
          )}
          {addFieldError && (
            <div className="text-red-600 text-sm mt-1">{addFieldError}</div>
          )}
        </div>
      </div>
      {/* カレンダーモーダル */}
      {isCalendarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 w-[95vw] max-w-md relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
              aria-label="閉じる"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M6 18L18 6"
                />
              </svg>
            </button>
            <Calendar
              onChange={date => {
                setSelectedDate(date as Date);
                setCenterDate(date as Date);
                setIsCalendarOpen(false);
              }}
              value={selectedDate}
              locale="ja-JP"
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyRecord;
