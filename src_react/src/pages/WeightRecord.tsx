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
import React, { useEffect, useState } from 'react';
import { FaTrophy } from 'react-icons/fa';
import { HiCheck, HiNoSymbol, HiTrash } from 'react-icons/hi2';
import { MdAutoAwesome, MdFlashOn } from 'react-icons/md';
import { PiChartLineDown } from 'react-icons/pi';
import { TbSunrise } from 'react-icons/tb';
import Button from '../components/Button';
import DatePickerBar from '../components/DatePickerBar';
import {
  addWeightRecord,
  deleteWeightRecord,
  getAllWeightRecords,
  updateWeightRecord,
} from '../db/indexedDb';
import { useGoalStore } from '../store/goal';
import type { WeightRecordV2 } from '../types/record';

// 共通キー定数を追加
const SELECTED_DATE_KEY = 'shared_selected_date';

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

interface WeightRecordProps {
  showTipsModal?: () => void;
}

// メモ欄用の例文リスト
const noteExamples = [
  '朝一',
  '朝食後',
  '夕食前',
  '夕食後',
  '就寝前',
  '運動後に測定',
  '外食あり',
];

// スパークルドロップダウン共通フック
function useSparkleDropdown() {
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
  return {
    open,
    setOpen,
    refs,
    floatingStyles,
    getReferenceProps,
    getFloatingProps,
  };
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
  const { goal, loadGoal } = useGoalStore();

  // 日付・時刻文字列
  const recordDate = formatDate(selectedDate);

  // その日付にfieldId==='weight'の記録が1つでもあればtrue
  const isRecorded = (date: Date) => {
    const d = formatDate(date);
    return weightRecords.some(r => r.date === d);
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
  const [newBodyFat, setNewBodyFat] = useState(''); // 体脂肪率
  const [newWaist, setNewWaist] = useState(''); // ウェスト
  const [newTime, setNewTime] = useState(getCurrentTimeString());
  const [newNote, setNewNote] = useState('');
  const [newExcludeFromGraph, setNewExcludeFromGraph] = useState(false);

  const [weightRecords, setWeightRecords] = useState<WeightRecordV2[]>([]);

  // データ取得
  useEffect(() => {
    const fetchRecords = async () => {
      const all = await getAllWeightRecords();
      setWeightRecords(all);
    };
    fetchRecords();
  }, []);

  // recordsOfDayの定義をlatestWeightOfDayより前に移動
  const recordsOfDay: WeightRecordV2[] = weightRecords.filter(
    r => r.date === recordDate
  );

  // その日付の最新体重（記録があれば）
  const latestWeightOfDay = (() => {
    if (recordsOfDay.length === 0) return null;
    const sorted = [...recordsOfDay].sort((a, b) =>
      (b.time || '').localeCompare(a.time || '')
    );
    return sorted.length > 0 ? Number(sorted[0].weight) : null;
  })();

  // BMI計算
  const bmi =
    latestWeightOfDay && goal && goal.height
      ? latestWeightOfDay / Math.pow(goal.height / 100, 2)
      : null;
  const safeBmi = typeof bmi === 'number' && !isNaN(bmi) ? bmi : 0;
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
  const [animatedBmi, setAnimatedBmi] = useState(0);
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
  const [animatedDiff, setAnimatedDiff] = useState(0);
  useEffect(() => {
    if (
      goal &&
      goal.startWeight !== undefined &&
      latestWeightOfDay !== null &&
      latestWeightOfDay - goal.startWeight < 0
    ) {
      const diff = latestWeightOfDay - goal.startWeight;
      const start = 0;
      const duration = 800;
      const startTime = performance.now();
      function animate(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimatedDiff(start + (diff - start) * progress);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setAnimatedDiff(diff);
        }
      }
      requestAnimationFrame(animate);
    } else {
      setAnimatedDiff(0);
    }
  }, [goal, latestWeightOfDay]);

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

  // DatePickerBarに渡す直前
  useEffect(() => {
    // No need to log here as per the new code instructions
  }, [centerDate, selectedDate]);

  const handleAdd = async () => {
    if (!newWeight) return;
    const rec: WeightRecordV2 = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: recordDate,
      time: newTime,
      weight: Number(newWeight),
      bodyFat: newBodyFat !== '' ? Number(newBodyFat) : null,
      waist: newWaist !== '' ? Number(newWaist) : null,
      note: newNote || null,
      excludeFromGraph: newExcludeFromGraph,
    };
    await addWeightRecord(rec);
    setNewWeight('');
    setNewBodyFat('');
    setNewWaist('');
    setNewNote('');
    setNewExcludeFromGraph(false);
    setNewTime(getCurrentTimeString());
    const all = await getAllWeightRecords();
    setWeightRecords(all);
    if (showTipsModal) showTipsModal();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('本当に削除しますか？')) return;
    await deleteWeightRecord(id);
    const all = await getAllWeightRecords();
    setWeightRecords(all);
  };

  const handleUpdate = async (rec: WeightRecordV2) => {
    await updateWeightRecord(rec);
    const all = await getAllWeightRecords();
    setWeightRecords(all);
  };

  // メモ欄用スパークルドロップダウン
  const noteSparkle = useSparkleDropdown();

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
            <span
              className="ml-4 text-base font-semibold text-blue-700 dark:text-blue-200 align-middle"
              style={{
                display: 'inline-block',
                minWidth: '4.2em',
                textAlign: 'right',
              }}
            >
              BMI{' '}
              <span
                style={{
                  display: 'inline-block',
                  minWidth: '3.5ch',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                }}
              >
                {animatedBmi.toFixed(1)}
              </span>
              {/* トロフィーと体重差分表示 */}
              {goal.startWeight !== undefined &&
                latestWeightOfDay !== null &&
                latestWeightOfDay - goal.startWeight < 0 &&
                (() => {
                  return (
                    <span
                      className="ml-3 align-middle inline-flex items-center"
                      title="開始体重との差分"
                    >
                      <FaTrophy
                        className="inline-block mr-1"
                        style={{
                          color: '#FFD700',
                          fontSize: '1.1em',
                          verticalAlign: 'middle',
                        }}
                      />
                      <span className="font-bold" style={{ color: '#FFD700' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            minWidth: '2.8em',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                          }}
                        >
                          {animatedDiff.toFixed(1)}
                        </span>
                        kg
                      </span>
                    </span>
                  );
                })()}
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
          {recordsOfDay.map(rec => (
            <div
              key={rec.id}
              className="flex flex-col gap-1 bg-white dark:bg-gray-800 rounded-xl shadow p-2 mb-1"
            >
              <div className="flex items-center w-full mb-1 justify-between">
                <input
                  type="time"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                  value={rec.time}
                  onChange={e => handleUpdate({ ...rec, time: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    icon={HiTrash}
                    aria-label="削除"
                    onClick={() => handleDelete(rec.id)}
                  >
                    {''}
                  </Button>
                  <Button
                    variant={rec.excludeFromGraph ? 'secondary' : 'sky'}
                    size="sm"
                    aria-label={
                      rec.excludeFromGraph ? 'グラフ除外' : 'グラフ表示'
                    }
                    onClick={() =>
                      handleUpdate({
                        ...rec,
                        excludeFromGraph: !rec.excludeFromGraph,
                      })
                    }
                  >
                    {''}
                    <span className="relative inline-block w-5 h-5">
                      <PiChartLineDown className="w-5 h-5 text-white" />
                      {rec.excludeFromGraph && (
                        <HiNoSymbol className="w-5 h-5 text-red-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </span>
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1 w-full">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-mono font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-20 placeholder:font-normal placeholder:text-sm placeholder-gray-400"
                  value={rec.weight}
                  onChange={e =>
                    handleUpdate({ ...rec, weight: Number(e.target.value) })
                  }
                  placeholder="体重"
                />
                <span className="ml-0.5 mr-3 text-gray-500">kg</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-mono font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-20 placeholder:font-normal placeholder:text-xs placeholder-gray-400"
                  value={rec.bodyFat ?? ''}
                  onChange={e =>
                    handleUpdate({
                      ...rec,
                      bodyFat:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="体脂肪"
                />
                <span className="ml-0.5 mr-3 text-gray-500">%</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-mono font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-20 placeholder:font-normal placeholder:text-sm placeholder-gray-400"
                  value={rec.waist ?? ''}
                  onChange={e =>
                    handleUpdate({
                      ...rec,
                      waist:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="腹囲"
                />
                <span className="ml-0.5 mr-3 text-gray-500">cm</span>
              </div>
              <textarea
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full pr-10 mb-0"
                value={rec.note ?? ''}
                onChange={e => handleUpdate({ ...rec, note: e.target.value })}
                placeholder="補足・メモ（任意）"
              />
            </div>
          ))}
        </div>
        {/* 新規項目追加ボタンとフォーム（編集モード時のみ） */}
        <div className="w-full max-w-md mt-2 mb-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2 mb-0 flex flex-col gap-1">
            <div className="flex items-center w-full mb-1 justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                />
                <button
                  type="button"
                  className="h-10 px-3 rounded-xl bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-300/20 dark:hover:bg-yellow-300/40 border border-yellow-300 text-yellow-500 dark:text-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow flex items-center justify-center transition-colors duration-150"
                  title="朝7時にセット"
                  aria-label="朝7時にセット"
                  onClick={() => setNewTime('07:00')}
                >
                  <TbSunrise className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  className="h-10 px-3 rounded-xl bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-300/20 dark:hover:bg-yellow-300/40 border border-yellow-300 text-yellow-500 dark:text-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow flex items-center justify-center transition-colors duration-150"
                  title="現在時刻にセット"
                  aria-label="現在時刻にセット"
                  onClick={() => setNewTime(getCurrentTimeString())}
                >
                  <MdFlashOn className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="success"
                  size="sm"
                  icon={HiCheck}
                  aria-label="保存"
                  onClick={handleAdd}
                  data-testid="save-btn"
                >
                  {''}
                </Button>
                <Button
                  variant={newExcludeFromGraph ? 'secondary' : 'sky'}
                  size="sm"
                  aria-label={newExcludeFromGraph ? 'グラフ除外' : 'グラフ表示'}
                  onClick={() => setNewExcludeFromGraph(v => !v)}
                >
                  {''}
                  <span className="relative inline-block w-5 h-5">
                    <PiChartLineDown className="w-5 h-5 text-white" />
                    {newExcludeFromGraph && (
                      <HiNoSymbol className="w-5 h-5 text-red-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </span>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1 w-full mb-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-mono font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-20 placeholder:font-normal placeholder:text-sm placeholder-gray-400"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="体重"
              />
              <span className="ml-0.5 mr-3 text-gray-500">kg</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-mono font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-20 placeholder:font-normal placeholder:text-xs placeholder-gray-400"
                value={newBodyFat}
                onChange={e => setNewBodyFat(e.target.value)}
                placeholder="体脂肪"
              />
              <span className="ml-0.5 mr-3 text-gray-500">%</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-mono font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-20 placeholder:font-normal placeholder:text-sm placeholder-gray-400"
                value={newWaist}
                onChange={e => setNewWaist(e.target.value)}
                placeholder="腹囲"
              />
              <span className="ml-0.5 mr-3 text-gray-500">cm</span>
            </div>
            <div className="relative w-full mt-0">
              <textarea
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full pr-10 mb-0"
                rows={1}
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="補足・メモ（任意）"
              />
              <div
                ref={noteSparkle.refs.setReference}
                {...noteSparkle.getReferenceProps({})}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-yellow-400 cursor-pointer align-middle hover:opacity-80 focus:outline-none"
                tabIndex={0}
                aria-label="定型文を挿入"
                onClick={() => noteSparkle.setOpen(v => !v)}
              >
                <MdAutoAwesome className="w-6 h-6" />
              </div>
              {noteSparkle.open && (
                <FloatingPortal>
                  <div
                    ref={noteSparkle.refs.setFloating}
                    style={noteSparkle.floatingStyles}
                    {...noteSparkle.getFloatingProps({
                      className:
                        'z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[180px] py-1',
                    })}
                  >
                    {noteExamples.map(option => (
                      <button
                        key={option}
                        type="button"
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900"
                        onClick={() => {
                          setNewNote(option);
                          noteSparkle.setOpen(false);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </FloatingPortal>
              )}
            </div>
          </div>
        </div>
        {/* 体重測定タイミングの注意事項（カード直下・隙間最小） */}
        <div className="w-full max-w-md mx-auto mb-2 px-4">
          <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-100 p-3 rounded shadow-sm text-sm text-left">
            <strong>【ワンポイント】</strong>{' '}
            体重はできるだけ毎日同じタイミング（例：朝起きてトイレ後、食事前など）で測ると、日々の変化がより正確にわかります。
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightRecord;
