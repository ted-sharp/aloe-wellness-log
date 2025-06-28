import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import DatePickerBar from '../components/DatePickerBar';
import { useRecordsStore } from '../store/records';

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
};
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

const WEIGHT_FIELD_ID = 'weight';
const BODYFAT_FIELD_ID = 'body_fat';

const WeightRecord: React.FC = () => {
  const today = new Date();
  const [centerDate, setCenterDate] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const recordDate = formatDate(selectedDate);
  const recordTime = formatLocalTime(selectedDate);
  const recordDateTime = formatLocalDateTime(selectedDate);

  const { records, addRecord, updateRecord, deleteRecord, loadRecords } =
    useRecordsStore();

  // 既存記録の取得
  const getRecord = (fieldId: string) =>
    records.find(r => r.fieldId === fieldId && r.date === recordDate);

  const weightRecord = getRecord(WEIGHT_FIELD_ID);
  const bodyFatRecord = getRecord(BODYFAT_FIELD_ID);

  const [weight, setWeight] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');

  // 日付変更時に既存値を反映
  useEffect(() => {
    setWeight(weightRecord ? String(weightRecord.value) : '');
    setBodyFat(bodyFatRecord ? String(bodyFatRecord.value) : '');
  }, [weightRecord, bodyFatRecord, recordDate]);

  // 記録保存
  const handleSave = async (fieldId: string, value: string) => {
    if (!value) return;
    const numValue = Number(value);
    if (isNaN(numValue)) return;
    const existing = getRecord(fieldId);
    if (existing) {
      await updateRecord({ ...existing, value: numValue });
    } else {
      await addRecord({
        id: `${recordDateTime}-${fieldId}-${Math.random()
          .toString(36)
          .substr(2, 6)}`,
        fieldId,
        value: numValue,
        date: recordDate,
        time: recordTime,
        datetime: recordDateTime,
      });
    }
    await loadRecords();
  };

  // 記録削除
  const handleDelete = async (fieldId: string) => {
    const rec = getRecord(fieldId);
    if (rec) {
      await deleteRecord(rec.id);
      await loadRecords();
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <DatePickerBar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        centerDate={centerDate}
        setCenterDate={setCenterDate}
      />
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
        体重ページ
      </h1>
      <div className="flex flex-col gap-6 max-w-md mx-auto">
        {/* 体重 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col gap-2">
          <label
            className="block text-gray-700 dark:text-gray-200 font-semibold mb-2"
            htmlFor="weight-input"
          >
            体重 (kg)
          </label>
          <input
            id="weight-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="例: 65.0"
          />
          <div className="flex gap-2 mt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleSave(WEIGHT_FIELD_ID, weight)}
              disabled={!weight}
            >
              保存
            </Button>
            {weightRecord && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleDelete(WEIGHT_FIELD_ID)}
              >
                削除
              </Button>
            )}
          </div>
        </div>
        {/* 体脂肪率 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col gap-2">
          <label
            className="block text-gray-700 dark:text-gray-200 font-semibold mb-2"
            htmlFor="bodyfat-input"
          >
            体脂肪率 (%)
          </label>
          <input
            id="bodyfat-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="100"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={bodyFat}
            onChange={e => setBodyFat(e.target.value)}
            placeholder="例: 20.5"
          />
          <div className="flex gap-2 mt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleSave(BODYFAT_FIELD_ID, bodyFat)}
              disabled={!bodyFat}
            >
              保存
            </Button>
            {bodyFatRecord && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleDelete(BODYFAT_FIELD_ID)}
              >
                削除
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightRecord;
