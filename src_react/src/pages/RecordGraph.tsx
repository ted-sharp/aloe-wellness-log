import React, { useMemo, useState } from 'react';
import { HiCheck, HiXMark } from 'react-icons/hi2';
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
import { useGoalStore } from '../store/goal';
import { useRecordsStore } from '../store/records';

const PERIODS = [
  { label: '2週間', days: 14 },
  { label: '1か月半', days: 45 },
  { label: '3か月', days: 90 },
  { label: '全データ', days: null },
];

const STATUS_LABELS = {
  exercise: '🏃',
  meal: '🍽',
  sleep: '🛌',
};

// Tooltip用の型定義
interface TooltipItem {
  color?: string;
  value?: number | string;
}

// 達成率カウントアップ用カスタムフック
function useAnimatedNumber(target: number, duration: number = 800) {
  const [animated, setAnimated] = React.useState(0);
  React.useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return;
    const start = 0;
    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimated(start + (target - start) * progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimated(target);
      }
    }
    requestAnimationFrame(animate);
  }, [target, duration]);
  return animated;
}

// グラフ下部の達成率アニメーション表示用コンポーネント
function GraphAchievementItem({
  label,
  stats,
}: {
  label: string;
  stats: { total: number; success: number; percent: number };
}) {
  const animatedPercent = useAnimatedNumber(stats.percent);
  return (
    <div className="text-xs text-blue-700 dark:text-blue-200 whitespace-nowrap font-semibold">
      <span className="text-sm sm:text-base align-middle">{label}:</span>
      {stats.total > 0 ? (
        <>
          <span className="ml-1 sm:ml-2 text-sm sm:text-base align-middle">
            {animatedPercent.toFixed(0)}%
          </span>
          <span className="ml-1 sm:ml-2 text-sm sm:text-base align-middle">
            ({stats.success}/{stats.total}日)
          </span>
        </>
      ) : (
        '記録なし'
      )}
    </div>
  );
}

const RecordGraph: React.FC = () => {
  const { records, fields } = useRecordsStore();
  const { goal } = useGoalStore();
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

  // X軸domain（日単位で固定）
  const xAxisDomain = useMemo(() => {
    if (!data.length) return ['auto', 'auto'];
    const start = new Date(data[0].timestamp);
    const end = new Date(data[data.length - 1].timestamp);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return [start.getTime(), end.getTime()];
  }, [data]);

  // X軸tick値（日付の00:00）
  const xAxisTicks = useMemo(() => {
    if (periodIdx !== 0 || !data.length) return undefined;
    const start = new Date(data[0].timestamp);
    const end = new Date(data[data.length - 1].timestamp);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const ticks: number[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      ticks.push(
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
    return ticks;
  }, [data, periodIdx]);

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

  // 日付ごとの運動・減食・睡眠達成状況を抽出
  const dailyStatus = useMemo(() => {
    // { 'YYYY-MM-DD': { exercise: true/false, meal: true/false, sleep: true/false } }
    const statusMap: Record<
      string,
      { exercise: boolean; meal: boolean; sleep: boolean }
    > = {};
    records.forEach(r => {
      if (!['exercise', 'meal', 'sleep'].includes(r.fieldId)) return;
      const date = r.date;
      if (!statusMap[date])
        statusMap[date] = { exercise: false, meal: false, sleep: false };
      if (typeof r.value === 'boolean')
        statusMap[date][r.fieldId as 'exercise' | 'meal' | 'sleep'] ||= r.value;
      if (typeof r.value === 'number')
        statusMap[date][r.fieldId as 'exercise' | 'meal' | 'sleep'] ||=
          !!r.value;
    });
    return statusMap;
  }, [records]);

  type StatusKey = 'exercise' | 'meal' | 'sleep';
  type CustomTickProps = {
    x?: number;
    y?: number;
    payload: { value: number };
  };
  const STATUS_KEYS: StatusKey[] = ['exercise', 'meal', 'sleep'];
  const CustomTick = (props: CustomTickProps) => {
    const { x = 0, y = 0, payload } = props;
    const ts = payload.value;
    const d = new Date(ts);
    return (
      <g>
        <text x={x} y={y + 10} textAnchor="middle" fontSize="12">{`${
          d.getMonth() + 1
        }/${d.getDate()}`}</text>
      </g>
    );
  };

  // 日課達成率計算用
  const getPeriodDateList = () => {
    if (!records.length) return [];
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    if (PERIODS[periodIdx].days && latestTimestamp) {
      toDate = new Date(latestTimestamp);
      fromDate = new Date(latestTimestamp);
      fromDate.setDate(toDate.getDate() - PERIODS[periodIdx].days + 1);
    }
    // 全データの場合は記録の最初と最後
    if (!fromDate || !toDate) {
      return [];
    }
    const list: string[] = [];
    const d = new Date(fromDate);
    while (d <= toDate) {
      list.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(d.getDate()).padStart(2, '0')}`
      );
      d.setDate(d.getDate() + 1);
    }
    return list;
  };

  const getStatusStats = (key: StatusKey) => {
    const dateList = getPeriodDateList();
    let total = 0;
    let success = 0;
    dateList.forEach(date => {
      const status = dailyStatus[date];
      if (typeof status?.[key] === 'boolean') {
        total++;
        if (status[key]) success++;
      }
    });
    return {
      total,
      success,
      percent: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  };

  return (
    <div
      className="flex flex-col items-center justify-start py-4 bg-transparent"
      data-testid="record-graph"
    >
      <div className="flex flex-wrap gap-3 mb-4 items-center w-full">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            className={`w-auto min-w-[64px] px-4 py-1 rounded-full border-2 text-xs sm:text-sm font-bold transition-colors duration-100
              ${
                periodIdx === i
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-blue-700 dark:text-white border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800'
              }`}
            onClick={() => setPeriodIdx(i)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="w-full h-[400px] bg-white dark:bg-gray-800 rounded-xl shadow p-1 relative">
        <label className="flex items-center absolute right-0 top-0 bg-white/80 dark:bg-gray-800/80 px-1 py-0 h-6 min-h-0 rounded-none leading-tight text-xs font-bold z-10 w-auto cursor-pointer select-none">
          <input
            type="checkbox"
            className="form-checkbox accent-blue-600 mr-1"
            checked={showExcluded}
            onChange={e => setShowExcluded(e.target.checked)}
          />
          除外値も表示
        </label>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={xAxisDomain}
              tick={periodIdx === 0 ? CustomTick : undefined}
              tickFormatter={periodIdx === 0 ? undefined : formatDateTimeLabel}
              ticks={xAxisTicks}
            />
            {periodIdx === 0 &&
              dayStartLines.map(ts => (
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
                const point = payload[0]?.payload;
                // 日付取得
                const ts = point?.timestamp;
                const d = ts ? new Date(ts) : null;
                const dateStr = d
                  ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                      2,
                      '0'
                    )}-${String(d.getDate()).padStart(2, '0')}`
                  : '';
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
                      {(() => {
                        type Pt = { timestamp: number };
                        return point
                          ? formatDateTimeLabel((point as Pt).timestamp)
                          : '';
                      })()}
                    </div>
                    {((payload ?? []) as TooltipItem[])
                      .filter(item => item && item.color !== '#f59e42')
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
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      {(() => {
                        const statusList = [
                          { key: 'exercise', label: '🏃‍♂️' },
                          { key: 'meal', label: '🍽' },
                          { key: 'sleep', label: '🛌' },
                        ];
                        return statusList.map(({ key, label }) => {
                          const rec = records.find(
                            r => r.fieldId === key && r.date === dateStr
                          );
                          if (rec === undefined) return null; // 入力がなければ非表示
                          if (typeof rec.value === 'boolean') {
                            return (
                              <span
                                key={key}
                                style={{
                                  marginRight: 8,
                                  verticalAlign: 'middle',
                                  fontSize: '1.1em',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                {label}
                                {rec.value ? (
                                  <HiCheck
                                    style={{
                                      color: '#38bdf8',
                                      fontSize: '1.3em',
                                      marginLeft: 2,
                                      verticalAlign: 'middle',
                                    }}
                                  />
                                ) : (
                                  <HiXMark
                                    style={{
                                      color: '#bbb',
                                      fontSize: '1.3em',
                                      marginLeft: 2,
                                      verticalAlign: 'middle',
                                    }}
                                  />
                                )}
                              </span>
                            );
                          }
                          return null;
                        });
                      })()}
                    </div>
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
                  key={payload?.timestamp ?? `${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={payload.excluded ? '#f87171' : '#38bdf8'}
                  stroke="#fff"
                  strokeWidth={1}
                />
              )}
              activeDot={false}
            />
            {trendLine && (
              <Line
                type="linear"
                data={trendLine}
                dataKey="value"
                stroke="#f59e42"
                strokeWidth={3}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                strokeDasharray="6 6"
                legendType="none"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* グラフ下部に日課達成率を表示（3行・目標併記） */}
      <div className="w-full flex flex-col items-start gap-1 mt-4 mb-2 text-left">
        {(['exercise', 'meal', 'sleep'] as const).map(key => {
          const stats = getStatusStats(key);
          let goalText = '';
          if (goal) {
            if (key === 'exercise' && goal.exerciseGoal)
              goalText = `${goal.exerciseGoal}`;
            if (key === 'meal' && goal.dietGoal) goalText = `${goal.dietGoal}`;
            if (key === 'sleep' && goal.sleepGoal)
              goalText = `${goal.sleepGoal}`;
          }
          const icon = STATUS_LABELS[key] ?? '';
          if (!stats) {
            return (
              <div
                key={key}
                className="flex items-baseline text-xs sm:text-base text-blue-700 dark:text-blue-200 font-semibold whitespace-nowrap"
              >
                <span className="inline-block min-w-[2em] text-center">
                  {icon}
                </span>
                <span className="inline-block min-w-[7em]">記録なし</span>
                {goalText && (
                  <span className="ml-0 text-gray-500 dark:text-gray-300 text-xs sm:text-sm font-normal">
                    {goalText}
                  </span>
                )}
              </div>
            );
          }
          return (
            <div
              key={key}
              className="flex items-baseline text-xs sm:text-base text-blue-700 dark:text-blue-200 font-semibold whitespace-nowrap"
            >
              <span className="inline-block min-w-[2em] text-center">
                {icon}
              </span>
              <span className="inline-block min-w-[7em]">
                {stats.total > 0
                  ? `${stats.percent}% (${stats.success}/${stats.total}日)`
                  : '記録なし'}
              </span>
              {goalText && (
                <span className="ml-0 text-gray-500 dark:text-gray-300 text-xs sm:text-sm font-normal">
                  {goalText}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecordGraph;
