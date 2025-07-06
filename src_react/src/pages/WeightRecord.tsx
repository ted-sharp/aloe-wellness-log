import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import React, { useEffect, useMemo, useState } from 'react';
import { FaEraser } from 'react-icons/fa';
import {
  HiCheck,
  HiNoSymbol,
  HiSparkles,
  HiTrash,
  HiXMark,
} from 'react-icons/hi2';
import { PiChartLineDown } from 'react-icons/pi';
import { TbSunrise } from 'react-icons/tb';
import Button from '../components/Button';
import DatePickerBar from '../components/DatePickerBar';
import { useGoalStore } from '../store/goal';
import { useRecordsStore } from '../store/records';

// 共通キー定数を追加
const SELECTED_DATE_KEY = 'shared_selected_date';

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
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

interface WeightRecordProps {
  showTipsModal?: () => void;
}

const WeightRecord: React.FC<WeightRecordProps> = ({ showTipsModal }) => {
  const today = new Date();
  const [centerDate, setCenterDate] = useState<Date>(() => {
    const saved = localStorage.getItem(SELECTED_DATE_KEY);
    return saved ? new Date(saved) : today;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const saved = localStorage.getItem(SELECTED_DATE_KEY);
    return saved ? new Date(saved) : today;
  });
  const {
    fields,
    addRecord,
    updateRecord,
    deleteRecord,
    records,
    loadRecords,
  } = useRecordsStore();
  const { goal, loadGoal } = useGoalStore();

  // 新規項目追加用state
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('');
  const [addFieldError, setAddFieldError] = useState('');

  // 日付・時刻文字列
  const recordDate = formatDate(selectedDate);

  // その日付にfieldId==='weight'の記録が1つでもあればtrue
  const isRecorded = (date: Date) => {
    const d = formatDate(date);
    return records.some(r => r.date === d && r.fieldId === 'weight');
  };

  // newTimeのuseState初期値を現在時刻に
  const getCurrentTimeString = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // 新規追加用state
  const [newWeight, setNewWeight] = useState('');
  const [newTime, setNewTime] = useState(getCurrentTimeString());
  const [newNote, setNewNote] = useState('');

  const numberFields = useMemo(
    () =>
      fields
        .filter(
          f => f.type === 'number' && f.scope === 'weight' && f.defaultDisplay
        )
        .slice()
        .sort((a, b) => {
          if (a.order !== b.order) return (a.order ?? 0) - (b.order ?? 0);
          return a.fieldId.localeCompare(b.fieldId);
        }),
    [fields]
  );

  // その日付の最新体重（記録があれば）
  const latestWeightOfDay = (() => {
    const weightRecords = records
      .filter(
        r =>
          r.fieldId === 'weight' &&
          r.date === recordDate &&
          typeof r.value === 'number'
      )
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    return weightRecords.length > 0 ? Number(weightRecords[0].value) : null;
  })();
  // BMI計算
  const bmi =
    latestWeightOfDay && goal && goal.height
      ? latestWeightOfDay / Math.pow(goal.height / 100, 2)
      : null;

  // bmiをnumber型で保証する変数
  const safeBmi = typeof bmi === 'number' && !isNaN(bmi) ? bmi : 0;

  // BMIインジケーター定義（6段階）
  const bmiBands = [
    { min: 0, max: 18.5, color: '#6ec6f1', label: '低体重', range: '<18.5' },
    {
      min: 18.5,
      max: 25,
      color: '#7edfa0',
      label: '普通体重',
      range: '18.5-24.9',
    },
    {
      min: 25,
      max: 30,
      color: '#b6d97a',
      label: '肥満(1度)',
      range: '25-29.9',
    },
    {
      min: 30,
      max: 35,
      color: '#ffe066',
      label: '肥満(2度)',
      range: '30-34.9',
    },
    {
      min: 35,
      max: 40,
      color: '#ff9800',
      label: '肥満(3度)',
      range: '35-39.9',
    },
    { min: 40, max: 100, color: '#f44336', label: '肥満(4度)', range: '40.0+' },
  ];

  // マーカー位置計算
  const markerLeft = (() => {
    if (bmi === null) return 0;
    let total = 0;
    for (let i = 0; i < bmiBands.length; i++) {
      const b = bmiBands[i];
      if (bmi < b.max) {
        const bandWidth = 100 / bmiBands.length;
        const ratio = (bmi - b.min) / (b.max - b.min);
        return total + bandWidth * ratio;
      }
      total += 100 / bmiBands.length;
    }
    return 100;
  })();

  // BMIカウントアップ用state
  const [animatedBmi, setAnimatedBmi] = useState(0);

  // BMIカウントアップアニメーション
  useEffect(() => {
    if (typeof bmi !== 'number' || isNaN(bmi)) return;
    const start = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimatedBmi(start + (safeBmi - start) * progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedBmi(safeBmi);
      }
    }
    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeBmi]);

  // goal（身長など）が未ロードなら自動でロード
  useEffect(() => {
    if (!goal || !goal.height) {
      loadGoal();
    }
  }, [goal, loadGoal]);

  useEffect(() => {
    localStorage.setItem(SELECTED_DATE_KEY, selectedDate.toISOString());
  }, [selectedDate]);

  // selectedDateが変わったらcenterDateも追従
  useEffect(() => {
    setCenterDate(selectedDate);
  }, [selectedDate]);

  // スパークル定型文ドロップダウン用 floating-ui
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(6), flip(), shift()],
    placement: 'bottom-end',
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // DatePickerBarに渡す直前
  useEffect(() => {
    // No need to log here as per the new code instructions
  }, [centerDate, selectedDate]);

  // 選択日と時刻文字列(HH:mm)からローカル日時文字列を生成
  const buildDateTimeString = (
    date: Date | string,
    timeStr: string
  ): string => {
    const d =
      typeof date === 'string' ? new Date(date) : new Date(date.getTime());
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return formatLocalDateTime(d);
  };

  return (
    <div className="bg-transparent">
      <DatePickerBar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        centerDate={centerDate}
        setCenterDate={setCenterDate}
        today={today}
        isRecorded={isRecorded}
        data-testid="date-picker"
      />
      <div className="w-full max-w-md mx-auto mt-3 mb-3 flex justify-start pl-4">
        <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          {formatDate(selectedDate)}
          {isRecorded(selectedDate) && (
            <HiCheck
              className="inline-block w-6 h-6 text-green-500 ml-2 align-middle"
              aria-label="入力済み"
            />
          )}
          {bmi !== null && goal && goal.height && (
            <span className="ml-4 text-base font-semibold text-blue-700 dark:text-blue-200 align-middle">
              BMI {animatedBmi.toFixed(1)}
            </span>
          )}
        </span>
      </div>
      {/* BMIインジケーター */}
      {bmi && goal && goal.height && (
        <div className="w-full max-w-md mx-auto flex flex-col items-center mb-2">
          <div
            className="relative w-full h-8 flex rounded overflow-hidden shadow"
            style={{ minWidth: 240 }}
          >
            {bmiBands.map(band => (
              <div
                key={band.label}
                className="flex-1 flex flex-col items-center justify-center"
                style={{ background: band.color, minWidth: 0 }}
              >
                <span
                  className="text-[10px] font-bold text-gray-800 dark:text-gray-900 select-none"
                  style={{ lineHeight: 1 }}
                >
                  {band.label}
                </span>
              </div>
            ))}
            {/* マーカー（帯の上・逆三角） */}
            <div
              className="absolute left-0 top-0 w-full pointer-events-none"
              style={{ height: '100%' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${markerLeft}% - 0.65em)`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#222',
                  fontSize: '1.5em',
                  textShadow: '0 0 2px #fff, 0 0 2px #fff, 1px 1px 2px #0002',
                  zIndex: 2,
                }}
                aria-label="現在のBMI位置"
              >
                ▼
              </div>
            </div>
          </div>
          <div className="w-full flex justify-between mt-1 px-1">
            {bmiBands.map(band => (
              <span
                key={band.label + '-range'}
                className="text-[10px] text-gray-700 dark:text-gray-200"
                style={{ minWidth: 0 }}
              >
                {band.range}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-start min-h-[60vh]">
        <div className="flex flex-col gap-6 w-full max-w-md">
          {numberFields.map(field => {
            // 同日・同項目の全記録を取得
            const recordsOfDay = records
              .filter(r => r.fieldId === field.fieldId && r.date === recordDate)
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

            return (
              <div
                key={field.fieldId}
                className="flex flex-col gap-4 bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4"
              >
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200 min-w-[5em] mb-2">
                  {field.name}
                </span>
                {/* 既存記録リスト */}
                {recordsOfDay.length > 0 &&
                  recordsOfDay.map(rec => {
                    return (
                      <div
                        key={rec.id}
                        className="flex flex-col gap-1 w-full relative"
                      >
                        {/* 1行目: 時刻・体重・操作ボタン群 */}
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="time"
                            className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                            defaultValue={rec.time || '08:00'}
                            onBlur={async e => {
                              if (e.target.value !== rec.time) {
                                await updateRecord({
                                  ...rec,
                                  time: e.target.value,
                                  datetime: buildDateTimeString(
                                    rec.date,
                                    e.target.value
                                  ),
                                });
                                await loadRecords();
                              }
                            }}
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[7em]"
                            defaultValue={
                              typeof rec.value === 'string' ||
                              typeof rec.value === 'number'
                                ? rec.value
                                : ''
                            }
                            onBlur={async e => {
                              if (Number(e.target.value) !== rec.value) {
                                await updateRecord({
                                  ...rec,
                                  value: Number(e.target.value),
                                  datetime: buildDateTimeString(
                                    rec.date,
                                    rec.time || '00:00'
                                  ),
                                });
                                await loadRecords();
                              }
                            }}
                            data-testid="weight-input"
                          />
                          <div className="flex gap-1 ml-auto">
                            <Button
                              variant="danger"
                              size="sm"
                              icon={HiTrash}
                              aria-label="削除"
                              onClick={async () => {
                                if (window.confirm('本当に削除しますか？')) {
                                  await deleteRecord(rec.id);
                                  await loadRecords();
                                }
                              }}
                              children=""
                            />
                            <Button
                              variant={
                                rec.excludeFromGraph === true
                                  ? 'secondary'
                                  : 'sky'
                              }
                              size="sm"
                              aria-label={
                                rec.excludeFromGraph === true
                                  ? 'グラフ除外'
                                  : 'グラフ表示'
                              }
                              onClick={async () => {
                                await updateRecord({
                                  ...rec,
                                  excludeFromGraph: !rec.excludeFromGraph,
                                });
                                await loadRecords();
                              }}
                            >
                              <span className="relative inline-block w-5 h-5">
                                <PiChartLineDown className="w-5 h-5 text-white" />
                                {rec.excludeFromGraph === true && (
                                  <HiNoSymbol className="w-5 h-5 text-red-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                                )}
                              </span>
                            </Button>
                          </div>
                        </div>
                        {/* 2行目: note欄 */}
                        <textarea
                          className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full mt-1"
                          rows={1}
                          defaultValue={rec.note || ''}
                          onBlur={async e => {
                            if ((e.target.value || '') !== (rec.note || '')) {
                              await updateRecord({
                                ...rec,
                                note: e.target.value,
                              });
                              await loadRecords();
                            }
                          }}
                          placeholder="補足・メモ（任意）"
                        />
                      </div>
                    );
                  })}
                {/* 新規追加欄 */}
                <div className="flex flex-col gap-1 w-full mt-2">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="time"
                      className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                    />
                    {/* 朝のマーク（7:00セット）ボタン */}
                    <button
                      type="button"
                      className="ml-1 w-12 h-10 min-w-0 min-h-0 p-0 inline-flex items-center justify-center rounded-full bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-300/20 dark:hover:bg-yellow-300/40 border border-yellow-300 text-yellow-500 dark:text-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm overflow-hidden"
                      title="朝7時にセット"
                      aria-label="朝7時にセット"
                      onClick={() => setNewTime('07:00')}
                    >
                      <TbSunrise className="w-6 h-6" />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[7em]"
                      value={newWeight}
                      onChange={e => setNewWeight(e.target.value)}
                      placeholder={
                        field.unit ? `例: 0.0 (${field.unit})` : '例: 0.0'
                      }
                    />
                    <Button
                      variant="success"
                      size="sm"
                      icon={HiCheck}
                      aria-label="保存"
                      className="ml-auto"
                      onClick={async () => {
                        if (!newWeight) return;
                        await addRecord({
                          id: `${Date.now()}-${Math.random()
                            .toString(36)
                            .substr(2, 9)}`,
                          fieldId: field.fieldId,
                          value: Number(newWeight),
                          date: recordDate,
                          time: newTime,
                          datetime: buildDateTimeString(selectedDate, newTime),
                          note: newNote,
                        });
                        setNewWeight('');
                        setNewTime(getCurrentTimeString());
                        setNewNote('');
                        await loadRecords();
                        const disableTips =
                          localStorage.getItem('disableTips') === '1';
                        // 本日TIPS表示済みかチェック
                        const today = new Date();
                        const yyyy = today.getFullYear();
                        const mm = String(today.getMonth() + 1).padStart(
                          2,
                          '0'
                        );
                        const dd = String(today.getDate()).padStart(2, '0');
                        const todayStr = `${yyyy}-${mm}-${dd}`;
                        const lastTipsDate =
                          localStorage.getItem('lastTipsDate');
                        if (
                          !disableTips &&
                          lastTipsDate !== todayStr &&
                          showTipsModal
                        )
                          showTipsModal();
                      }}
                      data-testid="save-btn"
                    >
                      {''}
                    </Button>
                  </div>
                  <div className="relative w-full mt-1">
                    <textarea
                      className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full pr-16"
                      rows={1}
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="補足・メモ（任意）"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <div className="relative group">
                        <div
                          ref={refs.setReference}
                          {...getReferenceProps({})}
                          className="w-6 h-6 flex items-center justify-center text-yellow-400 cursor-pointer align-middle hover:opacity-80 focus:outline-none"
                          tabIndex={0}
                          aria-label="定型文を挿入"
                          onClick={() => setOpen(v => !v)}
                        >
                          <HiSparkles className="w-6 h-6" />
                        </div>
                        {open && (
                          <FloatingPortal>
                            <div
                              ref={refs.setFloating}
                              style={floatingStyles}
                              {...getFloatingProps({
                                className:
                                  'z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[120px] py-1',
                              })}
                            >
                              {[
                                '朝一',
                                '朝食後',
                                '昼食前',
                                '昼食後',
                                '夕食前',
                                '夕食後',
                                '運動後',
                              ].map(option => (
                                <button
                                  key={option}
                                  type="button"
                                  className="block w-full text-left px-4 py-2 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900"
                                  onClick={() => {
                                    setNewNote(
                                      newNote ? newNote + ' ' + option : option
                                    );
                                    setOpen(false);
                                  }}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </FloatingPortal>
                        )}
                      </div>
                      <div
                        className="w-6 h-6 flex items-center justify-center text-pink-300 hover:text-pink-500 transition-colors duration-150 cursor-pointer align-middle hover:opacity-80 focus:outline-none"
                        tabIndex={0}
                        aria-label="メモを消去（消しゴム）"
                        onClick={() => setNewNote('')}
                      >
                        <FaEraser className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* 新規項目追加ボタンとフォーム（編集モード時のみ） */}
        {showAddField && (
          <div className="w-full max-w-md mt-6 mb-2">
            <div className="flex items-center gap-2 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <input
                type="text"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="新しい項目名"
                maxLength={20}
              />
              <input
                type="text"
                value={newFieldUnit}
                onChange={e => setNewFieldUnit(e.target.value)}
                className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="単位"
                maxLength={10}
              />
              <Button
                variant="primary"
                size="md"
                icon={HiCheck}
                aria-label="保存"
                onClick={async () => {
                  setShowAddField(false);
                  setNewFieldName('');
                  setNewFieldUnit('');
                  setAddFieldError('');
                }}
                disabled={!newFieldName.trim()}
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
                  setNewFieldUnit('');
                  setAddFieldError('');
                }}
              >
                {''}
              </Button>
            </div>
            {addFieldError && (
              <div className="text-red-500 text-sm mt-1">{addFieldError}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightRecord;
