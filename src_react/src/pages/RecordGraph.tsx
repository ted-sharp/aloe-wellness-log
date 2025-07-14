import React, { useMemo, useState } from 'react';
import { HiCheck, HiXMark } from 'react-icons/hi2';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGraphData } from '../hooks/useGraphData';

const PERIODS = [
  { label: '2週間', days: 14 },
  { label: '1か月半', days: 45 },
  { label: '3か月', days: 90 },
  { label: '全データ', days: null },
];

const GRAPH_TYPES = [
  { label: '体重', value: 'weight' },
  { label: '体脂肪', value: 'bodyComposition' },
  { label: '血圧', value: 'bloodPressure' },
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

// 曜日配列を追加
const WEEKDAYS_JP = ['日', '月', '火', '水', '木', '金', '土'];

const RecordGraph: React.FC = () => {
  const [periodIdx, setPeriodIdx] = useState(0); // 期間選択
  const [showExcluded, setShowExcluded] = useState(false); // 除外値表示
  const [graphType, setGraphType] = useState<'weight' | 'bloodPressure' | 'bodyComposition'>('weight'); // グラフ種類
  
  // 統合データフェッチング
  const {
    // weightRecords,
    bpRecords,
    dailyRecords,
    goal,
    // latestTimestamp,
    isLoading,
    error,
    getFilteredData,
    getFilteredBpData,
    getFilteredBodyCompositionData,
    getStatusStats,
  } = useGraphData();
  
  // 期間に応じたデータを抽出
  const data = useMemo(() => {
    console.log('RecordGraph: data useMemo triggered');
    if (graphType === 'weight') {
      return getFilteredData(periodIdx, showExcluded);
    } else if (graphType === 'bloodPressure') {
      // 血圧データの場合は収縮期・拡張期の両方を含む
      const systolicData = getFilteredBpData(periodIdx, 'systolic');
      const diastolicData = getFilteredBpData(periodIdx, 'diastolic');
      
      // 両方のデータを合成
      return systolicData.map(item => ({
        ...item,
        diastolic: diastolicData.find(d => d.timestamp === item.timestamp)?.diastolic || 0,
      }));
    } else {
      // 体脂肪率・腹囲データの場合
      return getFilteredBodyCompositionData(periodIdx);
    }
  }, [getFilteredData, getFilteredBpData, getFilteredBodyCompositionData, periodIdx, showExcluded, graphType]);

  // グラフ範囲内の日付すべての00:00（ローカル）UNIXタイムスタンプ
  const dayStartLines = useMemo(() => {
    console.log('RecordGraph: dayStartLines useMemo triggered', data.length);
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

  // X軸ラベルをMM/DD(曜) HH:mm形式で表示
  const formatDateTimeLabel = (ts: number) => {
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const weekday = WEEKDAYS_JP[d.getDay()];
    return `${mm}/${dd}(${weekday}) ${hh}:${min}`;
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

  // type StatusKey = 'exercise' | 'meal' | 'sleep';
  type CustomTickProps = {
    x?: number;
    y?: number;
    payload: { value: number };
  };
  const CustomTick = (props: CustomTickProps) => {
    const { x = 0, y = 0, payload } = props;
    const ts = payload.value;
    const d = new Date(ts);
    const weekday = WEEKDAYS_JP[d.getDay()];
    return (
      <g>
        <text x={x} y={y + 10} textAnchor="middle" fontSize="12">{`${
          d.getMonth() + 1
        }/${d.getDate()}(${weekday})`}</text>
      </g>
    );
  };


  // ローディング表示
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">データを読み込み中...</p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-red-800 text-sm mb-2">データの読み込みに失敗しました</p>
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-start py-0 bg-transparent"
      data-testid="record-graph"
    >
      {/* グラフ種類選択 */}
      <div className="w-full mx-auto bg-white dark:bg-gray-800 shadow flex justify-center items-center mb-2 p-2">
        {GRAPH_TYPES.map((type) => (
          <button
            key={type.value}
            className={`flex-1 py-1.5 px-1 rounded-xl border-2 font-bold transition mx-0.5 text-sm
              ${
                graphType === type.value
                  ? 'border-blue-400 text-blue-500 scale-105 shadow'
                  : 'border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-400'
              }
            `}
            onClick={() => setGraphType(type.value as 'weight' | 'bloodPressure' | 'bodyComposition')}
          >
            {type.label}
          </button>
        ))}
      </div>
      
      {/* 期間切り替えボタン */}
      <div className="w-full mx-auto bg-white dark:bg-gray-800 shadow flex justify-center items-center mb-4 p-2">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            className={`flex-1 py-1.5 px-1 rounded-xl border-2 font-bold transition mx-0.5 text-sm
              ${
                periodIdx === i
                  ? 'border-orange-400 text-orange-500 scale-105 shadow'
                  : 'border-gray-300 text-gray-500 hover:border-orange-300 hover:text-orange-400'
              }
            `}
            onClick={() => setPeriodIdx(i)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {/* 凡例 */}
      <div className="flex gap-4 items-center mb-2 flex-wrap justify-center">
        {graphType === 'weight' ? (
          <>
            <span className="flex items-center text-sm font-semibold">
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 6,
                  background: '#f59e42',
                  borderRadius: 2,
                  marginRight: 6,
                }}
              />
              目標
            </span>
            <span className="flex items-center text-sm font-semibold">
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 6,
                  background: '#22c55e',
                  borderRadius: 2,
                  marginRight: 6,
                }}
              />
              傾向
            </span>
          </>
        ) : graphType === 'bloodPressure' ? (
          <>
            <span className="flex items-center text-sm font-semibold">
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 6,
                  background: '#ef4444',
                  borderRadius: 2,
                  marginRight: 6,
                }}
              />
              収縮期
            </span>
            <span className="flex items-center text-sm font-semibold">
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 6,
                  background: '#3b82f6',
                  borderRadius: 2,
                  marginRight: 6,
                }}
              />
              拡張期
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center text-sm font-semibold">
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 6,
                  background: '#8b5cf6',
                  borderRadius: 2,
                  marginRight: 6,
                }}
              />
              体脂肪率
            </span>
            <span className="flex items-center text-sm font-semibold">
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 6,
                  background: '#f59e0b',
                  borderRadius: 2,
                  marginRight: 6,
                }}
              />
              腹囲
            </span>
          </>
        )}
      </div>
      <div className="w-full h-[400px] bg-white dark:bg-gray-800 rounded-xl shadow p-1 relative">
        {graphType === 'weight' && (
          <label className="flex items-center absolute right-0 top-0 bg-white/80 dark:bg-gray-800/80 px-1 py-0 h-6 min-h-0 rounded-none leading-tight text-xs font-bold z-10 w-auto cursor-pointer select-none">
            <input
              type="checkbox"
              className="form-checkbox accent-blue-600 mr-1"
              checked={showExcluded}
              onChange={e => setShowExcluded(e.target.checked)}
            />
            除外値も表示
          </label>
        )}
        <ResponsiveContainer width="100%" height="100%">
          {graphType === 'bodyComposition' ? (
            <ComposedChart
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
                    yAxisId="left"
                  />
                ))}
              <YAxis yAxisId="left" domain={['auto', 'auto']} unit="%" />
              <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} unit="cm" />
              <Tooltip
                content={({ active, payload, label: _ }) => {
                  if (!active || !payload || !payload.length) return null;
                  const point = payload[0]?.payload;
                  const ts = point?.timestamp;
                  const d = ts ? new Date(ts) : null;
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
                        {d ? formatDateTimeLabel(ts) : ''}
                      </div>
                      {payload.map((item, idx) => (
                        <div
                          key={idx}
                          style={{ color: item.color, fontSize: 14 }}
                        >
                          {item.dataKey === 'bodyFat' ? '体脂肪率: ' : '腹囲: '}
                          {typeof item.value === 'number'
                            ? item.value.toFixed(1)
                            : item.value}
                          {item.dataKey === 'bodyFat' ? '%' : 'cm'}
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {/* 体脂肪率ライン */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bodyFat"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{
                  fill: '#8b5cf6',
                  stroke: '#fff',
                  strokeWidth: 1,
                  r: 4,
                }}
                activeDot={false}
                connectNulls={false}
              />
              {/* 腹囲ライン */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="waist"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{
                  fill: '#f59e0b',
                  stroke: '#fff',
                  strokeWidth: 1,
                  r: 4,
                }}
                activeDot={false}
                connectNulls={false}
              />
            </ComposedChart>
          ) : (
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
            {graphType === 'bodyComposition' ? (
              <>
                <YAxis yAxisId="left" domain={['auto', 'auto']} unit="%" />
                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} unit="cm" />
              </>
            ) : (
              <YAxis domain={['auto', 'auto']} unit={graphType === 'weight' ? 'kg' : 'mmHg'} />
            )}
            {/* 目標体重線（傾きあり・表示期間でクリップ） */}
            {graphType === 'weight' && (() => {
              if (!goal) return null;
              const hasStart =
                typeof goal.startWeight === 'number' &&
                isFinite(goal.startWeight);
              const hasTarget =
                typeof goal.targetWeight === 'number' &&
                isFinite(goal.targetWeight);
              const hasStartDate =
                typeof goal.targetStart === 'string' &&
                !isNaN(Date.parse(goal.targetStart));
              const hasEndDate =
                typeof goal.targetEnd === 'string' &&
                !isNaN(Date.parse(goal.targetEnd));
              if (!hasStart || !hasTarget || !hasStartDate || !hasEndDate)
                return null;
              const x1 = Date.parse(goal.targetStart!);
              const y1 = goal.startWeight!;
              const x2 = Date.parse(goal.targetEnd!);
              const y2 = goal.targetWeight!;
              if (x1 >= x2) return null;
              // グラフの表示範囲
              const [domainStart, domainEnd] = xAxisDomain as [number, number];
              // 目標線の描画区間（表示範囲と目標期間の重なり）
              const lineStart = Math.max(x1, domainStart);
              const lineEnd = Math.min(x2, domainEnd);
              if (lineStart > lineEnd) return null; // 重なりなし
              // 線の両端のy値を直線式で計算
              const getY = (x: number) =>
                y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
              const targetLineData = [
                { timestamp: lineStart, value: getY(lineStart) },
                { timestamp: lineEnd, value: getY(lineEnd) },
              ];
              return (
                <Line
                  type="linear"
                  data={targetLineData}
                  dataKey="value"
                  stroke="#f59e42"
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  strokeDasharray="4 2"
                  legendType="none"
                />
              );
            })()}
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
                        if (
                          !payload ||
                          !Array.isArray(payload) ||
                          payload.length === 0
                        )
                          return '';
                        const pt = payload[0]?.payload;
                        if (
                          !pt ||
                          typeof pt !== 'object' ||
                          pt === null ||
                          !('timestamp' in pt)
                        )
                          return '';
                        const ts = (pt as Pt).timestamp;
                        const d = new Date(ts);
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const hh = String(d.getHours()).padStart(2, '0');
                        const min = String(d.getMinutes()).padStart(2, '0');
                        const weekday = WEEKDAYS_JP[d.getDay()];
                        return `${mm}/${dd}(${weekday}) ${hh}:${min}`;
                      })()}
                    </div>
                    {((payload ?? []) as TooltipItem[])
                      .filter(
                        item =>
                          item &&
                          item.color !== '#f59e42' &&
                          item.color !== '#22c55e'
                      )
                      .map((item, idx) => (
                        <div
                          key={idx}
                          style={{ color: item.color, fontSize: 14 }}
                        >
                          {typeof item.value === 'number'
                            ? item.value.toFixed(graphType === 'weight' ? 2 : 0)
                            : item.value}
                          {graphType === 'weight' ? 'kg' : 'mmHg'}
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
                          const rec = dailyRecords.find(
                            r => r.fieldId === key && r.date === dateStr
                          );
                          if (rec === undefined) return null; // 入力がなければ非表示
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
                              {rec.value === 1 ? (
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
                        });
                      })()}
                    </div>
                  </div>
                );
              }}
            />
            {graphType === 'weight' ? (
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
            ) : (
              <>
                {/* 収縮期血圧（上の血圧） */}
                <Line
                  type="monotone"
                  dataKey="systolic"
                  data={data}
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{
                    fill: '#ef4444',
                    stroke: '#fff',
                    strokeWidth: 1,
                    r: 4,
                  }}
                  activeDot={false}
                />
                {/* 拡張期血圧（下の血圧） */}
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  data={data}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{
                    fill: '#3b82f6',
                    stroke: '#fff',
                    strokeWidth: 1,
                    r: 4,
                  }}
                  activeDot={false}
                />
              </>
            )}
            {graphType === 'weight' && trendLine && (
              <Line
                type="linear"
                data={trendLine}
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                strokeDasharray="6 6"
                legendType="none"
              />
            )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {/* グラフ下部に日課達成率を表示（3行・目標併記） */}
      {graphType === 'weight' && (
        <div className="w-full flex flex-col items-start gap-1 mt-4 mb-2 text-left">
        {(['exercise', 'meal', 'sleep'] as const).map(key => {
          const stats = getStatusStats(key, periodIdx);
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
      )}
    </div>
  );
};

export default RecordGraph;
