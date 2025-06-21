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

// メモ化されたレコードグループコンポーネント
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
  }) => (
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
  )
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

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  // fieldIdから項目名・型を取得（メモ化）
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

  // 項目の順序を制御する関数（メモ化）
  const sortRecordsByFieldOrder = useCallback(
    (records: RecordItemType[]) => {
      return [...records].sort((a, b) => {
        const fieldA = getField(a.fieldId);
        const fieldB = getField(b.fieldId);

        // order属性で並び替え（小さいほど上に表示）
        const orderA = fieldA?.order ?? 999;
        const orderB = fieldB?.order ?? 999;

        return orderA - orderB;
      });
    },
    [getField]
  );

  // 日付・時刻で降順ソート（新しい順）
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const aKey = `${a.date} ${a.time}`;
      const bKey = `${b.date} ${b.time}`;
      return bKey.localeCompare(aKey);
    });
  }, [records]);

  // 日付・時刻ごとにグループ化
  const grouped = useMemo(() => {
    const groupMap: Record<string, RecordItemType[]> = {};
    return sortedRecords.reduce((acc, rec) => {
      const key = `${rec.date} ${rec.time}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    }, groupMap);
  }, [sortedRecords]);

  // ページング処理
  const paginatedGroups = useMemo(() => {
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

    return {
      groups: Object.fromEntries(paginatedEntries),
      totalGroups,
      totalPages,
      currentPage: Math.min(currentPage, totalPages),
    };
  }, [grouped, currentPage, pageSize]);

  // ページ変更（メモ化）
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, paginatedGroups.totalPages)));
    },
    [paginatedGroups.totalPages]
  );

  // 編集関連のハンドラー（メモ化）
  const handleEdit = useCallback((rec: RecordItemType) => {
    setEditId(rec.id);
    setEditValue(rec.value);
  }, []);

  const handleEditSave = useCallback(
    async (rec: RecordItemType) => {
      await updateRecord({ ...rec, value: editValue });
      setEditId(null);
      setEditValue('');
      // ボタン表示状態もクリア
      setShowButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(rec.id);
        return newSet;
      });
    },
    [editValue, updateRecord]
  );

  const handleEditCancel = useCallback((recordId: string) => {
    setEditId(null);
    setEditValue('');
    // ボタン表示状態もクリア
    setShowButtons(prev => {
      const newSet = new Set(prev);
      newSet.delete(recordId);
      return newSet;
    });
  }, []);

  const handleDelete = useCallback(
    async (rec: RecordItemType) => {
      if (window.confirm('本当に削除してよろしいですか？')) {
        await deleteRecord(rec.id);
        // ボタン表示状態もクリア
        setShowButtons(prev => {
          const newSet = new Set(prev);
          newSet.delete(rec.id);
          return newSet;
        });
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
    setExpandedTexts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  const handleToggleButtons = useCallback((recordId: string) => {
    setShowButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

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
