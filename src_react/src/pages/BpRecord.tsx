import React, { useEffect, useState } from 'react';
import { HiCheck, HiTrash } from 'react-icons/hi2';
import { MdFlashOn } from 'react-icons/md';
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
      {/* --- 血圧基準範囲帯（収縮期・拡張期） --- */}
      <BpBands recordsOfDay={recordsOfDay} />
      <div className="flex flex-col items-center justify-start min-h-[60vh]">
        <div className="flex flex-col gap-2 w-full max-w-md">
          {recordsOfDay.map(rec => (
            <div
              key={rec.id}
              className="flex flex-col gap-2 bg-white dark:bg-gray-800 rounded-xl shadow p-2 mb-0"
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
              <div className="flex items-center gap-2 w-full">
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[3.8em] placeholder:font-normal placeholder:text-sm placeholder-gray-400"
                  value={rec.systolic}
                  onChange={e =>
                    handleUpdate({ ...rec, systolic: Number(e.target.value) })
                  }
                  placeholder="収縮"
                />
                <span className="ml-0 mr-3 text-gray-500">mmHg</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[3.8em] placeholder:font-normal placeholder:text-sm placeholder-gray-400"
                  value={rec.diastolic}
                  onChange={e =>
                    handleUpdate({ ...rec, diastolic: Number(e.target.value) })
                  }
                  placeholder="拡張"
                />
                <span className="ml-0 mr-3 text-gray-500">mmHg</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[3.8em] placeholder:font-normal placeholder:text-base placeholder-gray-400"
                  value={rec.heartRate ?? ''}
                  onChange={e =>
                    handleUpdate({
                      ...rec,
                      heartRate: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="脈拍"
                />
                <span className="ml-0 mr-3 text-gray-500">bpm</span>
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
        {/* 新規項目追加フォーム */}
        <div className="w-full max-w-md mt-2 mb-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2 mb-0 flex flex-col gap-2">
            <div className="flex items-center w-full gap-2">
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
            <div className="flex items-center gap-2 w-full">
              <input
                type="number"
                step="1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[3.8em] placeholder:font-normal placeholder:text-sm placeholder-gray-400"
                value={newSystolic}
                onChange={e => setNewSystolic(e.target.value)}
                placeholder="収縮"
              />
              <span className="ml-0 mr-3 text-gray-500">mmHg</span>
              <input
                type="number"
                step="1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[3.8em] placeholder:font-normal placeholder:text-sm placeholder-gray-400"
                value={newDiastolic}
                onChange={e => setNewDiastolic(e.target.value)}
                placeholder="拡張"
              />
              <span className="ml-0 mr-3 text-gray-500">mmHg</span>
              <input
                type="number"
                step="1"
                min="0"
                className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-lg font-semibold bg-inherit text-gray-700 dark:text-gray-200 w-[3.8em] placeholder:font-normal placeholder:text-base placeholder-gray-400"
                value={newHeartRate}
                onChange={e => setNewHeartRate(e.target.value)}
                placeholder="脈拍"
              />
              <span className="ml-0 mr-3 text-gray-500">bpm</span>
            </div>
            <textarea
              className="h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-base bg-inherit text-gray-700 dark:text-gray-200 resize-none w-full pr-10 mb-0"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="補足・メモ（任意）"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BpRecord;

// --- 血圧基準範囲帯コンポーネント ---
type BpBand = {
  min: number;
  max: number;
  color: string;
  label: string;
  range: string;
};

const systolicBands: BpBand[] = [
  { min: 0, max: 90, color: '#6ec6f1', label: '低', range: '<90' },
  { min: 90, max: 120, color: '#7edfa0', label: '正常', range: '90-119' },
  { min: 120, max: 130, color: '#e6f7b2', label: '正常高値', range: '120-129' },
  { min: 130, max: 140, color: '#fff59d', label: '高値', range: '130-139' },
  { min: 140, max: 160, color: '#ffb74d', label: 'Ⅰ度', range: '140-159' },
  { min: 160, max: 180, color: '#ff7043', label: 'Ⅱ度', range: '160-179' },
  { min: 180, max: 300, color: '#d32f2f', label: 'Ⅲ度', range: '180+' },
];
const diastolicBands: BpBand[] = [
  { min: 0, max: 60, color: '#6ec6f1', label: '低', range: '<60' },
  { min: 60, max: 80, color: '#7edfa0', label: '正常', range: '60-79' },
  { min: 80, max: 90, color: '#fff59d', label: '高値', range: '80-89' },
  { min: 90, max: 100, color: '#ffb74d', label: 'Ⅰ度', range: '90-99' },
  { min: 100, max: 110, color: '#ff7043', label: 'Ⅱ度', range: '100-109' },
  { min: 110, max: 200, color: '#d32f2f', label: 'Ⅲ度', range: '110+' },
];

function getMarkerLeft(bands: BpBand[], value: number | null) {
  if (value == null) return 0;
  let total = 0;
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (value < b.max) {
      const bandWidth = 100 / bands.length;
      const ratio = (value - b.min) / (b.max - b.min);
      return total + bandWidth * ratio;
    }
    total += 100 / bands.length;
  }
  return 100;
}

const BpBands: React.FC<{ recordsOfDay: BpRecordV2[] }> = ({
  recordsOfDay,
}) => {
  // 最新値取得（時刻降順）
  const latest = recordsOfDay.length
    ? [...recordsOfDay].sort((a, b) =>
        (b.time || '').localeCompare(a.time || '')
      )[0]
    : null;
  const systolic = latest?.systolic ?? null;
  const diastolic = latest?.diastolic ?? null;
  const markerLeftSys = getMarkerLeft(systolicBands, systolic);
  const markerLeftDia = getMarkerLeft(diastolicBands, diastolic);
  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-2 mb-2">
      {/* 収縮期帯 */}
      <div className="w-full flex flex-col items-center">
        <div
          className="relative w-full h-7 flex rounded overflow-hidden shadow"
          style={{ minWidth: 240 }}
        >
          {systolicBands.map(band => (
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
          {/* マーカー */}
          {systolic != null && (
            <div
              className="absolute left-0 top-0 w-full pointer-events-none"
              style={{ height: '100%' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${markerLeftSys}% - 0.65em)`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#222',
                  fontSize: '1.3em',
                  textShadow: '0 0 2px #fff, 0 0 2px #fff, 1px 1px 2px #0002',
                  zIndex: 2,
                }}
                aria-label="現在の収縮期位置"
              >
                ▼
              </div>
            </div>
          )}
        </div>
        <div className="w-full flex justify-between mt-0.5 px-1">
          {systolicBands.map(band => (
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
      {/* 拡張期帯 */}
      <div className="w-full flex flex-col items-center">
        <div
          className="relative w-full h-7 flex rounded overflow-hidden shadow"
          style={{ minWidth: 240 }}
        >
          {diastolicBands.map(band => (
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
          {/* マーカー */}
          {diastolic != null && (
            <div
              className="absolute left-0 top-0 w-full pointer-events-none"
              style={{ height: '100%' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${markerLeftDia}% - 0.65em)`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#222',
                  fontSize: '1.3em',
                  textShadow: '0 0 2px #fff, 0 0 2px #fff, 1px 1px 2px #0002',
                  zIndex: 2,
                }}
                aria-label="現在の拡張期位置"
              >
                ▼
              </div>
            </div>
          )}
        </div>
        <div className="w-full flex justify-between mt-0.5 px-1">
          {diastolicBands.map(band => (
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
    </div>
  );
};
