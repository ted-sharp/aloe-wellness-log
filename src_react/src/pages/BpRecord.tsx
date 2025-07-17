import React, { useCallback } from 'react';
import { HiCheck, HiNoSymbol, HiTrash } from 'react-icons/hi2';
import { PiChartLineDown } from 'react-icons/pi';
import BpIndicator from '../components/BpIndicator';
import Button from '../components/Button';
import DatePickerBar from '../components/DatePickerBar';
import NumberInput from '../components/NumberInput';
import TimeInputWithPresets from '../components/TimeInputWithPresets';
import {
  addBpRecord,
  deleteBpRecord,
  getAllBpRecords,
  updateBpRecord,
} from '../db';
import { useDateSelection } from '../hooks/useDateSelection';
import { useRecordCRUD } from '../hooks/useRecordCRUD';
import { useRecordForm } from '../hooks/useRecordForm';
import { useBpRecordLogic } from '../hooks/business/useBpRecordLogic';
import { getCurrentTimeString } from '../utils/dateUtils';

// フォームの初期値
const initialFormValues = {
  systolic: '',
  diastolic: '',
  heartRate: '',
  time: getCurrentTimeString(),
  note: '',
  excludeFromGraph: false,
};

const BpRecord: React.FC = () => {
  // 血圧記録のビジネスロジック
  const bpLogic = useBpRecordLogic();

  // 記録のCRUD操作
  const {
    records: bpRecords,
    isLoading,
    error,
    handleAdd: addRecord,
    handleUpdate,
    handleDelete,
    clearError,
  } = useRecordCRUD({
    getAllRecords: getAllBpRecords,
    addRecord: addBpRecord,
    updateRecord: updateBpRecord,
    deleteRecord: deleteBpRecord,
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
    records: bpRecords,
    getRecordDate: (record) => record.date,
  });

  // フォーム状態管理
  const {
    formData,
    updateField,
    resetForm,
    createRecordFromForm,
  } = useRecordForm({
    initialValues: initialFormValues,
    createRecord: (formData, date) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      time: formData.time,
      systolic: Number(formData.systolic),
      diastolic: Number(formData.diastolic),
      heartRate: formData.heartRate !== '' ? Number(formData.heartRate) : null,
      note: formData.note || null,
      excludeFromGraph: formData.excludeFromGraph || false,
    }),
    resetValues: initialFormValues,
  });

  // レコード追加処理
  const handleAddRecord = useCallback(async () => {
    if (!bpLogic.hasRecordData(formData)) return;
    try {
      const record = createRecordFromForm(recordDate);
      await addRecord(record);
      resetForm();
    } catch (error) {
      // エラーハンドリングはuseRecordCRUDで行われる
    }
  }, [bpLogic, formData, createRecordFromForm, recordDate, addRecord, resetForm]);

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
          {selectedDate.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {isRecorded(selectedDate) && (
            <HiCheck
              className="inline-block w-6 h-6 text-green-500 ml-2 align-middle"
              aria-label="入力済み"
            />
          )}
        </span>
      </div>

      {/* 血圧基準範囲帯（収縮期・拡張期） */}
      <BpIndicator recordsOfDay={recordsOfDay} />

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
                  value={rec.systolic}
                  onChange={(value) => handleUpdate({ ...rec, systolic: Number(value) })}
                  placeholder="収縮"
                  step="1"
                  min="0"
                  max="300"
                  width="md"
                />
                <span className="ml-0.5 mr-3 text-gray-500 text-sm">mmHg</span>
                
                <NumberInput
                  value={rec.diastolic}
                  onChange={(value) => handleUpdate({ ...rec, diastolic: Number(value) })}
                  placeholder="拡張"
                  step="1"
                  min="0"
                  max="200"
                  width="md"
                />
                <span className="ml-0.5 mr-3 text-gray-500 text-sm">mmHg</span>
                
                <NumberInput
                  value={rec.heartRate ?? ''}
                  onChange={(value) => handleUpdate({ 
                    ...rec, 
                    heartRate: value === '' ? null : Number(value) 
                  })}
                  placeholder="心拍"
                  step="1"
                  min="0"
                  max="300"
                  width="md"
                />
                <span className="ml-0.5 mr-3 text-gray-500 text-sm">bpm</span>
              </div>
              
              <textarea
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full pr-2 mb-0"
                value={rec.note ?? ''}
                onChange={e => handleUpdate({ ...rec, note: e.target.value })}
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
                onChange={(time) => updateField('time', time)}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="success"
                  size="sm"
                  icon={HiCheck}
                  aria-label="保存"
                  onClick={handleAddRecord}
                  data-testid="save-btn"
                  disabled={isLoading || !bpLogic.hasRecordData(formData)}
                >
                  {''}
                </Button>
                <Button
                  variant={formData.excludeFromGraph ? 'secondary' : 'sky'}
                  size="sm"
                  aria-label={formData.excludeFromGraph ? 'グラフ除外' : 'グラフ表示'}
                  onClick={() => updateField('excludeFromGraph', !formData.excludeFromGraph)}
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
                value={formData.systolic}
                onChange={(systolic) => updateField('systolic', systolic)}
                placeholder="収縮"
                step="1"
                min="0"
                max="300"
                width="md"
              />
              <span className="ml-0.5 mr-3 text-gray-500 text-sm">mmHg</span>
              
              <NumberInput
                value={formData.diastolic}
                onChange={(diastolic) => updateField('diastolic', diastolic)}
                placeholder="拡張"
                step="1"
                min="0"
                max="200"
                width="md"
              />
              <span className="ml-0.5 mr-3 text-gray-500 text-sm">mmHg</span>
              
              <NumberInput
                value={formData.heartRate}
                onChange={(heartRate) => updateField('heartRate', heartRate)}
                placeholder="心拍"
                step="1"
                min="0"
                max="300"
                width="md"
              />
              <span className="ml-0.5 mr-3 text-gray-500 text-sm">bpm</span>
            </div>
            
            <textarea
              className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full pr-2 mb-1"
              rows={1}
              value={formData.note}
              onChange={e => updateField('note', e.target.value)}
              placeholder="補足・メモ（任意）"
            />
            
          </div>
        </div>

        {/* 血圧測定に関する注意事項 */}
        <div className="w-full max-w-md mx-auto mb-2 px-4">
          <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-100 p-3 rounded shadow-sm text-sm text-left">
            <strong>【ワンポイント】</strong>{' '}
            血圧は安静時に測定し、可能であれば毎日同じ時間帯（朝・夜など）に記録することをお勧めします。運動後や食事直後の測定は避けましょう。
          </div>
        </div>
      </div>
    </div>
  );
};

export default BpRecord;