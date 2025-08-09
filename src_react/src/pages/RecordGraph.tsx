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
import { useGraphCalculations } from '../hooks/business/useGraphCalculations';
import { useGraphData } from '../hooks/useGraphData';

const PERIODS = [
  { label: '2週間', days: 14 },
  { label: '1か月', days: 30 },
  { label: '2か月', days: 60 },
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
  const [graphType, setGraphType] = useState<
    'weight' | 'bloodPressure' | 'bodyComposition'
  >('weight'); // グラフ種類

  // グラフ計算ロジック
  const graphCalculations = useGraphCalculations();

  // 統合データフェッチング
  const {
    // weightRecords,
    // bpRecords,
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
    const days = PERIODS[periodIdx].days;
    if (graphType === 'weight') {
      return getFilteredData(days || 9999, showExcluded);
    } else if (graphType === 'bloodPressure') {
      // 血圧データの場合は収縮期・拡張期の両方を含む
      const bloodPressureData = getFilteredBpData(days || 9999, showExcluded);
      return bloodPressureData;
    } else {
      // 体脂肪率・腹囲データの場合
      return getFilteredBodyCompositionData(days || 9999, showExcluded);
    }
  }, [
    periodIdx,
    showExcluded,
    graphType,
    getFilteredData,
    getFilteredBpData,
    getFilteredBodyCompositionData,
  ]);

  // グラフ範囲内の日付すべての00:00（ローカル）UNIXタイムスタンプ
  const dayStartLines = useMemo(() => {
    return graphCalculations.calculateDayStartLines(data);
  }, [data, graphCalculations]);

  // X軸domain（日単位で固定）
  const xAxisDomain = useMemo(() => {
    if (!data.length) return ['auto', 'auto'];

    // 全データの最小・最大タイムスタンプを取得
    const timestamps = data.map(d => d.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);

    const start = new Date(minTimestamp);
    const end = new Date(maxTimestamp);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return [start.getTime(), end.getTime()];
  }, [data]);

  // X軸tick値（日付の00:00）
  const xAxisTicks = useMemo(() => {
    if (periodIdx !== 0 || !data.length) return undefined;
    return graphCalculations.calculateXAxisTicks(data);
  }, [data, periodIdx, graphCalculations]);

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
    if (graphType === 'weight') {
      return graphCalculations.calculateWeightTrendLine(data);
    }
    return null;
  }, [data, graphType, graphCalculations]);

  // 体脂肪率の傾向線計算
  const bodyFatTrendLine = useMemo(() => {
    if (graphType !== 'bodyComposition') return null;
    return graphCalculations.calculateBodyFatTrendLine(data);
  }, [data, graphType, graphCalculations]);

  // 腹囲の傾向線計算
  const waistTrendLine = useMemo(() => {
    if (graphType !== 'bodyComposition') return null;
    return graphCalculations.calculateWaistTrendLine(data);
  }, [data, graphType, graphCalculations]);

  // 血圧（収縮期）の傾向線計算
  const systolicTrendLine = useMemo(() => {
    if (graphType !== 'bloodPressure') return null;
    return graphCalculations.calculateSystolicTrendLine(data);
  }, [data, graphType, graphCalculations]);

  // 血圧（拡張期）の傾向線計算
  const diastolicTrendLine = useMemo(() => {
    if (graphType !== 'bloodPressure') return null;
    return graphCalculations.calculateDiastolicTrendLine(data);
  }, [data, graphType, graphCalculations]);

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
        <p className="text-gray-600 dark:text-gray-400">
          データを読み込み中...
        </p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-red-800 text-sm mb-2">
            データの読み込みに失敗しました
          </p>
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
      <div className="w-full mx-auto bg-white dark:bg-gray-800 shadow flex justify-center items-center mb-2 py-1 px-2">
        {GRAPH_TYPES.map(type => (
          <button
            key={type.value}
            className={`flex-1 rounded-lg border font-semibold transition mx-0.5 text-xs leading-none flex items-center justify-center
              ${
                graphType === type.value
                  ? 'border-blue-400 text-blue-500 shadow'
                  : 'border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-400'
              }
            `}
            style={{
              height: '24px',
              minHeight: '24px',
              maxHeight: '24px',
              padding: '0',
            }}
            onClick={() =>
              setGraphType(
                type.value as 'weight' | 'bloodPressure' | 'bodyComposition'
              )
            }
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
            className={`flex-1 rounded-lg border font-semibold transition mx-0.5 text-xs leading-none flex items-center justify-center
              ${
                periodIdx === i
                  ? 'border-orange-400 text-orange-500 shadow'
                  : 'border-gray-300 text-gray-500 hover:border-orange-300 hover:text-orange-400'
              }
            `}
            style={{
              height: '24px',
              minHeight: '24px',
              maxHeight: '24px',
              padding: '0',
            }}
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
            <span className="flex items-center text-sm font-semibold">
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 2,
                  background: '#8b5cf6',
                  borderRadius: 1,
                  marginRight: 6,
                  borderStyle: 'dashed',
                  borderWidth: '1px 0',
                  borderColor: '#8b5cf6',
                }}
              />
              体脂肪傾向
            </span>
            <span className="flex items-center text-sm font-semibold">
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 2,
                  background: '#f59e0b',
                  borderRadius: 1,
                  marginRight: 6,
                  borderStyle: 'dashed',
                  borderWidth: '1px 0',
                  borderColor: '#f59e0b',
                }}
              />
              腹囲傾向
            </span>
          </>
        )}
      </div>
      <div className="w-full h-[400px] bg-white dark:bg-gray-800 rounded-xl shadow p-1 relative">
        {(graphType === 'weight' ||
          graphType === 'bloodPressure' ||
          graphType === 'bodyComposition') && (
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
                tickFormatter={
                  periodIdx === 0 ? undefined : formatDateTimeLabel
                }
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
              <YAxis yAxisId="left" domain={['auto', 'auto']} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={['auto', 'auto']}
              />
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
                      {(
                        payload
                          // 体組成は実データのみ表示（傾向線は除外）
                          .filter(
                            item =>
                              item &&
                              (item.dataKey === 'bodyFat' ||
                                item.dataKey === 'waist')
                          ) || []
                      ).map((item, idx) => (
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
                key="bodyFat-line"
                yAxisId="left"
                type="monotone"
                dataKey="bodyFat"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={({ cx, cy, payload, index }) => (
                  <circle
                    key={`bodyFat-dot-${payload?.id || index}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.excluded ? '#f87171' : '#8b5cf6'}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )}
                activeDot={false}
                connectNulls={false}
              />
              {/* 腹囲ライン */}
              <Line
                key="waist-line"
                yAxisId="right"
                type="monotone"
                dataKey="waist"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={({ cx, cy, payload, index }) => (
                  <circle
                    key={`waist-dot-${payload?.id || index}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.excluded ? '#f87171' : '#f59e0b'}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )}
                activeDot={false}
                connectNulls={false}
              />
              {/* 体脂肪率傾向線 */}
              {bodyFatTrendLine && (
                <Line
                  key="bodyFat-trend"
                  yAxisId="left"
                  type="linear"
                  data={bodyFatTrendLine}
                  dataKey="bodyFatTrend"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  strokeDasharray="6 6"
                  legendType="none"
                />
              )}
              {/* 腹囲傾向線 */}
              {waistTrendLine && (
                <Line
                  key="waist-trend"
                  yAxisId="right"
                  type="linear"
                  data={waistTrendLine}
                  dataKey="waistTrend"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  strokeDasharray="6 6"
                  legendType="none"
                />
              )}
              {/* 体組成グラフの単位表示 */}
              <text
                x={40}
                y={10}
                textAnchor="start"
                fontSize="12"
                fill="#666"
                fontWeight="bold"
              >
                (%)
              </text>
              <text
                x={window.innerWidth - 100}
                y={10}
                textAnchor="end"
                fontSize="12"
                fill="#666"
                fontWeight="bold"
              >
                (cm)
              </text>
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
                tickFormatter={
                  periodIdx === 0 ? undefined : formatDateTimeLabel
                }
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
              {(graphType as string) === 'bodyComposition' ? (
                <>
                  <YAxis yAxisId="left" domain={['auto', 'auto']} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={['auto', 'auto']}
                  />
                  {/* 体組成グラフの単位表示 */}
                  <text
                    x={30}
                    y={10}
                    textAnchor="start"
                    fontSize="12"
                    fill="#666"
                    fontWeight="bold"
                  >
                    (%)
                  </text>
                  <text
                    x={window.innerWidth - 50}
                    y={10}
                    textAnchor="end"
                    fontSize="12"
                    fill="#666"
                    fontWeight="bold"
                  >
                    (cm)
                  </text>
                </>
              ) : (
                <>
                  <YAxis domain={['auto', 'auto']} />
                  {/* 体重・血圧グラフの単位表示 */}
                  <text
                    x={30}
                    y={10}
                    textAnchor="start"
                    fontSize="12"
                    fill="#666"
                    fontWeight="bold"
                  >
                    ({graphType === 'weight' ? 'kg' : 'mmHg'})
                  </text>
                </>
              )}
              {/* 目標体重線（傾きあり・表示期間でクリップ） */}
              {graphType === 'weight' &&
                (() => {
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
                  const [domainStart, domainEnd] = xAxisDomain as [
                    number,
                    number
                  ];
                  // 目標線の描画区間（表示範囲と目標期間の重なり）
                  const lineStart = Math.max(x1, domainStart);
                  const lineEnd = Math.min(x2, domainEnd);
                  if (lineStart > lineEnd) return null; // 重なりなし
                  // 線の両端のy値を直線式で計算
                  const getY = (x: number) =>
                    y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
                  const targetLineData = [
                    { timestamp: lineStart, targetValue: getY(lineStart) },
                    { timestamp: lineEnd, targetValue: getY(lineEnd) },
                  ];
                  return (
                    <Line
                      key="weight-target"
                      type="linear"
                      data={targetLineData}
                      dataKey="targetValue"
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
                      {(graphType as string) !== 'bodyComposition' &&
                        ((payload ?? []) as TooltipItem[])
                          .filter(item => {
                            // 目標線・傾向線はデータキーで除外
                            const key = (item as { dataKey?: string })?.dataKey;
                            return (
                              key !== 'targetValue' &&
                              key !== 'weightTrend' &&
                              key !== 'systolicTrend' &&
                              key !== 'diastolicTrend'
                            );
                          })
                          .map((item, idx) => (
                            <div
                              key={idx}
                              style={{ color: item.color, fontSize: 14 }}
                            >
                              {typeof item.value === 'number'
                                ? item.value.toFixed(
                                    graphType === 'weight' ? 2 : 0
                                  )
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
                  key="weight-line"
                  type="monotone"
                  dataKey="value"
                  data={data}
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={({ cx, cy, payload, index }) => (
                    <circle
                      key={`weight-dot-${payload?.id || index}`}
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
                    key="systolic-line"
                    type="monotone"
                    dataKey="systolic"
                    data={data}
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={({ cx, cy, payload, index }) => (
                      <circle
                        key={`systolic-dot-${payload?.id || index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={payload.excluded ? '#f87171' : '#ef4444'}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    )}
                    activeDot={false}
                  />
                  {/* 拡張期血圧（下の血圧） */}
                  <Line
                    key="diastolic-line"
                    type="monotone"
                    dataKey="diastolic"
                    data={data}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={({ cx, cy, payload, index }) => (
                      <circle
                        key={`diastolic-dot-${payload?.id || index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={payload.excluded ? '#f87171' : '#3b82f6'}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    )}
                    activeDot={false}
                  />
                  {/* 収縮期血圧傾向線 */}
                  {systolicTrendLine && (
                    <Line
                      key="systolic-trend"
                      type="linear"
                      data={systolicTrendLine}
                      dataKey="systolicTrend"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                      strokeDasharray="6 6"
                      legendType="none"
                    />
                  )}
                  {/* 拡張期血圧傾向線 */}
                  {diastolicTrendLine && (
                    <Line
                      key="diastolic-trend"
                      type="linear"
                      data={diastolicTrendLine}
                      dataKey="diastolicTrend"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                      strokeDasharray="6 6"
                      legendType="none"
                    />
                  )}
                </>
              )}
              {graphType === 'weight' && trendLine && (
                <Line
                  key="weight-trend"
                  type="linear"
                  data={trendLine}
                  dataKey="weightTrend"
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
      {graphType === 'bloodPressure' && (
        <div className="w-full flex justify-center">
          <div className="text-gray-600 dark:text-gray-300 text-[11px] sm:text-xs mt-1 px-1 leading-tight text-left max-w-[720px] w-full">
            10分以内に複数回測定がある場合、最も低い結果を代表値として表示します（合計が同じ場合は拡張期→時刻で決定）。
          </div>
        </div>
      )}
      {/* グラフ下部に日課達成率を表示（3行・目標併記） */}
      {graphType === 'weight' && (
        <div className="w-full flex flex-col items-start gap-1 mt-4 mb-2 text-left">
          {(['exercise', 'meal', 'sleep'] as const).map(key => {
            const stats = getStatusStats(key, PERIODS[periodIdx].days || 9999);
            let goalText = '';
            if (goal) {
              if (key === 'exercise' && goal.exerciseGoal)
                goalText = `${goal.exerciseGoal}`;
              if (key === 'meal' && goal.dietGoal)
                goalText = `${goal.dietGoal}`;
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
                    ? `${stats.rate.toFixed(0)}% (${stats.achieved}/${
                        stats.total
                      }日)`
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
