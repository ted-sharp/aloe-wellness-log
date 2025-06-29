import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useRecordsStore } from '../store/records';

const RecordGraph: React.FC = () => {
  const { records, fields } = useRecordsStore();

  // 体重フィールドIDを取得
  const weightField = fields.find(f => f.fieldId === 'weight');

  // 体重データのみ抽出し、グラフ除外されていないものだけを日付ごとに最新1件だけ残す
  const data = useMemo(() => {
    const filtered = records
      .filter(
        r =>
          r.fieldId === 'weight' &&
          typeof r.value === 'number' &&
          !r.excludeFromGraph
      )
      .sort((a, b) => {
        // 日付昇順、同日ならdatetime降順（最新が後ろ）
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.datetime || '').localeCompare(b.datetime || '');
      });
    // 日付ごとに最新1件だけ残す
    const latestByDate = new Map();
    for (const rec of filtered) {
      latestByDate.set(rec.date, rec); // 後ろの（新しい）値で上書き
    }
    return Array.from(latestByDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => ({
        date: r.date,
        value: Number(r.value),
      }));
  }, [records]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-start py-8">
      <h1 className="text-2xl sm:text-4xl font-bold mb-6 text-gray-800 dark:text-white whitespace-nowrap">
        体重グラフ
      </h1>
      <div className="w-full max-w-2xl h-[400px] bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} unit={weightField?.unit || 'kg'} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RecordGraph;
