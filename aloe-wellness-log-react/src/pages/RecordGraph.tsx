import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../hooks/useI18n';
import { useRecordsStore } from '../store/records';
import { isDev } from '../utils/devTools';
import {
  performanceMonitor,
  trackDatabaseOperation,
} from '../utils/performanceMonitor';

export default function RecordGraph() {
  const { t } = useI18n();
  const { records, fields, loadRecords, loadFields } = useRecordsStore();

  // パフォーマンス監視の初期化
  useEffect(() => {
    performanceMonitor.trackRender.start('RecordGraph');
    return () => {
      performanceMonitor.trackRender.end('RecordGraph');
    };
  });

  // データ読み込み（パフォーマンス監視付き）
  useEffect(() => {
    const loadData = async () => {
      try {
        await trackDatabaseOperation('load-fields-graph', async () => {
          await loadFields();
        });

        await trackDatabaseOperation('load-records-graph', async () => {
          await loadRecords();
        });
      } catch (error) {
        console.error('Data loading error:', error);
      }
    };

    loadData();
  }, [loadFields, loadRecords]);

  // 期間選択オプション
  const PERIOD_OPTIONS = [
    { label: t('pages.graph.periods.week'), value: 7 },
    { label: t('pages.graph.periods.month'), value: 30 },
    { label: t('pages.graph.periods.all'), value: 0 },
  ];

  // フィールド選択肢（グラフ除外フラグ対応）
  const numberFields = fields
    .filter(
      f => (f.type === 'number' || f.type === 'string') && !f.excludeFromGraph
    )
    .sort((a, b) => (a.order || 999) - (b.order || 999));
  const [selectedFieldId, setSelectedFieldId] = useState(
    numberFields.length > 0 ? numberFields[0].fieldId : ''
  );
  const [period, setPeriod] = useState(7); // デフォルト1週間

  // 選択中の項目のデータのみ抽出（パフォーマンス監視付き）
  const filteredData = useMemo(() => {
    const startTime = performance.now();

    if (!selectedFieldId) return [];
    let data = records
      .filter(r => r.fieldId === selectedFieldId)
      .map(r => ({ ...r, date: r.date || r.datetime?.slice(0, 10) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (period > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - period + 1);
      data = data.filter(r => new Date(r.date) >= cutoff);
    }

    const duration = performance.now() - startTime;
    if (isDev && duration > 10) {
      console.warn(
        `🐌 Slow graph data filtering: ${duration.toFixed(2)}ms for ${
          records.length
        } records`
      );
    }

    return data;
  }, [records, selectedFieldId, period]);

  // フィールド選択のハンドラー（パフォーマンス監視付き）
  const handleFieldChange = (fieldId: string) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('field-select');
    setSelectedFieldId(fieldId);
    performanceMonitor.trackInteraction.end(interactionId, 'field-select');
  };

  // 期間選択のハンドラー（パフォーマンス監視付き）
  const handlePeriodChange = (newPeriod: number) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('period-select');
    setPeriod(newPeriod);
    performanceMonitor.trackInteraction.end(interactionId, 'period-select');
  };

  // 開発環境でのパフォーマンス情報表示
  useEffect(() => {
    if (!isDev) return;

    const logPerformanceInfo = () => {
      console.group('🔍 RecordGraph Performance Info');
      console.log(`📊 Total Records: ${records.length}`);
      console.log(`📊 Total Fields: ${fields.length}`);
      console.log(`📊 Number Fields: ${numberFields.length}`);
      console.log(`📊 Filtered Data Points: ${filteredData.length}`);
      console.log(`📊 Selected Field: ${selectedFieldId}`);
      console.log(`📊 Period: ${period} days`);
      console.groupEnd();
    };

    const timeout = setTimeout(logPerformanceInfo, 2000);
    return () => clearTimeout(timeout);
  }, [
    records.length,
    fields.length,
    numberFields.length,
    filteredData.length,
    selectedFieldId,
    period,
  ]);

  return (
    <div className="p-2 sm:p-4 max-w-full sm:max-w-2xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen px-2 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-12">
        {t('pages.graph.title')}
      </h1>
      <div className="flex gap-4 mb-4 items-center">
        <label className="text-gray-700 dark:text-gray-300">
          {t('pages.graph.field')}
          <select
            value={selectedFieldId}
            onChange={e => handleFieldChange(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded px-2 py-1 ml-2 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-400"
          >
            {numberFields.map(f => (
              <option key={f.fieldId} value={f.fieldId}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-gray-700 dark:text-gray-300">
          {t('pages.graph.period')}
          <select
            value={period}
            onChange={e => handlePeriodChange(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded px-2 py-1 ml-2 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-400"
          >
            {PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              name={numberFields.find(f => f.fieldId === selectedFieldId)?.name}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
