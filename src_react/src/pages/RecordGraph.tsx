import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useRecordsStore } from '../store/records';

const PERIODS = [
  { label: '2週間', days: 14 },
  { label: '1か月半', days: 45 },
  { label: '3か月', days: 90 },
  { label: '全データ', days: null },
];

const RecordGraph: React.FC = () => {
  const { records, fields } = useRecordsStore();
  const [periodIdx, setPeriodIdx] = useState(0); // 期間選択
  const [showExcluded, setShowExcluded] = useState(false); // 除外値表示

  // 体重フィールドIDを取得
  const weightField = fields.find(f => f.fieldId === 'weight');

  // 最新データの日付を取得
  const latestTimestamp = useMemo(() => {
    if (!records.length) return null;
    const filtered = records.filter(r => r.fieldId === 'weight' && r.datetime);
    if (!filtered.length) return null;
    return Math.max(...filtered.map(r => new Date(r.datetime).getTime()));
  }, [records]);

  // 期間に応じたデータを抽出
  const data = useMemo(() => {
    const filtered = records
      .filter(
        r =>
          r.fieldId === 'weight' &&
          typeof r.value === 'number' &&
          (showExcluded || !r.excludeFromGraph) &&
          r.datetime
      )
      .sort((a, b) => (a.datetime || '').localeCompare(b.datetime || ''));
    let mapped = filtered.map(r => ({
      datetime: r.datetime,
      timestamp: new Date(r.datetime).getTime(),
      value: Number(r.value),
      excluded: !!r.excludeFromGraph,
    }));
    const period = PERIODS[periodIdx];
    if (period.days && latestTimestamp) {
      const from = latestTimestamp - period.days * 24 * 60 * 60 * 1000;
      mapped = mapped.filter(d => d.timestamp >= from);
    }
    return mapped;
  }, [records, periodIdx, latestTimestamp, showExcluded]);

  // グラフ範囲内の日付すべての00:00（ローカル）UNIXタイムスタンプ
  const dayStartLines = useMemo(() => {
    if (!data.length) return [];
    const start = new Date(data[0].timestamp);
    const end = new Date(data[data.length - 1].timestamp);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const lines: number[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      lines.push(
        new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          0,
          0,
          0,
          0
        ).getTime()
      );
    }
    return lines;
  }, [data]);

  // X軸ラベルをMM/DD HH:mm形式で表示
  const formatDateTimeLabel = (ts: number) => {
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  };

  // 回帰直線（傾向線）の計算
  const trendLine = useMemo(() => {
    if (data.length < 2) return null;
    const n = data.length;
    let sumX = 0,
      sumY = 0,
      sumXX = 0,
      sumXY = 0;
    for (const d of data) {
      sumX += d.timestamp;
      sumY += d.value;
      sumXX += d.timestamp * d.timestamp;
      sumXY += d.timestamp * d.value;
    }
    const avgX = sumX / n;
    const avgY = sumY / n;
    const denom = sumXX - sumX * avgX;
    if (denom === 0) return null;
    const a = (sumXY - sumX * avgY) / denom;
    const b = avgY - a * avgX;
    const x1 = data[0].timestamp;
    const x2 = data[data.length - 1].timestamp;
    return [
      { timestamp: x1, value: a * x1 + b },
      { timestamp: x2, value: a * x2 + b },
    ];
  }, [data]);

  return (
    <div className="flex flex-col items-center justify-start py-4 bg-transparent">
      <div className="flex gap-2 mb-4">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            className={`px-3 py-1 rounded-full border-2 text-sm font-bold transition-colors duration-100
              ${
                periodIdx === i
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-blue-700 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800'
              }`}
            onClick={() => setPeriodIdx(i)}
          >
            {p.label}
          </button>
        ))}
        <label className="flex items-center ml-4 cursor-pointer select-none text-sm font-bold">
          <input
            type="checkbox"
            className="form-checkbox accent-blue-600 mr-1"
            checked={showExcluded}
            onChange={e => setShowExcluded(e.target.checked)}
          />
          除外値も表示
        </label>
      </div>
      <div className="w-full h-[400px] bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={formatDateTimeLabel}
            />
            {dayStartLines.map(ts => (
              <ReferenceLine
                key={ts}
                x={ts}
                stroke="#888"
                strokeDasharray="2 2"
              />
            ))}
            <YAxis domain={['auto', 'auto']} unit={weightField?.unit || 'kg'} />
            <Tooltip
              content={({ active, payload, label: _ }) => {
                if (!active || !payload || !payload.length) return null;
                // payload[0]はLineのデータ、payload[1]はtrendLine（存在すれば）
                const point = payload[0]?.payload;
                // formatDateTimeLabelはtimestampをMM/DD HH:mmに変換
                return (
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #ccc',
                      padding: 8,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {formatDateTimeLabel(point.timestamp)}
                    </div>
                    {payload
                      .filter(item => item.color !== '#f59e42')
                      .map((item, idx) => (
                        <div
                          key={idx}
                          style={{ color: item.color, fontSize: 14 }}
                        >
                          {typeof item.value === 'number'
                            ? item.value.toFixed(2)
                            : item.value}
                          {weightField?.unit || 'kg'}
                        </div>
                      ))}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              data={data}
              stroke="#38bdf8"
              strokeWidth={3}
              dot={({ cx, cy, payload }) => (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={payload.excluded ? '#f87171' : '#38bdf8'}
                  stroke="#fff"
                  strokeWidth={1}
                />
              )}
            />
            {trendLine && (
              <Line
                type="linear"
                data={trendLine}
                dataKey="value"
                stroke="#f59e42"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
                strokeDasharray="6 6"
                legendType="none"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RecordGraph;
