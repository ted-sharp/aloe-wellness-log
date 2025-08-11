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
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useState } from 'react';
import { HiCheck, HiNoSymbol, HiTrash } from 'react-icons/hi2';
import { MdAutoAwesome } from 'react-icons/md';
import { PiChartLineDown } from 'react-icons/pi';
import BMIIndicator from '../components/BMIIndicator';
import Button from '../components/Button';
import DatePickerBar from '../components/DatePickerBar';
import NumberInput from '../components/NumberInput';
import TimeInputWithPresets from '../components/TimeInputWithPresets';
import { weightRecordRepository } from '../db';
import { useWeightRecordLogic } from '../hooks/business/useWeightRecordLogic';
import { useDateSelection } from '../hooks/useDateSelection';
import { useRecordCRUD } from '../hooks/useRecordCRUD';
import { useRecordForm } from '../hooks/useRecordForm';
import { useGoalStore } from '../store/goal.mobx';
import type { WeightRecordV2 } from '../types/record';
import { getCurrentTimeString } from '../utils/dateUtils';

interface WeightRecordProps {
  showTipsModal?: () => void;
}

// メモ欄用の例文リストは useWeightRecordLogic から取得

// フォームの初期値
const initialFormValues = {
  weight: '',
  bodyFat: '',
  waist: '',
  time: getCurrentTimeString(),
  note: '',
  excludeFromGraph: false,
};

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
  const { goal, loadGoal } = useGoalStore();

  // useCallbackで関数を安定化して無限ループを防ぐ
  const getAllRecords = useCallback(async () => {
    const result = await weightRecordRepository.getAll();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch records');
    }
    return result.data || [];
  }, []);

  const addRecordCallback = useCallback(async (record: WeightRecordV2) => {
    const result = await weightRecordRepository.add(record);
    if (!result.success) {
      throw new Error(result.error || 'Failed to add record');
    }
  }, []);

  const updateRecordCallback = useCallback(async (record: WeightRecordV2) => {
    const result = await weightRecordRepository.update(record);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update record');
    }
  }, []);

  const deleteRecordCallback = useCallback(async (id: string) => {
    const result = await weightRecordRepository.delete(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete record');
    }
  }, []);

  // 記録のCRUD操作
  const {
    records: weightRecords,
    isLoading,
    error,
    handleAdd: addRecord,
    handleUpdate,
    handleDelete,
    clearError,
  } = useRecordCRUD({
    getAllRecords,
    addRecord: addRecordCallback,
    updateRecord: updateRecordCallback,
    deleteRecord: deleteRecordCallback,
    onRecordAdded: showTipsModal,
  });

  // 日付選択管理
  const {
    selectedDate,
    setSelectedDate,
    centerDate,
    setCenterDate,
    today,
    recordDate,
    recordsOfDay,
    isRecorded,
  } = useDateSelection({
    records: weightRecords,
    getRecordDate: record => record.date,
  });

  // フォーム状態管理
  const { formData, updateField, resetForm, createRecordFromForm } =
    useRecordForm({
      initialValues: initialFormValues,
      createRecord: (formData, date) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date,
        time: formData.time,
        weight: Number(formData.weight),
        bodyFat: formData.bodyFat !== '' ? Number(formData.bodyFat) : null,
        waist: formData.waist !== '' ? Number(formData.waist) : null,
        note: formData.note || null,
        excludeFromGraph: formData.excludeFromGraph,
      }),
      resetValues: initialFormValues,
    });

  // 体重記録のビジネスロジック
  const weightLogic = useWeightRecordLogic();

  // その日付の最低体重（記録があれば）
  const lowestWeightOfDay = useMemo(() => {
    if (recordsOfDay.length === 0) return null;
    return weightLogic.calculateLowestWeight(recordsOfDay);
  }, [recordsOfDay, weightLogic]);

  // BMI計算（reactive context内で実行）
  const currentBMI = useMemo(() => {
    if (!lowestWeightOfDay || !goal || !goal.height) return null;
    return weightLogic.calculateBMI(lowestWeightOfDay, goal.height);
  }, [lowestWeightOfDay, goal, weightLogic]);

  // 体重変化計算（reactive context内で実行）
  const weightChange = useMemo(() => {
    if (!lowestWeightOfDay || !goal || !goal.startWeight) return null;
    return weightLogic.calculateWeightChange(
      lowestWeightOfDay,
      goal.startWeight
    );
  }, [lowestWeightOfDay, goal, weightLogic]);

  // goal（身長など）が未ロードなら自動でロード
  // goalの有無とheightの有無を分離して監視
  const hasGoal = !!goal;
  const hasHeight = goal?.height ? true : false;

  React.useEffect(() => {
    if (!hasGoal || !hasHeight) {
      loadGoal();
    }
  }, [hasGoal, hasHeight, loadGoal]);

  // いずれかのフィールドが入力されているかチェック
  const hasAnyData = weightLogic.hasRecordData(formData);

  // レコード追加処理
  const handleAddRecord = useCallback(async () => {
    if (!hasAnyData) return;
    try {
      const record = createRecordFromForm(recordDate);
      await addRecord(record);
      resetForm();
    } catch (error) {
      // エラーハンドリングはuseRecordCRUDで行われる
    }
  }, [hasAnyData, createRecordFromForm, recordDate, addRecord, resetForm]);

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
        checkpointDates={goal?.checkpointDates}
        data-testid="date-picker"
      />

      <div className="w-full max-w-md mx-auto mt-3 mb-3 flex justify-start pl-4">
        <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          {selectedDate.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {isRecorded(selectedDate) && (
            <>
              <HiCheck
                className="inline-block w-6 h-6 text-green-500 ml-2 align-middle"
                aria-label="入力済み"
              />
              {/* BMI値を横に表示 */}
              {currentBMI !== null && (
                <span className="ml-3 text-base font-semibold text-blue-700 dark:text-blue-200 align-middle">
                  BMI {currentBMI.toFixed(1)}
                  {weightChange !== null && weightChange < 0 && (
                    <span className="ml-2 text-base font-semibold text-green-600 dark:text-green-400">
                      🏆{weightChange.toFixed(1)}kg
                    </span>
                  )}
                </span>
              )}
            </>
          )}
        </span>
      </div>

      {/* BMIインジケーターバーのみ表示 */}
      <BMIIndicator
        currentWeight={lowestWeightOfDay}
        goal={goal}
        showWeightDiff={false}
      />

      <div className="flex flex-col items-center justify-start min-h-[60vh]">
        {/* エラー表示 */}
        {error && (
          <div className="w-full max-w-md mb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
              >
                エラーを閉じる
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 w-full max-w-md">
          {/* 既存の記録一覧 */}
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
                <NumberInput
                  value={rec.weight}
                  onChange={value =>
                    handleUpdate({ ...rec, weight: Number(value) })
                  }
                  placeholder="体重"
                  step="0.1"
                  min="0"
                  width="lg"
                />
                <span className="ml-0.5 mr-3 text-gray-500">kg</span>
                <NumberInput
                  value={rec.bodyFat ?? ''}
                  onChange={value =>
                    handleUpdate({
                      ...rec,
                      bodyFat: value === '' ? null : Number(value),
                    })
                  }
                  placeholder="体脂肪"
                  step="0.1"
                  min="0"
                  width="lg"
                />
                <span className="ml-0.5 mr-3 text-gray-500">%</span>
                <NumberInput
                  value={rec.waist ?? ''}
                  onChange={value =>
                    handleUpdate({
                      ...rec,
                      waist: value === '' ? null : Number(value),
                    })
                  }
                  placeholder="腹囲"
                  step="0.1"
                  min="0"
                  width="lg"
                />
                <span className="ml-0.5 mr-3 text-gray-500">cm</span>
              </div>
              <textarea
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full pr-10 mb-0"
                defaultValue={rec.note ?? ''}
                onBlur={e => handleUpdate({ ...rec, note: e.target.value })}
                placeholder="補足・メモ（任意）"
              />
            </div>
          ))}
        </div>

        {/* 新規項目追加フォーム */}
        <div className="w-full max-w-md mt-2 mb-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2 mb-0 flex flex-col gap-1">
            <div className="flex items-center w-full mb-1 justify-between">
              <TimeInputWithPresets
                value={formData.time}
                onChange={time => updateField('time', time)}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="success"
                  size="sm"
                  icon={HiCheck}
                  aria-label="保存"
                  onClick={handleAddRecord}
                  data-testid="save-btn"
                  disabled={isLoading || !hasAnyData}
                >
                  {''}
                </Button>
                <Button
                  variant={formData.excludeFromGraph ? 'secondary' : 'sky'}
                  size="sm"
                  aria-label={
                    formData.excludeFromGraph ? 'グラフ除外' : 'グラフ表示'
                  }
                  onClick={() =>
                    updateField('excludeFromGraph', !formData.excludeFromGraph)
                  }
                >
                  {''}
                  <span className="relative inline-block w-5 h-5">
                    <PiChartLineDown className="w-5 h-5 text-white" />
                    {formData.excludeFromGraph && (
                      <HiNoSymbol className="w-5 h-5 text-red-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </span>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1 w-full mb-1">
              <NumberInput
                value={formData.weight}
                onChange={weight => updateField('weight', weight)}
                placeholder="体重"
                step="0.1"
                min="0"
                width="lg"
              />
              <span className="ml-0.5 mr-3 text-gray-500">kg</span>
              <NumberInput
                value={formData.bodyFat}
                onChange={bodyFat => updateField('bodyFat', bodyFat)}
                placeholder="体脂肪"
                step="0.1"
                min="0"
                width="lg"
              />
              <span className="ml-0.5 mr-3 text-gray-500">%</span>
              <NumberInput
                value={formData.waist}
                onChange={waist => updateField('waist', waist)}
                placeholder="腹囲"
                step="0.1"
                min="0"
                width="lg"
              />
              <span className="ml-0.5 mr-3 text-gray-500">cm</span>
            </div>
            <div className="relative w-full mt-0">
              <textarea
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full pr-10 mb-0"
                rows={1}
                value={formData.note}
                onChange={e => updateField('note', e.target.value)}
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
                    {weightLogic.noteExamples.map(option => (
                      <button
                        key={option}
                        type="button"
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900"
                        onClick={() => {
                          updateField('note', option);
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

        {/* 体重測定タイミングの注意事項 */}
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

export default observer(WeightRecord);
