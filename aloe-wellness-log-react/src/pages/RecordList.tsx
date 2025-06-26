import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiCalendarDays,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi2';
import Button from '../components/Button';
import RecordItem from '../components/RecordItem';
import { useI18n } from '../hooks/useI18n';
import { useRecordsStore } from '../store/records';
import type { Field, RecordItem as RecordItemType } from '../types/record';
import { isDev } from '../utils/devTools';
import {
  performanceMonitor,
  trackDatabaseOperation,
} from '../utils/performanceMonitor';

// メモ化されたレコードグループコンポーネント（パフォーマンス監視付き）
const RecordGroup = memo<{
  datetime: string;
  records: RecordItemType[];
  getField: (fieldId: string) => Field | undefined;
  sortRecordsByFieldOrder: (records: RecordItemType[]) => RecordItemType[];
  editId: string | null;
  editValue: string | number | boolean;
  expandedTexts: Set<string>;
  showButtons: Set<string>;
  onEdit: (record: RecordItemType) => void;
  onEditSave: (record: RecordItemType) => void;
  onEditCancel: (recordId: string) => void;
  onDelete: (record: RecordItemType) => void;
  onEditValueChange: (value: string | number | boolean) => void;
  onToggleTextExpansion: (recordId: string) => void;
  onToggleButtons: (recordId: string) => void;
  onToggleExclude: (record: RecordItemType) => void;
}>(
  ({
    datetime,
    records,
    getField,
    sortRecordsByFieldOrder,
    editId,
    editValue,
    expandedTexts,
    showButtons,
    onEdit,
    onEditSave,
    onEditCancel,
    onDelete,
    onEditValueChange,
    onToggleTextExpansion,
    onToggleButtons,
    onToggleExclude,
  }) => {
    // レンダリング監視
    useEffect(() => {
      performanceMonitor.trackRender.start(`RecordGroup-${datetime}`);
      return () => {
        performanceMonitor.trackRender.end(`RecordGroup-${datetime}`);
      };
    });

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
        <div className="text-2xl font-semibold text-gray-800 dark:text-white mb-8 border-b border-gray-200 dark:border-gray-600 pb-4 flex items-center gap-2">
          <HiCalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {datetime}
        </div>
        <ul className="space-y-4">
          {sortRecordsByFieldOrder(records).map(record => (
            <RecordItem
              key={record.id}
              record={record}
              field={getField(record.fieldId)}
              editId={editId}
              editValue={editValue}
              expandedTexts={expandedTexts}
              showButtons={showButtons}
              onEdit={onEdit}
              onEditSave={onEditSave}
              onEditCancel={onEditCancel}
              onDelete={onDelete}
              onEditValueChange={onEditValueChange}
              onToggleTextExpansion={onToggleTextExpansion}
              onToggleButtons={onToggleButtons}
              onToggleExclude={onToggleExclude}
            />
          ))}
        </ul>
      </div>
    );
  }
);

RecordGroup.displayName = 'RecordGroup';

export default function RecordList() {
  const { t, translateFieldName } = useI18n();
  const {
    records,
    fields,
    loadRecords,
    loadFields,
    updateRecord,
    deleteRecord,
  } = useRecordsStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number | boolean>('');
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());
  const [showButtons, setShowButtons] = useState<Set<string>>(new Set());

  // ページング関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // パフォーマンス監視の初期化
  useEffect(() => {
    performanceMonitor.trackRender.start('RecordList');
    return () => {
      performanceMonitor.trackRender.end('RecordList');
    };
  });

  // データ読み込み（パフォーマンス監視付き）
  useEffect(() => {
    const loadData = async () => {
      try {
        await trackDatabaseOperation('load-fields', async () => {
          await loadFields();
        });

        await trackDatabaseOperation(
          'load-records',
          async () => {
            await loadRecords();
          },
          records.length
        );
      } catch (error) {
        console.error('Data loading error:', error);
      }
    };

    loadData();
  }, [loadFields, loadRecords, records.length]);

  // fieldIdから項目名・型を取得（メモ化、最適化済み）
  const getField = useCallback(
    (fieldId: string): Field | undefined => {
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
    },
    [fields, translateFieldName]
  );

  // 項目の順序を制御する関数（メモ化、最適化済み）
  const sortRecordsByFieldOrder = useCallback(
    (records: RecordItemType[]) => {
      const startTime = performance.now();
      const result = [...records].sort((a, b) => {
        const fieldA = getField(a.fieldId);
        const fieldB = getField(b.fieldId);

        // order属性で並び替え（小さいほど上に表示）
        const orderA = fieldA?.order ?? 999;
        const orderB = fieldB?.order ?? 999;

        return orderA - orderB;
      });

      const duration = performance.now() - startTime;
      if (isDev && duration > 10) {
        console.warn(
          `🐌 Slow sort operation: ${duration.toFixed(2)}ms for ${
            records.length
          } records`
        );
      }

      return result;
    },
    [getField]
  );

  // 日付・時刻で降順ソート（新しい順）（最適化済み）
  const sortedRecords = useMemo(() => {
    const startTime = performance.now();
    const result = [...records].sort((a, b) => {
      const aKey = `${a.date} ${a.time}`;
      const bKey = `${b.date} ${b.time}`;
      return bKey.localeCompare(aKey);
    });

    const duration = performance.now() - startTime;
    if (isDev && duration > 10) {
      console.warn(
        `🐌 Slow record sorting: ${duration.toFixed(2)}ms for ${
          records.length
        } records`
      );
    }

    return result;
  }, [records]);

  // 日付・時刻ごとにグループ化（最適化済み）
  const grouped = useMemo(() => {
    const startTime = performance.now();
    const groupMap: Record<string, RecordItemType[]> = {};
    const result = sortedRecords.reduce((acc, rec) => {
      const key = `${rec.date} ${rec.time}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    }, groupMap);

    const duration = performance.now() - startTime;
    if (isDev && duration > 10) {
      console.warn(
        `🐌 Slow grouping: ${duration.toFixed(2)}ms for ${
          sortedRecords.length
        } records`
      );
    }

    return result;
  }, [sortedRecords]);

  // ページング処理（最適化済み）
  const paginatedGroups = useMemo(() => {
    const startTime = performance.now();
    const groupEntries = Object.entries(grouped);
    const totalGroups = groupEntries.length;
    const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));

    // 現在のページが範囲外の場合は1ページに戻す
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEntries = groupEntries.slice(startIndex, endIndex);

    const result = {
      groups: Object.fromEntries(paginatedEntries),
      totalGroups,
      totalPages,
      currentPage: Math.min(currentPage, totalPages),
    };

    const duration = performance.now() - startTime;
    if (isDev && duration > 5) {
      console.warn(
        `🐌 Slow pagination: ${duration.toFixed(2)}ms for ${totalGroups} groups`
      );
    }

    return result;
  }, [grouped, currentPage, pageSize]);

  // ページ変更（メモ化、パフォーマンス監視付き）
  const goToPage = useCallback(
    (page: number) => {
      const interactionId =
        performanceMonitor.trackInteraction.start('page-change');
      setCurrentPage(Math.max(1, Math.min(page, paginatedGroups.totalPages)));
      performanceMonitor.trackInteraction.end(interactionId, 'page-change');
    },
    [paginatedGroups.totalPages]
  );

  // 編集関連のハンドラー（メモ化、パフォーマンス監視付き）
  const handleEdit = useCallback((rec: RecordItemType) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('edit-start');
    setEditId(rec.id);
    setEditValue(rec.value);
    performanceMonitor.trackInteraction.end(interactionId, 'edit-start');
  }, []);

  const handleEditSave = useCallback(
    async (rec: RecordItemType) => {
      const interactionId =
        performanceMonitor.trackInteraction.start('edit-save');
      try {
        await trackDatabaseOperation(
          'update-record',
          async () => {
            await updateRecord({ ...rec, value: editValue });
          },
          1
        );

        setEditId(null);
        setEditValue('');
        // ボタン表示状態もクリア
        setShowButtons(prev => {
          const newSet = new Set(prev);
          newSet.delete(rec.id);
          return newSet;
        });
      } catch (error) {
        console.error('Edit save error:', error);
      } finally {
        performanceMonitor.trackInteraction.end(interactionId, 'edit-save');
      }
    },
    [editValue, updateRecord]
  );

  const handleEditCancel = useCallback((recordId: string) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('edit-cancel');
    setEditId(null);
    setEditValue('');
    // ボタン表示状態もクリア
    setShowButtons(prev => {
      const newSet = new Set(prev);
      newSet.delete(recordId);
      return newSet;
    });
    performanceMonitor.trackInteraction.end(interactionId, 'edit-cancel');
  }, []);

  const handleDelete = useCallback(
    async (rec: RecordItemType) => {
      const interactionId =
        performanceMonitor.trackInteraction.start('delete-record');
      try {
        if (window.confirm(t('pages.list.confirmDelete'))) {
          await trackDatabaseOperation(
            'delete-record',
            async () => {
              await deleteRecord(rec.id);
            },
            1
          );

          // ボタン表示状態もクリア
          setShowButtons(prev => {
            const newSet = new Set(prev);
            newSet.delete(rec.id);
            return newSet;
          });
        }
      } catch (error) {
        console.error('Delete error:', error);
      } finally {
        performanceMonitor.trackInteraction.end(interactionId, 'delete-record');
      }
    },
    [deleteRecord, t]
  );

  const handleEditValueChange = useCallback(
    (value: string | number | boolean) => {
      setEditValue(value);
    },
    []
  );

  const handleToggleTextExpansion = useCallback((recordId: string) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('toggle-text');
    setExpandedTexts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
    performanceMonitor.trackInteraction.end(interactionId, 'toggle-text');
  }, []);

  const handleToggleButtons = useCallback((recordId: string) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('toggle-buttons');
    setShowButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
    performanceMonitor.trackInteraction.end(interactionId, 'toggle-buttons');
  }, []);

  const handleToggleExclude = useCallback(
    async (rec: RecordItemType) => {
      try {
        await updateRecord({ ...rec, excludeFromGraph: !rec.excludeFromGraph });
      } catch (error) {
        console.error('Exclude toggle error:', error);
      }
    },
    [updateRecord]
  );

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    const interactionId =
      performanceMonitor.trackInteraction.start('page-size-change');
    setPageSize(newPageSize);
    setCurrentPage(1);
    performanceMonitor.trackInteraction.end(interactionId, 'page-size-change');
  }, []);

  // 開発環境でのパフォーマンス情報表示
  useEffect(() => {
    if (!isDev) return;

    const logPerformanceInfo = () => {
      console.group('🔍 RecordList Performance Info');
      console.log(`📊 Total Records: ${records.length}`);
      console.log(`📊 Total Groups: ${paginatedGroups.totalGroups}`);
      console.log(
        `📊 Current Page: ${paginatedGroups.currentPage}/${paginatedGroups.totalPages}`
      );
      console.log(`📊 Page Size: ${pageSize}`);
      console.groupEnd();
    };

    const timeout = setTimeout(logPerformanceInfo, 2000);
    return () => clearTimeout(timeout);
  }, [
    records.length,
    paginatedGroups.totalGroups,
    paginatedGroups.currentPage,
    paginatedGroups.totalPages,
    pageSize,
  ]);

  return (
    <div className="max-w-full sm:max-w-4xl mx-auto px-2 sm:px-0">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-6 sm:mb-8">
        {t('pages.list.title')}
      </h1>

      {/* 表示件数選択 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 sm:p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="text-center sm:text-left">
            <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
              {paginatedGroups.totalGroups}
            </span>
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 ml-1">
              {t('pages.list.recordGroups')}
            </span>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-2">
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {t('pages.list.displayCount')}
            </span>
            <select
              value={pageSize}
              onChange={e => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-400 text-sm sm:text-base min-w-[80px]"
            >
              <option value={10}>{t('pages.list.items10')}</option>
              <option value={20}>{t('pages.list.items20')}</option>
              <option value={50}>{t('pages.list.items50')}</option>
              <option value={100}>{t('pages.list.items100')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ページネーション（上部） */}
      {paginatedGroups.totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-3 sm:p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={HiChevronDoubleLeft}
                onClick={() => goToPage(1)}
                disabled={paginatedGroups.currentPage === 1}
                aria-label="最初のページ"
              >
                <span className="sr-only">最初のページ</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={HiChevronLeft}
                onClick={() => goToPage(paginatedGroups.currentPage - 1)}
                disabled={paginatedGroups.currentPage === 1}
                aria-label="前のページ"
              >
                <span className="sr-only">前のページ</span>
              </Button>
            </div>

            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {paginatedGroups.currentPage} / {paginatedGroups.totalPages}{' '}
              {t('pages.list.page')}
            </span>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={HiChevronRight}
                onClick={() => goToPage(paginatedGroups.currentPage + 1)}
                disabled={
                  paginatedGroups.currentPage === paginatedGroups.totalPages
                }
                aria-label="次のページ"
              >
                <span className="sr-only">次のページ</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={HiChevronDoubleRight}
                onClick={() => goToPage(paginatedGroups.totalPages)}
                disabled={
                  paginatedGroups.currentPage === paginatedGroups.totalPages
                }
                aria-label="最後のページ"
              >
                <span className="sr-only">最後のページ</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 記録一覧 */}
      {Object.entries(paginatedGroups.groups).length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
          <p className="text-base sm:text-lg">{t('pages.list.noRecords')}</p>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(paginatedGroups.groups).map(([datetime, recs]) => (
          <RecordGroup
            key={datetime}
            datetime={datetime}
            records={recs}
            getField={getField}
            sortRecordsByFieldOrder={sortRecordsByFieldOrder}
            editId={editId}
            editValue={editValue}
            expandedTexts={expandedTexts}
            showButtons={showButtons}
            onEdit={handleEdit}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
            onDelete={handleDelete}
            onEditValueChange={handleEditValueChange}
            onToggleTextExpansion={handleToggleTextExpansion}
            onToggleButtons={handleToggleButtons}
            onToggleExclude={handleToggleExclude}
          />
        ))}
      </div>

      {/* ページネーション（下部） */}
      {paginatedGroups.totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-3 sm:p-4 mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={HiChevronDoubleLeft}
                onClick={() => goToPage(1)}
                disabled={paginatedGroups.currentPage === 1}
                aria-label="最初のページ"
              >
                <span className="sr-only">最初のページ</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={HiChevronLeft}
                onClick={() => goToPage(paginatedGroups.currentPage - 1)}
                disabled={paginatedGroups.currentPage === 1}
                aria-label="前のページ"
              >
                <span className="sr-only">前のページ</span>
              </Button>
            </div>

            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {paginatedGroups.currentPage} / {paginatedGroups.totalPages}{' '}
              {t('pages.list.page')}
            </span>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={HiChevronRight}
                onClick={() => goToPage(paginatedGroups.currentPage + 1)}
                disabled={
                  paginatedGroups.currentPage === paginatedGroups.totalPages
                }
                aria-label="次のページ"
              >
                <span className="sr-only">次のページ</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={HiChevronDoubleRight}
                onClick={() => goToPage(paginatedGroups.totalPages)}
                disabled={
                  paginatedGroups.currentPage === paginatedGroups.totalPages
                }
                aria-label="最後のページ"
              >
                <span className="sr-only">最後のページ</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
