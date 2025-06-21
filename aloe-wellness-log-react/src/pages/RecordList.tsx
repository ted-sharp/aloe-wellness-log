import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiCalendarDays,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi2';
import RecordItem from '../components/RecordItem';
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
  }) => {
    // レンダリング監視
    useEffect(() => {
      performanceMonitor.trackRender.start(`RecordGroup-${datetime}`);
      return () => {
        performanceMonitor.trackRender.end(`RecordGroup-${datetime}`);
      };
    });

    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="text-2xl font-semibold text-gray-800 mb-8 border-b border-gray-200 pb-4 flex items-center gap-2">
          <HiCalendarDays className="w-6 h-6 text-blue-600" />
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
            />
          ))}
        </ul>
      </div>
    );
  }
);

RecordGroup.displayName = 'RecordGroup';

export default function RecordList() {
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
  const [pageSize, setPageSize] = useState(20);

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
          name: '備考',
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
    [fields]
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
        if (window.confirm('本当に削除してよろしいですか？')) {
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
    [deleteRecord]
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">一覧</h1>

      {/* 表示件数選択 */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-gray-800">
            {paginatedGroups.totalGroups}件の記録グループ
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">表示件数:</span>
            <select
              value={pageSize}
              onChange={e => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value={10}>10件</option>
              <option value={20}>20件</option>
              <option value={50}>50件</option>
              <option value={100}>100件</option>
            </select>
          </div>
        </div>
      </div>

      {/* ページネーション（上部） */}
      {paginatedGroups.totalPages > 1 && (
        <div className="bg-white rounded-2xl shadow-md p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={paginatedGroups.currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronDoubleLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(paginatedGroups.currentPage - 1)}
                disabled={paginatedGroups.currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <span className="text-gray-600">
              {paginatedGroups.currentPage} / {paginatedGroups.totalPages}{' '}
              ページ
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(paginatedGroups.currentPage + 1)}
                disabled={
                  paginatedGroups.currentPage === paginatedGroups.totalPages
                }
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(paginatedGroups.totalPages)}
                disabled={
                  paginatedGroups.currentPage === paginatedGroups.totalPages
                }
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronDoubleRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 記録一覧 */}
      {Object.entries(paginatedGroups.groups).length === 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6 text-center text-gray-500">
          <p className="text-lg">記録がありませんわ。</p>
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
          />
        ))}
      </div>

      {/* ページネーション（下部） */}
      {paginatedGroups.totalPages > 1 && (
        <div className="bg-white rounded-2xl shadow-md p-4 mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={paginatedGroups.currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronDoubleLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(paginatedGroups.currentPage - 1)}
                disabled={paginatedGroups.currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <span className="text-gray-600">
              {paginatedGroups.currentPage} / {paginatedGroups.totalPages}{' '}
              ページ
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(paginatedGroups.currentPage + 1)}
                disabled={
                  paginatedGroups.currentPage === paginatedGroups.totalPages
                }
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(paginatedGroups.totalPages)}
                disabled={
                  paginatedGroups.currentPage === paginatedGroups.totalPages
                }
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronDoubleRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
