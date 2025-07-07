import React, { useEffect, useState } from 'react';
import { FaTrophy } from 'react-icons/fa';
import { HiCheck, HiNoSymbol, HiTrash } from 'react-icons/hi2';
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
  const [newTime, setNewTime] = useState(getCurrentTimeString());
  const [newNote, setNewNote] = useState('');
  const [newExcludeFromGraph, setNewExcludeFromGraph] = useState(false);

  const [weightRecords, setWeightRecords] = useState<WeightRecordV2[]>([]);
  const [loading, setLoading] = useState(false);

  // データ取得
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const all = await getAllWeightRecords();
      setWeightRecords(all);
      setLoading(false);
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

  // スパークル定型文ドロップダウン用 floating-ui
  const [open, setOpen] = useState(false);
  // floating-uiの分割代入は未使用のため削除

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

  const handleAdd = async () => {
    if (!newWeight) return;
    const rec: WeightRecordV2 = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: recordDate,
      time: newTime,
      weight: Number(newWeight),
      note: newNote || null,
      excludeFromGraph: newExcludeFromGraph,
    };
    await addWeightRecord(rec);
    setNewWeight('');
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
              className="flex flex-col gap-2 bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4"
            >
              <div className="flex items-center gap-2 w-full">
                <input
                  type="time"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                  value={rec.time}
                  onChange={e => handleUpdate({ ...rec, time: e.target.value })}
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[7em]"
                  value={rec.weight}
                  onChange={e =>
                    handleUpdate({ ...rec, weight: Number(e.target.value) })
                  }
                  placeholder="体重(kg)"
                />
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
              <textarea
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full mt-1"
                value={rec.note ?? ''}
                onChange={e => handleUpdate({ ...rec, note: e.target.value })}
                placeholder="補足・メモ（任意）"
              />
            </div>
          ))}
        </div>
        {/* 新規項目追加ボタンとフォーム（編集モード時のみ） */}
        <div className="w-full max-w-md mt-6 mb-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 w-full">
              <input
                type="time"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
              />
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
                placeholder="体重(kg)"
              />
              <Button
                variant="success"
                size="sm"
                icon={HiCheck}
                aria-label="保存"
                className="ml-auto"
                onClick={handleAdd}
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
              <label className="flex items-center gap-1 ml-2">
                <input
                  type="checkbox"
                  checked={newExcludeFromGraph}
                  onChange={e => setNewExcludeFromGraph(e.target.checked)}
                />
                <span className="text-xs">グラフ除外</span>
              </label>
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
