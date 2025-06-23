import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { HiCheckCircle, HiClock, HiXCircle } from 'react-icons/hi2';
import { useI18n } from '../hooks/useI18n';
import { useRecordsStore } from '../store/records';
import type { RecordItem } from '../types/record';
import { isDev } from '../utils/devTools';
import {
  performanceMonitor,
  trackDatabaseOperation,
} from '../utils/performanceMonitor';
import { truncateText } from '../utils/textUtils';

export default function RecordCalendar() {
  const { t, translateFieldName, currentLanguage, formatDate } = useI18n();
  const { records, fields, loadRecords, loadFields } = useRecordsStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());

  // 現在の言語からlocaleを決定
  const currentLocale = currentLanguage === 'ja' ? 'ja-JP' : 'en-US';

  // パフォーマンス監視の初期化
  useEffect(() => {
    performanceMonitor.trackRender.start('RecordCalendar');
    return () => {
      performanceMonitor.trackRender.end('RecordCalendar');
    };
  });

  // データ読み込み（パフォーマンス監視付き）
  useEffect(() => {
    const loadData = async () => {
      try {
        await trackDatabaseOperation('load-fields-calendar', async () => {
          await loadFields();
        });

        await trackDatabaseOperation('load-records-calendar', async () => {
          await loadRecords();
        });
      } catch (error) {
        console.error('Data loading error:', error);
      }
    };

    loadData();
  }, [loadFields, loadRecords]);

  // fieldIdから項目名・型を取得（RecordListと同じ関数）
  const getField = (fieldId: string) => {
    if (fieldId === 'notes') {
      return {
        fieldId: 'notes',
        name: translateFieldName('notes'),
        type: 'string' as const,
        order: 0,
      };
    }

    // 優先順位1: fieldIdで検索
    let field = fields.find(f => f.fieldId === fieldId);

    // 優先順位2: nameで検索（fieldIdで見つからない場合）
    if (!field) {
      field = fields.find(f => f.name === fieldId);
    }

    return field;
  };

  const _toggleTextExpansion = (recordId: string) => {
    setExpandedTexts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const isTextExpanded = (recordId: string) => {
    return expandedTexts.has(recordId);
  };

  // 項目の順序を制御する関数（RecordListと同じ関数）
  const sortRecordsByFieldOrder = (records: RecordItem[]) => {
    return [...records].sort((a, b) => {
      const fieldA = getField(a.fieldId);
      const fieldB = getField(b.fieldId);

      // order属性で並び替え（小さいほど上に表示）
      const orderA = fieldA?.order ?? 999;
      const orderB = fieldB?.order ?? 999;

      return orderA - orderB;
    });
  };

  // 日付ごとに記録があるかどうかを判定（パフォーマンス監視付き）
  const recordDates = useMemo(() => {
    const startTime = performance.now();
    const set = new Set(records.map(r => r.date));

    const duration = performance.now() - startTime;
    if (isDev && duration > 10) {
      console.warn(
        `🐌 Slow record dates calculation: ${duration.toFixed(2)}ms for ${
          records.length
        } records`
      );
    }

    return set;
  }, [records]);

  // 選択日の記録一覧（パフォーマンス監視付き）
  const selectedRecords = useMemo(() => {
    const startTime = performance.now();

    if (!selectedDate) return [];
    // タイムゾーンを考慮した日付文字列を作成
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const result = records.filter(r => r.date === dateStr);

    const duration = performance.now() - startTime;
    if (isDev && duration > 10) {
      console.warn(
        `🐌 Slow selected records filtering: ${duration.toFixed(2)}ms for ${
          records.length
        } records`
      );
    }

    return result;
  }, [records, selectedDate]);

  // 選択日の記録を時刻ごとにグループ化（パフォーマンス監視付き）
  const groupedSelectedRecords = useMemo(() => {
    const startTime = performance.now();

    if (selectedRecords.length === 0) return {};

    // 時刻で降順ソート（新しい順）
    const sortedRecords = [...selectedRecords].sort((a, b) => {
      const aKey = `${a.date} ${a.time}`;
      const bKey = `${b.date} ${b.time}`;
      return bKey.localeCompare(aKey);
    });

    // 日付・時刻ごとにグループ化
    const groupMap: Record<string, RecordItem[]> = {};
    const result = sortedRecords.reduce((acc, rec) => {
      const key = `${rec.date} ${rec.time}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    }, groupMap);

    const duration = performance.now() - startTime;
    if (isDev && duration > 10) {
      console.warn(
        `🐌 Slow record grouping: ${duration.toFixed(2)}ms for ${
          selectedRecords.length
        } records`
      );
    }

    return result;
  }, [selectedRecords]);

  // 日付選択のハンドラー（パフォーマンス監視付き）
  const handleDateChange = (date: Date | null) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('date-select');
    setSelectedDate(date);
    performanceMonitor.trackInteraction.end(interactionId, 'date-select');
  };

  // テキスト展開のハンドラー（パフォーマンス監視付き）
  const handleToggleTextExpansion = (recordId: string) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('text-expand');
    _toggleTextExpansion(recordId);
    performanceMonitor.trackInteraction.end(interactionId, 'text-expand');
  };

  // 開発環境でのパフォーマンス情報表示
  useEffect(() => {
    if (!isDev) return;

    const logPerformanceInfo = () => {
      console.group('🔍 RecordCalendar Performance Info');
      console.log(`📊 Total Records: ${records.length}`);
      console.log(`📊 Total Fields: ${fields.length}`);
      console.log(`📊 Record Dates Count: ${recordDates.size}`);
      console.log(`📊 Selected Records: ${selectedRecords.length}`);
      console.log(
        `📊 Grouped Records: ${
          Object.keys(groupedSelectedRecords).length
        } groups`
      );
      console.log(`📊 Expanded Texts: ${expandedTexts.size}`);
      console.log(
        `📊 Selected Date: ${
          selectedDate ? selectedDate.toISOString().split('T')[0] : 'none'
        }`
      );
      console.groupEnd();
    };

    const timeout = setTimeout(logPerformanceInfo, 2000);
    return () => clearTimeout(timeout);
  }, [
    records.length,
    fields.length,
    recordDates.size,
    selectedRecords.length,
    Object.keys(groupedSelectedRecords).length,
    expandedTexts.size,
    selectedDate,
  ]);

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-12">
        {t('pages.calendar.title')}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8">
        <style>{`
          .react-calendar {
            width: 100%;
            background: transparent;
            border: none;
            font-family: inherit;
          }
          .react-calendar__tile {
            padding: 12px 8px;
            background: transparent;
            border-radius: 8px;
            transition: all 0.2s;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #374151;
          }
          @media (prefers-color-scheme: dark) {
            .react-calendar__tile {
              color: #d1d5db;
            }
          }
          .react-calendar__tile:enabled:hover,
          .react-calendar__tile:enabled:focus {
            background-color: #dbeafe;
          }
          @media (prefers-color-scheme: dark) {
            .react-calendar__tile:enabled:hover,
            .react-calendar__tile:enabled:focus {
              background-color: #1e3a8a;
            }
          }
          .react-calendar__tile--active {
            background: #2563eb !important;
            color: white !important;
          }
          .react-calendar__tile--active .record-border {
            border-color: white !important;
          }
          .react-calendar__navigation button {
            color: #374151;
            font-weight: 500;
            font-size: 16px;
            padding: 8px 16px;
          }
          @media (prefers-color-scheme: dark) {
            .react-calendar__navigation button {
              color: #d1d5db;
            }
          }
          .react-calendar__navigation button:enabled:hover,
          .react-calendar__navigation button:enabled:focus {
            background-color: #f3f4f6;
            border-radius: 8px;
          }
          @media (prefers-color-scheme: dark) {
            .react-calendar__navigation button:enabled:hover,
            .react-calendar__navigation button:enabled:focus {
              background-color: #374151;
            }
          }
          .react-calendar__month-view__weekdays {
            font-weight: 600;
            color: #6b7280;
          }
          @media (prefers-color-scheme: dark) {
            .react-calendar__month-view__weekdays {
              color: #9ca3af;
            }
          }
        `}</style>
        <Calendar
          onChange={date => handleDateChange(date as Date)}
          value={selectedDate}
          locale={currentLocale}
          tileContent={({ date, view }) => {
            if (view === 'month') {
              // タイムゾーンを考慮した日付文字列を作成
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              if (recordDates.has(dateStr)) {
                return (
                  <div className="absolute inset-0 border-2 border-blue-600 rounded-lg pointer-events-none record-border" />
                );
              }
            }
            return null;
          }}
        />
      </div>

      {selectedDate && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-8">
            {formatDate(selectedDate, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}{' '}
            {t('pages.calendar.recordsFor')}
          </h2>
          {selectedRecords.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg">{t('pages.calendar.noRecords')}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedSelectedRecords).map(
                ([datetime, recs]) => (
                  <div
                    key={datetime}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
                  >
                    <div className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-600 pb-4 flex items-center gap-2">
                      <HiClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      {recs[0].time}
                    </div>
                    <ul className="space-y-4">
                      {sortRecordsByFieldOrder(recs).map(rec => {
                        const field = getField(rec.fieldId);
                        return (
                          <li
                            key={rec.id}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                          >
                            {field?.fieldId === 'notes' ? (
                              // 備考は縦棒区切りの左寄せレイアウト
                              <div className="flex items-stretch gap-2">
                                <div className="text-xl font-medium text-gray-700 dark:text-gray-300 pr-2 border-r border-gray-200 dark:border-gray-500 flex-shrink-0">
                                  {field ? field.name : rec.fieldId}
                                </div>
                                <div className="text-lg text-gray-800 dark:text-white font-semibold pl-2 flex-1 min-w-0">
                                  {typeof rec.value === 'string' &&
                                  rec.value.length > 30 ? (
                                    <button
                                      onClick={() =>
                                        handleToggleTextExpansion(rec.id)
                                      }
                                      className="text-left hover:text-blue-600 transition-colors break-words w-full"
                                      title={t('common.clickToExpand')}
                                    >
                                      {isTextExpanded(rec.id)
                                        ? rec.value
                                        : truncateText(rec.value)}
                                    </button>
                                  ) : (
                                    <span className="break-words">
                                      {rec.value}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              // 備考以外は真ん中で区切って右寄せ・左寄せレイアウト
                              <div className="grid grid-cols-2 gap-2 items-stretch">
                                <div className="text-xl font-medium text-gray-700 dark:text-gray-300 text-right pr-2 border-r border-gray-200 dark:border-gray-500">
                                  {field ? field.name : rec.fieldId}
                                </div>
                                <div className="text-lg text-gray-800 dark:text-white font-semibold pl-2 text-left">
                                  {typeof rec.value === 'boolean' ? (
                                    rec.value ? (
                                      <span className="inline-flex items-center gap-2 text-green-600">
                                        <HiCheckCircle className="w-6 h-6" />
                                        {t('fields.yes')}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-2 text-red-600">
                                        <HiXCircle className="w-6 h-6" />
                                        {t('fields.no')}
                                      </span>
                                    )
                                  ) : (
                                    <span className="break-words">
                                      {rec.value}
                                      {field?.unit &&
                                        typeof rec.value !== 'boolean' && (
                                          <span className="text-gray-600 dark:text-gray-400 ml-1">
                                            {field.unit}
                                          </span>
                                        )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
