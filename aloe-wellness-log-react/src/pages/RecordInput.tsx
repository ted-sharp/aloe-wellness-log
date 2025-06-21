import React, { useEffect, useState, useRef } from 'react';
import { useRecordsStore } from '../store/records';
import type { Field } from '../types/record';
import * as db from '../db/indexedDb';
import {
  HiArrowLeft,
  HiCalendarDays,
  HiClock,
  HiDocumentText,
  HiCheckCircle,
  HiXMark,
  HiPencil,
  HiClipboardDocumentList,
  HiPlus,
  HiTrash,
  HiEyeSlash,
  HiBars3,
  HiArrowsUpDown
} from 'react-icons/hi2';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

  const FIELD_TYPES = [
    { value: 'number', label: '数値' },
    { value: 'string', label: '文字列' },
    { value: 'boolean', label: '成否' },
  ] as const;

// ソート可能なアイテムコンポーネント
function SortableItem({ field, onToggleDisplay }: { field: Field; onToggleDisplay: (fieldId: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.fieldId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 表示状態をトグルする関数
  const handleToggleDisplay = (e: React.MouseEvent) => {
    e.stopPropagation(); // ドラッグイベントとの競合を防ぐ
    e.preventDefault(); // デフォルトの動作も防ぐ
    onToggleDisplay(field.fieldId);
  };

    return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 hover:border-purple-300"
      {...attributes}
    >
      <div className="grid gap-3 items-center" style={{ gridTemplateColumns: 'auto 1fr 1fr auto' }}>
        {/* 左端：表示/非表示状態（クリック可能） */}
        <div className="text-center border-r border-gray-200 pr-3">
          {field.defaultDisplay ? (
            <div
              onClick={handleToggleDisplay}
              className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-green-200 transition-colors duration-150"
              title="クリックで非表示にする"
            >
              表示中
            </div>
          ) : (
            <div
              onClick={handleToggleDisplay}
              className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-gray-200 transition-colors duration-150"
              title="クリックで表示にする"
            >
              非表示
            </div>
          )}
        </div>

                {/* 項目名 */}
        <div className="text-lg font-medium text-gray-700 border-r border-gray-200 pr-3 text-right">
          {field.name}
        </div>

        {/* 単位 */}
        <div className="text-gray-600 border-r border-gray-200 pr-3 text-left">
          {field.unit ? `(${field.unit})` : '―'}
        </div>

        {/* 右端：上下アイコン（ドラッグハンドル） */}
        <div className="flex justify-center cursor-move" {...listeners}>
          <HiArrowsUpDown className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors duration-150" />
        </div>
      </div>
    </div>
  );
}

type NewField = {
  name: string;
  type: 'number' | 'string' | 'boolean';
  unit?: string;
};

export default function RecordInput() {
  const { fields, loadFields, addRecord, addField, loadRecords, updateField, records, deleteField } = useRecordsStore();
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [showSelectField, setShowSelectField] = useState(false);
  const [showAddField, setShowAddField] = useState(false);

  const [newField, setNewField] = useState<NewField>({ name: '', type: 'number', unit: '' });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editField, setEditField] = useState<Partial<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingExistingFieldId, setEditingExistingFieldId] = useState<string | null>(null);
  const [editingExistingField, setEditingExistingField] = useState<Partial<Field>>({});

  // 一時的に表示する項目のIDを管理
  const [temporaryDisplayFields, setTemporaryDisplayFields] = useState<Set<string>>(new Set());

  // ボタン表示状態を管理（一覧画面と同様）
  const [showButtons, setShowButtons] = useState<Set<string>>(new Set());

  // 項目選択画面でのボタン表示状態を管理
  const [showSelectButtons, setShowSelectButtons] = useState<Set<string>>(new Set());

  // 並び替えモーダルの状態管理
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortableFields, setSortableFields] = useState<Field[]>([]);
  const sortableFieldsRef = useRef<Field[]>([]);

  // 日時管理用のstate（デフォルトは現在時刻）
  const [recordDate, setRecordDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [recordTime, setRecordTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM
  });

  // 備考管理用のstate
  const [recordNotes, setRecordNotes] = useState<string>('');

  useEffect(() => {
    loadFields();
    loadRecords();
  }, [loadFields, loadRecords]);

  const handleChange = (fieldId: string, value: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // 項目が入力されているかどうかを判定する関数
  const hasValue = (field: Field, value: string | number | boolean | undefined): boolean => {
    if (field.type === 'number') {
      return value !== undefined && value !== '' && !isNaN(Number(value));
    } else if (field.type === 'string') {
      return value !== undefined && value !== '' && String(value).trim() !== '';
    } else if (field.type === 'boolean') {
      return value === true; // チェックされている場合のみ
    }
    return false;
  };

  const validate = () => {
    // 入力された項目のみバリデーション
    for (const field of fields) {
      const val = values[field.fieldId];
      if (hasValue(field, val)) {
        if (field.type === 'number' && isNaN(Number(val))) {
          return `${field.name}は正しい数値で入力してください`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    try {
      // 選択された日時を使用
      const selectedDateTime = new Date(`${recordDate}T${recordTime}:00`);
      // より一意性を保つために現在のタイムスタンプを追加
      const uniqueTimestamp = Date.now();

      // 入力された項目のみ保存
      for (const field of fields) {
        const value = values[field.fieldId];

        // 入力されている項目のみ記録
        if (hasValue(field, value)) {
          await addRecord({
            id: `${selectedDateTime.toISOString()}-${field.fieldId}-${uniqueTimestamp}`,
            date: recordDate,
            time: recordTime,
            datetime: selectedDateTime.toISOString(),
            fieldId: field.fieldId,
            value: value,
          });
        }
      }

      // 備考が入力されている場合、備考も保存
      if (recordNotes.trim()) {
        await addRecord({
          id: `${selectedDateTime.toISOString()}-notes-${uniqueTimestamp}`,
          date: recordDate,
          time: recordTime,
          datetime: selectedDateTime.toISOString(),
          fieldId: 'notes',
          value: recordNotes.trim(),
        });
      }

      setToast('記録を保存いたしましたわ');
      setTimeout(() => setToast(null), 2000);

      // 全ての入力値をクリア（記録後は毎回空の状態にする）
      setValues({});

      // 一時表示項目をクリア（defaultDisplay: false の項目を非表示に戻す）
      setTemporaryDisplayFields(new Set());

      // 備考もクリア
      setRecordNotes('');
    } catch (error) {
      console.error('保存エラー:', error);
      setFormError('保存に失敗いたしましたわ。もう一度お試しくださいませ。');
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFieldError(null);
    if (!newField.name.trim()) {
      setAddFieldError('項目名を入力してください');
      return;
    }
    if (fields.some(f => f.name === newField.name.trim())) {
      setAddFieldError('同じ名前の項目が既に存在します');
      return;
    }
    const fieldId = newField.name.trim().replace(/\s+/g, '_').toLowerCase();
    await addField({
      fieldId,
      name: newField.name.trim(),
      type: newField.type,
      unit: newField.unit?.trim() || undefined,
      order: getNextDefaultOrder(), // 自動的に次の順序を設定
      defaultDisplay: false, // 既存項目追加では非表示がデフォルト
    });

    // 非表示項目として追加するので、一時的に表示リストに追加
    setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));

    setNewField({ name: '', type: 'number', unit: '' });
    setShowAddField(false);
    setShowSelectField(false);
    await loadFields();
    setToast('項目を追加しましたわ');
    setTimeout(() => setToast(null), 2000);
  };



  const handleEditField = (field: Field) => {
    setEditFieldId(field.fieldId);
    setEditField({
      name: field.name,
      unit: field.unit
    });
  };

  const handleEditFieldSave = async () => {
    if (!editFieldId || !editField.name?.trim()) {
      setEditFieldId(null);
      setEditField({});
      // ボタン表示状態もクリア
      setShowButtons(new Set());
      return;
    }
    const original = fields.find(f => f.fieldId === editFieldId);
    if (original) {
      await updateField({
        ...original,
        name: editField.name.trim(),
        unit: editField.unit?.trim() || undefined,
      });
      await loadFields();
      setToast('項目を編集しましたわ');
      setTimeout(() => setToast(null), 2000);
    }
    setEditFieldId(null);
    setEditField({});
    // ボタン表示状態もクリア
    setShowButtons(new Set());
  };

  // 前回値を取得する関数
  const getLastValue = (fieldId: string): string | number | boolean => {
    const rec = [...records].reverse().find(r => r.fieldId === fieldId);
    return rec ? rec.value : '';
  };

  // 次のデフォルト順序を計算する関数
  const getNextDefaultOrder = (): number => {
    if (fields.length === 0) return 1;
    const maxOrder = Math.max(...fields.map(f => f.order || 0));
    return maxOrder + 1;
  };

  // 非表示項目を一時的に表示に追加する関数
  const handleShowExistingField = (fieldId: string) => {
    const field = fields.find(f => f.fieldId === fieldId);
    if (field) {
      // 一時表示リストに追加（defaultDisplayは変更しない）
      setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));
      setShowSelectField(false);
      setShowSelectButtons(new Set()); // ボタン表示状態をクリア
      setToast('項目を一時表示に追加しましたわ');
      setTimeout(() => setToast(null), 2000);
    }
  };

  // 非表示項目を永続的に表示状態に変更する関数
  const handleShowExistingFieldPermanently = async (fieldId: string) => {
    const field = fields.find(f => f.fieldId === fieldId);
    if (field) {
      try {
        // defaultDisplay を true に変更
        await updateField({
          ...field,
          defaultDisplay: true,
        });

        // 一時表示リストから削除（もし含まれていれば）
        setTemporaryDisplayFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(fieldId);
          return newSet;
        });

        setShowSelectButtons(new Set()); // ボタン表示状態をクリア
        await loadFields(); // フィールド一覧を再読み込み
        setToast('項目を表示状態に変更しましたわ');
        setTimeout(() => setToast(null), 2000);
      } catch (error) {
        console.error('表示状態変更エラー:', error);
        setToast('表示状態の変更に失敗しました');
        setTimeout(() => setToast(null), 2000);
      }
    }
  };

  // 非表示項目のリストを取得（order順でソート）
  const getHiddenFields = () => {
    return fields
      .filter(field => field.defaultDisplay === false)
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  };

  // 既存項目の編集機能
  const handleEditExistingField = (field: Field) => {
    setEditingExistingFieldId(field.fieldId);
    setEditingExistingField({
      name: field.name,
      unit: field.unit
    });
    setShowSelectButtons(new Set()); // ボタン表示状態をクリア
  };

  const handleEditExistingFieldSave = async () => {
    if (!editingExistingFieldId || !editingExistingField.name?.trim()) {
      setEditingExistingFieldId(null);
      setEditingExistingField({});
      setShowSelectButtons(new Set()); // ボタン表示状態をクリア
      return;
    }
    const original = fields.find(f => f.fieldId === editingExistingFieldId);
    if (original) {
      await updateField({
        ...original,
        name: editingExistingField.name.trim(),
        unit: editingExistingField.unit?.trim() || undefined,
        // orderは元の値を保持（並び替えはドラッグ&ドロップで行う）
        order: original.order,
        // defaultDisplayも元の値を保持（表示管理は並び替えモーダルで行う）
        defaultDisplay: original.defaultDisplay,
      });
      await loadFields();
      setToast('項目を編集しましたわ');
      setTimeout(() => setToast(null), 2000);
    }
    setEditingExistingFieldId(null);
    setEditingExistingField({});
    setShowSelectButtons(new Set()); // ボタン表示状態をクリア
  };

  // 既存項目の削除機能
  const handleDeleteExistingField = async (field: Field) => {
    const isConfirmed = window.confirm(
      `項目「${field.name}」を削除してもよろしいですか？\n\nこの項目に関連するすべての記録データも削除されます。`
    );

    if (isConfirmed) {
      try {
        await deleteField(field.fieldId);
        await loadFields();
        setShowSelectButtons(new Set()); // ボタン表示状態をクリア
        setToast('項目を削除しましたわ');
        setTimeout(() => setToast(null), 2000);
      } catch (error) {
        console.error('削除エラー:', error);
        setToast('項目の削除に失敗しました');
        setTimeout(() => setToast(null), 2000);
      }
    }
  };

  // ボタン表示/非表示の切り替え（一覧画面と同様）
  const toggleButtons = (fieldId: string) => {
    setShowButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  };

  const areButtonsShown = (fieldId: string) => {
    return showButtons.has(fieldId);
  };

  // 項目選択画面でのボタン表示/非表示の切り替え
  const toggleSelectButtons = (fieldId: string) => {
    setShowSelectButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  };

  const areSelectButtonsShown = (fieldId: string) => {
    return showSelectButtons.has(fieldId);
  };

  // ドラッグ&ドロップセンサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

    // 並び替えモーダルを開く
  const handleOpenSortModal = () => {
    console.log('🔧 並び替えモーダルを開く');
    console.log('📋 現在のフィールド:', fields.map(f => ({ name: f.name, order: f.order })));

    // 全フィールドを表示順序でソートして設定
    const sortedFields = [...fields].sort((a, b) => (a.order || 999) - (b.order || 999));
    console.log('📊 ソート後のフィールド:', sortedFields.map(f => ({ name: f.name, order: f.order })));

    setSortableFields(sortedFields);
    sortableFieldsRef.current = sortedFields; // refも同期
    setShowSortModal(true);
  };

      // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      console.log('🎯 ドラッグ終了:', { activeId: active.id, overId: over.id });

      const oldIndex = sortableFields.findIndex((item) => item.fieldId === active.id);
      const newIndex = sortableFields.findIndex((item) => item.fieldId === over.id);

      console.log('📍 移動詳細:', {
        activeItem: sortableFields[oldIndex]?.name,
        oldIndex,
        newIndex,
        oldOrder: sortableFields[oldIndex]?.order,
      });

            const newItems = arrayMove(sortableFields, oldIndex, newIndex);
      console.log('🔄 新しい順序:', newItems.map((item, index) => ({
        name: item.name,
        originalOrder: item.order,
        newPosition: index + 1
      })));

      setSortableFields(newItems);
      sortableFieldsRef.current = newItems; // refも同期更新
    }
  };

          // 並び替えを保存
  const handleSaveSortOrder = async () => {
    try {
      console.log('🔄 並び替え保存開始');
      const currentFields = sortableFieldsRef.current; // 最新の状態を使用
      console.log('📋 保存対象フィールド:', currentFields.map((f, i) => ({ name: f.name, oldOrder: f.order, newOrder: i + 1 })));

      // すべての更新を並列実行してから完了を待つ
      const updatePromises = currentFields.map((field, index) => {
        const updatedField = {
          ...field,
          order: index + 1,
        };
        console.log(`💾 更新: ${field.name} (${field.order} → ${index + 1})`);
        return updateField(updatedField);
      });

      // すべての更新完了を待つ
      await Promise.all(updatePromises);
      console.log('✅ 全更新完了');

                  // 少し待ってからフィールド一覧を再読み込み
      await new Promise(resolve => setTimeout(resolve, 50));
      await loadFields();
      console.log('📝 フィールド再読み込み完了');

      // IndexedDBから直接取得して確認
      const freshFields = await db.getAllFields();
      console.log('🔍 IndexedDBから直接取得したフィールド状態:', freshFields.map(f => ({ name: f.name, order: f.order })));

      // Reactステートの状態も確認（参考用）
      setTimeout(() => {
        console.log('🔍 Reactステートのフィールド状態:', fields.map(f => ({ name: f.name, order: f.order })));
      }, 100);

      setShowSortModal(false);
      setToast('並び順を保存しましたわ');
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('❌ 並び順保存エラー:', error);
      setToast('並び順の保存に失敗しました');
      setTimeout(() => setToast(null), 2000);
    }
  };

  // 項目を非表示にする関数
  const handleHideField = async (field: Field) => {
    // defaultDisplay: false に設定
    await updateField({
      ...field,
      defaultDisplay: false,
    });

    // 一時表示リストからも削除
    setTemporaryDisplayFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(field.fieldId);
      return newSet;
    });

    // ボタン表示状態もクリア
    setShowButtons(new Set());

    // フィールド一覧を再読み込み
    await loadFields();

    setToast('項目を非表示にしましたわ');
    setTimeout(() => setToast(null), 2000);
  };

    // 並び替えモーダル内で表示状態をトグルする関数
  const handleToggleDisplayInModal = async (fieldId: string) => {
    console.log('🔄 モーダル内で表示状態をトグル:', fieldId);

    // 現在のフィールドを取得
    const currentField = sortableFields.find(f => f.fieldId === fieldId);
    if (!currentField) return;

    // defaultDisplayを反転
    const updatedField = {
      ...currentField,
      defaultDisplay: !currentField.defaultDisplay,
    };

    console.log(`💾 ${currentField.name}: ${currentField.defaultDisplay} → ${updatedField.defaultDisplay}`);

    try {
      // IndexedDBに保存
      await updateField(updatedField);

      // sortableFields状態を更新
      const updatedSortableFields = sortableFields.map(f =>
        f.fieldId === fieldId ? updatedField : f
      );
      setSortableFields(updatedSortableFields);
      sortableFieldsRef.current = updatedSortableFields;

      // メイン画面のfields状態も直接更新（loadFields()を呼ばずにちらつきを防ぐ）
      const updatedMainFields = fields.map(f =>
        f.fieldId === fieldId ? updatedField : f
      );
      // Zustandの状態を直接更新
      useRecordsStore.setState({ fields: updatedMainFields });

      // 一時表示フィールドの管理
      if (updatedField.defaultDisplay) {
        // 表示に変更された場合、一時表示リストから削除
        setTemporaryDisplayFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(fieldId);
          return newSet;
        });
      } else {
        // 非表示に変更された場合で、現在表示されている場合は一時表示リストに追加
        const isCurrentlyShown = fields.some(f =>
          f.fieldId === fieldId && (f.defaultDisplay || temporaryDisplayFields.has(fieldId))
        );
        if (isCurrentlyShown) {
          setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));
        }
      }

      // トーストメッセージは控えめに（必要に応じてコメントアウト可能）
      // const statusText = updatedField.defaultDisplay ? '表示' : '非表示';
      // setToast(`${currentField.name}を${statusText}に変更しましたわ`);
      // setTimeout(() => setToast(null), 1500);

    } catch (error) {
      console.error('❌ 表示状態の更新エラー:', error);
      setToast('表示状態の変更に失敗しました');
      setTimeout(() => setToast(null), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-12">入力</h1>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 mb-12">
        {/* 日時選択セクション */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <HiCalendarDays className="w-6 h-6 text-blue-600" />
              記録日時
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-base font-medium text-gray-700 mb-2">日付</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div className="flex-1">
                <label className="block text-base font-medium text-gray-700 mb-2">時刻</label>
                <input
                  type="time"
                  value={recordTime}
                  onChange={(e) => setRecordTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setRecordDate(now.toISOString().slice(0, 10));
                    setRecordTime(now.toTimeString().slice(0, 5));
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2"
                >
                  <HiClock className="w-5 h-5" />
                  現在時刻
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 備考入力セクション */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <HiDocumentText className="w-6 h-6 text-blue-600" />
              備考・メモ
            </h2>
            <div>
              <textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                placeholder="その時の体調、気づき、特記事項など（任意）"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-600 mt-2">
                {recordNotes.length}/500文字
              </div>
            </div>
          </div>
        </div>

        {[...fields]
          .filter(field => field.defaultDisplay !== false || temporaryDisplayFields.has(field.fieldId))
          .sort((a, b) => (a.order || 999) - (b.order || 999))
          .map((field) => (
          <div key={field.fieldId} className="bg-white p-6 rounded-2xl shadow-md">
            {editFieldId === field.fieldId ? (
                            <div>
                {/* 項目名入力（左）と単位入力（右）のレイアウト */}
                <div className="grid grid-cols-2 gap-2 items-stretch mb-4">
                  <div className="text-right pr-2 border-r border-gray-200">
                    <input
                      type="text"
                      value={editField.name ?? ''}
                      onChange={e => setEditField(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      placeholder="項目名"
                    />
                  </div>
                  <div className="pl-2">
                    {field.type === 'boolean' ? (
                      // boolean型の項目は右側を空白地帯に
                      <div className="h-full"></div>
                    ) : (
                      // boolean型以外は単位入力
                      <input
                        type="text"
                        value={editField.unit ?? ''}
                        onChange={e => setEditField(f => ({ ...f, unit: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        placeholder="単位（例: kg）"
                      />
                    )}
                  </div>
                </div>



                {/* 保存・キャンセルボタン（中央寄せ） */}
                <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                  <button type="button" onClick={handleEditFieldSave} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium flex items-center gap-2">
                    <HiCheckCircle className="w-4 h-4" />
                    保存
                  </button>
                  <button type="button" onClick={() => {
                    setEditFieldId(null);
                    setEditField({});
                    // ボタン表示状態もクリア
                    setShowButtons(new Set());
                  }} className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2">
                    <HiXMark className="w-4 h-4" />
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* 一覧画面と同じレイアウト：項目名左、入力欄右 */}
                <div className="grid grid-cols-2 gap-2 items-stretch cursor-pointer" onClick={() => toggleButtons(field.fieldId)}>
                  <div className="text-xl font-medium text-gray-700 text-right pr-2 border-r border-gray-200">
                    {field.name}
                  </div>
                  <div className="text-lg text-gray-800 font-semibold pl-2 text-left">
                    <div className="flex items-center gap-3">
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'boolean' ? 'checkbox' : 'text'}
                        value={field.type === 'boolean' ? undefined : String(values[field.fieldId] ?? '')}
                        checked={field.type === 'boolean' ? !!values[field.fieldId] : undefined}
                        onChange={(e) => {
                          e.stopPropagation(); // 親のクリックイベントを防ぐ
                          handleChange(
                            field.fieldId,
                            field.type === 'boolean' ? e.currentTarget.checked : e.currentTarget.value
                          );
                        }}
                        onClick={(e) => e.stopPropagation()} // 親のクリックイベントを防ぐ
                        className={field.type === 'boolean'
                          ? "w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 block"
                          : "border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"}
                      />
                      {field.unit && <span className="text-gray-600 font-medium">{field.unit}</span>}
                    </div>
                  </div>
                </div>

                {/* 前回値・編集・非表示ボタン（クリックで表示/非表示） */}
                {areButtonsShown(field.fieldId) && (
                  <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      className="bg-sky-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-600 transition-colors duration-200 font-medium flex items-center gap-2"
                      onClick={() => setValues(v => ({ ...v, [field.fieldId]: getLastValue(field.fieldId) }))}
                    >
                      <HiClipboardDocumentList className="w-4 h-4" />
                      前回値
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditField(field)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2"
                    >
                      <HiPencil className="w-4 h-4" />
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHideField(field)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-2"
                    >
                      <HiEyeSlash className="w-4 h-4" />
                      非表示
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {formError && <div className="text-red-600 font-semibold bg-red-50 p-4 rounded-lg border border-red-200">{formError}</div>}

        <button type="submit" className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-xl shadow-md hover:bg-green-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3">
          <HiDocumentText className="w-6 h-6" />
          記録する
        </button>
      </form>

      <div className="mb-8">
        {showSelectField ? (
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <HiClipboardDocumentList className="w-6 h-6 text-blue-600" />
              項目を選択・表示
            </h3>
            <div className="space-y-4">
              {getHiddenFields().length > 0 && (
                <>
                  <h4 className="text-xl font-medium text-gray-700 text-left">既存の項目から選択:</h4>
                  <div className="space-y-3">
                    {getHiddenFields().map((field) => (
                      <div key={field.fieldId} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        {editingExistingFieldId === field.fieldId ? (
                          <div className="space-y-4">
                            {/* 編集モード：左右分割レイアウト */}
                            <div className="grid grid-cols-2 gap-2 items-stretch">
                              <div className="text-right pr-2 border-r border-gray-200">
                                <input
                                  type="text"
                                  value={editingExistingField.name ?? ''}
                                  onChange={e => setEditingExistingField(f => ({ ...f, name: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                  placeholder="項目名"
                                />
                              </div>
                              <div className="pl-2">
                                <input
                                  type="text"
                                  value={editingExistingField.unit ?? ''}
                                  onChange={e => setEditingExistingField(f => ({ ...f, unit: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                                  placeholder="単位（例: kg）"
                                />
                              </div>
                            </div>
                            {/* デフォルト表示設定 */}

                            <div className="flex gap-2 justify-center pt-2 border-t border-gray-200">
                              <button type="button" onClick={handleEditExistingFieldSave} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium flex items-center gap-2">
                                <HiCheckCircle className="w-4 h-4" />
                                保存
                              </button>
                              <button type="button" onClick={() => {
                                setEditingExistingFieldId(null);
                                setShowSelectButtons(new Set());
                              }} className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2">
                                <HiXMark className="w-4 h-4" />
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* 通常表示：左右分割レイアウト */}
                            <div className="grid grid-cols-2 gap-2 items-stretch cursor-pointer" onClick={() => toggleSelectButtons(field.fieldId)}>
                              <div className="text-xl font-medium text-gray-700 text-right pr-2 border-r border-gray-200">
                                {field.name}
                              </div>
                              <div className="text-lg text-gray-800 font-semibold pl-2 text-left">
                                {field.unit ? `(${field.unit})` : ''}
                              </div>
                            </div>

                            {/* 表示・追加・編集・削除ボタン（クリックで表示/非表示） */}
                            {areSelectButtonsShown(field.fieldId) && (
                              <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => handleShowExistingFieldPermanently(field.fieldId)}
                                  className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-600 transition-colors duration-200 font-medium flex items-center gap-2"
                                >
                                  <HiCheckCircle className="w-4 h-4" />
                                  表示
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShowExistingField(field.fieldId)}
                                  className="bg-teal-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-500 transition-colors duration-200 font-medium flex items-center gap-2"
                                >
                                  <HiPlus className="w-4 h-4" />
                                  追加
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditExistingField(field)}
                                  className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2"
                                >
                                  <HiPencil className="w-4 h-4" />
                                  編集
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExistingField(field)}
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200 font-medium flex items-center gap-2"
                                >
                                  <HiTrash className="w-4 h-4" />
                                  削除
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {showAddField && (
                <form onSubmit={handleAddField} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-xl font-medium text-gray-700 mb-4 text-left flex items-center gap-2">
                    <HiPlus className="w-6 h-6 text-green-600" />
                    新しい項目を追加
                  </h4>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">項目名 *</label>
                        <input
                          type="text"
                          value={newField.name}
                          onChange={e => setNewField(f => ({ ...f, name: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          placeholder="例: 体重"
                          required
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">データ型 *</label>
                        <select
                          value={newField.type}
                          onChange={e => setNewField(f => ({ ...f, type: e.target.value as 'number' | 'string' | 'boolean' }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        >
                          {FIELD_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">単位（任意）</label>
                        <input
                          type="text"
                          value={newField.unit}
                          onChange={e => setNewField(f => ({ ...f, unit: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          placeholder="例: kg"
                        />
                      </div>
                    </div>

                    {addFieldError && <div className="text-red-600 font-semibold bg-red-50 p-3 rounded-lg border border-red-200">{addFieldError}</div>}
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition-colors duration-200 font-medium flex items-center gap-2">
                        <HiPlus className="w-4 h-4" />
                        追加
                      </button>
                      <button type="button" onClick={() => setShowAddField(false)} className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2">
                        <HiXMark className="w-4 h-4" />
                        キャンセル
                      </button>
                    </div>
                  </div>
                </form>
              )}
              <div className="flex gap-3 pt-4">
                {!showAddField && (
                  <button
                    type="button"
                    onClick={() => setShowAddField(true)}
                    className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition-colors duration-200 font-medium flex items-center gap-2"
                  >
                    <HiPlus className="w-4 h-4" />
                    新しい項目を追加
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSelectField(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-600 transition-colors duration-200 font-medium flex items-center gap-2"
                >
                  <HiArrowLeft className="w-5 h-5" />
                  戻る
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowSelectField(true)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center gap-2"
            >
              <HiClipboardDocumentList className="w-5 h-5" />
              項目を選択・表示
            </button>
            <button
              type="button"
              onClick={handleOpenSortModal}
              className="bg-purple-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-purple-600 transition-colors duration-200 font-medium flex items-center gap-2"
            >
              <HiBars3 className="w-5 h-5" />
              並び替え
            </button>
          </div>
        )}
      </div>

      {/* 並び替えモーダル */}
      <Transition appear show={showSortModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowSortModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-auto min-w-[500px] max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-2xl font-bold leading-6 text-gray-900 mb-6 flex items-center gap-2"
                  >
                    <HiBars3 className="w-6 h-6 text-purple-600" />
                    項目の並び替え
                  </Dialog.Title>

                  <div className="mb-4">
                    <p className="text-gray-600 text-sm">
                      ドラッグ&ドロップで項目の表示順序を変更できます。右端のハンドルをドラッグしてください。
                    </p>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortableFields.map(field => field.fieldId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {sortableFields.map((field) => (
                          <SortableItem key={field.fieldId} field={field} onToggleDisplay={handleToggleDisplayInModal} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      className="bg-gray-400 text-white px-6 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2"
                      onClick={() => setShowSortModal(false)}
                    >
                      <HiXMark className="w-4 h-4" />
                      キャンセル
                    </button>
                    <button
                      type="button"
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200 font-medium flex items-center gap-2"
                      onClick={() => {
                        console.log('🟦 保存ボタンがクリックされました');
                        handleSaveSortOrder();
                      }}
                    >
                      <HiCheckCircle className="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
