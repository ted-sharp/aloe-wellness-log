import React, { useEffect, useState } from 'react';
import { HiCheck, HiTrash } from 'react-icons/hi2';
import { TbSunrise } from 'react-icons/tb';
import Button from '../components/Button';
import DatePickerBar from '../components/DatePickerBar';
import {
  addBpRecord,
  deleteBpRecord,
  getAllBpRecords,
  updateBpRecord,
} from '../db/indexedDb';
import type { BpRecordV2 } from '../types/record';

const SELECTED_DATE_KEY = 'shared_selected_date';

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

const getCurrentTimeString = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const BpRecord: React.FC = () => {
  const today = new Date();
  const [centerDate, setCenterDate] = useState<Date>(() => {
    const saved = localStorage.getItem(SELECTED_DATE_KEY);
    return saved ? new Date(saved) : today;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const saved = localStorage.getItem(SELECTED_DATE_KEY);
    return saved ? new Date(saved) : today;
  });
  const recordDate = formatDate(selectedDate);

  // 新規追加用state
  const [newSystolic, setNewSystolic] = useState('');
  const [newDiastolic, setNewDiastolic] = useState('');
  const [newHeartRate, setNewHeartRate] = useState('');
  const [newTime, setNewTime] = useState(getCurrentTimeString());
  const [newNote, setNewNote] = useState('');

  const [bpRecords, setBpRecords] = useState<BpRecordV2[]>([]);

  // データ取得
  useEffect(() => {
    const fetchRecords = async () => {
      const all = await getAllBpRecords();
      setBpRecords(all);
    };
    fetchRecords();
  }, []);

  // 選択日の記録のみ抽出
  const recordsOfDay: BpRecordV2[] = bpRecords.filter(
    r => r.date === recordDate
  );

  // 記録済み判定
  const isRecorded = (date: Date) => {
    const d = formatDate(date);
    return bpRecords.some(r => r.date === d);
  };

  useEffect(() => {
    localStorage.setItem(SELECTED_DATE_KEY, selectedDate.toISOString());
  }, [selectedDate]);

  useEffect(() => {
    setCenterDate(selectedDate);
  }, [selectedDate]);

  // 追加
  const handleAdd = async () => {
    if (!newSystolic || !newDiastolic) return;
    const rec: BpRecordV2 = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: recordDate,
      time: newTime,
      systolic: Number(newSystolic),
      diastolic: Number(newDiastolic),
      heartRate: newHeartRate ? Number(newHeartRate) : null,
      note: newNote || null,
    };
    await addBpRecord(rec);
    setNewSystolic('');
    setNewDiastolic('');
    setNewHeartRate('');
    setNewNote('');
    setNewTime(getCurrentTimeString());
    const all = await getAllBpRecords();
    setBpRecords(all);
  };

  // 削除
  const handleDelete = async (id: string) => {
    if (!window.confirm('本当に削除しますか？')) return;
    await deleteBpRecord(id);
    const all = await getAllBpRecords();
    setBpRecords(all);
  };

  // 更新
  const handleUpdate = async (rec: BpRecordV2) => {
    await updateBpRecord(rec);
    const all = await getAllBpRecords();
    setBpRecords(all);
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
        </span>
      </div>
      <div className="flex flex-col items-center justify-start min-h-[60vh]">
        <div className="flex flex-col gap-6 w-full max-w-md">
          {recordsOfDay.map(rec => (
            <div
              key={rec.id}
              className="flex flex-col gap-2 bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4"
            >
              <div className="flex items-center w-full">
                <input
                  type="time"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[6.5em]"
                  value={rec.time}
                  onChange={e => handleUpdate({ ...rec, time: e.target.value })}
                />
                <div className="flex-1" />
                <Button
                  variant="danger"
                  size="sm"
                  icon={HiTrash}
                  aria-label="削除"
                  onClick={() => handleDelete(rec.id)}
                  className="ml-auto"
                >
                  {''}
                </Button>
              </div>
              <textarea
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full"
                value={rec.note ?? ''}
                onChange={e => handleUpdate({ ...rec, note: e.target.value })}
                placeholder="補足・メモ（任意）"
              />
              <div className="flex items-center gap-2 w-full">
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[6em]"
                  value={rec.systolic}
                  onChange={e =>
                    handleUpdate({ ...rec, systolic: Number(e.target.value) })
                  }
                  placeholder="収縮期"
                />
                <span className="text-gray-500">/</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[6em]"
                  value={rec.diastolic}
                  onChange={e =>
                    handleUpdate({ ...rec, diastolic: Number(e.target.value) })
                  }
                  placeholder="拡張期"
                />
                <span className="text-gray-500">/</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[5em]"
                  value={rec.heartRate ?? ''}
                  onChange={e =>
                    handleUpdate({
                      ...rec,
                      heartRate: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="脈拍"
                />
              </div>
            </div>
          ))}
        </div>
        {/* 新規項目追加フォーム */}
        <div className="w-full max-w-md mt-6 mb-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4 flex flex-col gap-2">
            <div className="flex items-center w-full">
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
              <div className="flex-1" />
              <Button
                variant="success"
                size="sm"
                icon={HiCheck}
                aria-label="保存"
                className="ml-auto"
                onClick={handleAdd}
                data-testid="save-btn"
                disabled={!newSystolic || !newDiastolic}
              >
                {''}
              </Button>
            </div>
            <textarea
              className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full"
              rows={1}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="補足・メモ（任意）"
            />
            <div className="flex items-center gap-2 w-full">
              <input
                type="number"
                step="1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[6em]"
                value={newSystolic}
                onChange={e => setNewSystolic(e.target.value)}
                placeholder="収縮期"
              />
              <span className="text-gray-500">/</span>
              <input
                type="number"
                step="1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[6em]"
                value={newDiastolic}
                onChange={e => setNewDiastolic(e.target.value)}
                placeholder="拡張期"
              />
              <span className="text-gray-500">/</span>
              <input
                type="number"
                step="1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-inherit text-gray-700 dark:text-gray-200 w-[5em]"
                value={newHeartRate}
                onChange={e => setNewHeartRate(e.target.value)}
                placeholder="脈拍"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BpRecord;
