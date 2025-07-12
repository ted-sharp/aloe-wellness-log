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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HiCheck, HiNoSymbol, HiTrash } from 'react-icons/hi2';
import { MdAutoAwesome } from 'react-icons/md';
import { PiChartLineDown } from 'react-icons/pi';
import BMIIndicator from '../components/BMIIndicator';
import Button from '../components/Button';
import DatePickerBar from '../components/DatePickerBar';
import NumberInput from '../components/NumberInput';
import TimeInputWithPresets from '../components/TimeInputWithPresets';
import {
  addWeightRecord,
  deleteWeightRecord,
  getAllWeightRecords,
  updateWeightRecord,
} from '../db/indexedDb';
import { useGoalStore } from '../store/goal';
import type { WeightRecordV2 } from '../types/record';
import { formatDate, getCurrentTimeString, SELECTED_DATE_KEY } from '../utils/dateUtils';


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
  const recordDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  // 新規追加用state
  const [newWeight, setNewWeight] = useState('');
  const [newBodyFat, setNewBodyFat] = useState(''); // 体脂肪率
  const [newWaist, setNewWaist] = useState(''); // ウェスト
  const [newTime, setNewTime] = useState(getCurrentTimeString());
  const [newNote, setNewNote] = useState('');
  const [newExcludeFromGraph, setNewExcludeFromGraph] = useState(false);

  const [weightRecords, setWeightRecords] = useState<WeightRecordV2[]>([]);

  // その日付にfieldId==='weight'の記録が1つでもあればtrue
  const isRecorded = useCallback((date: Date) => {
    const d = formatDate(date);
    return weightRecords.some(r => r.date === d);
  }, [weightRecords]);

  // データ取得
  useEffect(() => {
    const fetchRecords = async () => {
      const all = await getAllWeightRecords();
      setWeightRecords(all);
    };
    fetchRecords();
  }, []);

  // recordsOfDayの定義をlatestWeightOfDayより前に移動
  const recordsOfDay = useMemo(() => 
    weightRecords.filter(r => r.date === recordDate), 
    [weightRecords, recordDate]
  );

  // その日付の最新体重（記録があれば）
  const latestWeightOfDay = useMemo(() => {
    if (recordsOfDay.length === 0) return null;
    const sorted = [...recordsOfDay].sort((a, b) =>
      (b.time || '').localeCompare(a.time || '')
    );
    return sorted.length > 0 ? Number(sorted[0].weight) : null;
  }, [recordsOfDay]);


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

  const handleAdd = useCallback(async () => {
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
  }, [newWeight, recordDate, newTime, newBodyFat, newWaist, newNote, newExcludeFromGraph, showTipsModal]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('本当に削除しますか？')) return;
    await deleteWeightRecord(id);
    const all = await getAllWeightRecords();
    setWeightRecords(all);
  }, []);

  const handleUpdate = useCallback(async (rec: WeightRecordV2) => {
    await updateWeightRecord(rec);
    const all = await getAllWeightRecords();
    setWeightRecords(all);
  }, []);

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
        </span>
      </div>
      {/* BMI表示とインジケーター */}
      <BMIIndicator
        currentWeight={latestWeightOfDay}
        goal={goal}
        showWeightDiff={true}
      />
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
              <TimeInputWithPresets
                value={newTime}
                onChange={setNewTime}
              />
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
              <NumberInput
                value={newWeight}
                onChange={setNewWeight}
                placeholder="体重"
                step="0.1"
                min="0"
                width="md"
              />
              <span className="ml-0.5 mr-3 text-gray-500">kg</span>
              <NumberInput
                value={newBodyFat}
                onChange={setNewBodyFat}
                placeholder="体脂肪"
                step="0.1"
                min="0"
                width="md"
              />
              <span className="ml-0.5 mr-3 text-gray-500">%</span>
              <NumberInput
                value={newWaist}
                onChange={setNewWaist}
                placeholder="腹囲"
                step="0.1"
                min="0"
                width="md"
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
            体重はできるだけ毎日同じタイミング（例：朝起きてトイレ後、食事前など）で測ると、日々の変化がより正確にわかります。同じタイミングではない記録はグラフから除外できます。
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightRecord;
