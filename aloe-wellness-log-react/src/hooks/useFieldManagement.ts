import { useState, useCallback, useRef } from 'react';
import { useRecordsStore } from '../store/records';
import { useToastStore } from '../store/toast';
import { useErrorHandler } from './useErrorHandler';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Field } from '../types/record';

type NewField = {
  name: string;
  type: 'number' | 'string' | 'boolean';
  unit?: string;
};

export function useFieldManagement() {
  const { fields, loadFields, addField, updateField, deleteField } = useRecordsStore();
  const { showSuccess } = useToastStore();
  const { handleAsyncError } = useErrorHandler();

  // 状態管理
  const [showSelectField, setShowSelectField] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<NewField>({ name: '', type: 'number', unit: '' });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editField, setEditField] = useState<Partial<Field>>({});
  const [addFieldError, setAddFieldError] = useState<string | null>(null);
  const [editingExistingFieldId, setEditingExistingFieldId] = useState<string | null>(null);
  const [editingExistingField, setEditingExistingField] = useState<Partial<Field>>({});
  const [temporaryDisplayFields, setTemporaryDisplayFields] = useState<Set<string>>(new Set());
  const [showButtons, setShowButtons] = useState<Set<string>>(new Set());
  const [showSelectButtons, setShowSelectButtons] = useState<Set<string>>(new Set());
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortableFields, setSortableFields] = useState<Field[]>([]);
  const sortableFieldsRef = useRef<Field[]>([]);

  // 次のデフォルト順序を計算する関数
  const getNextDefaultOrder = useCallback((): number => {
    if (fields.length === 0) return 1;
    const maxOrder = Math.max(...fields.map(f => f.order || 0));
    return maxOrder + 1;
  }, [fields]);

  // 非表示項目のリストを取得（order順でソート）
  const getHiddenFields = useCallback(() => {
    return fields
      .filter(field => field.defaultDisplay === false)
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [fields]);

  // 新しいフィールドを追加
  const handleAddField = useCallback(async (e: React.FormEvent) => {
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

    const result = await handleAsyncError(async () => {
      await addField({
        fieldId,
        name: newField.name.trim(),
        type: newField.type,
        unit: newField.unit?.trim() || undefined,
        order: getNextDefaultOrder(),
        defaultDisplay: false,
      });

      // 非表示項目として追加するので、一時的に表示リストに追加
      setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));

      setNewField({ name: '', type: 'number', unit: '' });
      setShowAddField(false);
      setShowSelectField(false);
      await loadFields();
      return true;
    }, {
      context: '項目追加',
      fallbackMessage: '項目の追加に失敗しました'
    });

    if (result) {
      showSuccess('項目を追加しましたわ');
    }
  }, [newField, fields, addField, getNextDefaultOrder, handleAsyncError, loadFields, showSuccess]);

  // フィールド編集
  const handleEditField = useCallback((field: Field) => {
    setEditFieldId(field.fieldId);
    setEditField({
      name: field.name,
      unit: field.unit
    });
  }, []);

  const handleEditFieldSave = useCallback(async () => {
    if (!editFieldId || !editField.name?.trim()) {
      setEditFieldId(null);
      setEditField({});
      setShowButtons(new Set());
      return;
    }

    const original = fields.find(f => f.fieldId === editFieldId);
    if (!original) return;

    const result = await handleAsyncError(async () => {
      await updateField({
        ...original,
        name: editField.name!.trim(),
        unit: editField.unit?.trim() || undefined,
      });
      await loadFields();
      return true;
    }, {
      context: '項目編集',
      fallbackMessage: '項目の編集に失敗しました'
    });

    if (result) {
      showSuccess('項目を編集しましたわ');
    }

    setEditFieldId(null);
    setEditField({});
    setShowButtons(new Set());
  }, [editFieldId, editField, fields, updateField, handleAsyncError, loadFields, showSuccess]);

  // 非表示項目を一時的に表示に追加する関数
  const handleShowExistingField = useCallback((fieldId: string) => {
    const field = fields.find(f => f.fieldId === fieldId);
    if (field) {
      setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));
      setShowSelectField(false);
      setShowSelectButtons(new Set());
      showSuccess('項目を一時表示に追加しましたわ');
    }
  }, [fields, showSuccess]);

  // 非表示項目を永続的に表示状態に変更する関数
  const handleShowExistingFieldPermanently = useCallback(async (fieldId: string) => {
    const field = fields.find(f => f.fieldId === fieldId);
    if (!field) return;

    const result = await handleAsyncError(async () => {
      await updateField({
        ...field,
        defaultDisplay: true,
      });

      setTemporaryDisplayFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldId);
        return newSet;
      });

      setShowSelectButtons(new Set());
      await loadFields();
      return true;
    }, {
      context: '表示状態変更',
      fallbackMessage: '表示状態の変更に失敗しました'
    });

    if (result) {
      showSuccess('項目を表示状態に変更しましたわ');
    }
  }, [fields, updateField, handleAsyncError, loadFields, showSuccess]);

  // 既存項目の編集機能
  const handleEditExistingField = useCallback((field: Field) => {
    setEditingExistingFieldId(field.fieldId);
    setEditingExistingField({
      name: field.name,
      unit: field.unit
    });
    setShowSelectButtons(new Set());
  }, []);

  const handleEditExistingFieldSave = useCallback(async () => {
    if (!editingExistingFieldId || !editingExistingField.name?.trim()) {
      setEditingExistingFieldId(null);
      setEditingExistingField({});
      setShowSelectButtons(new Set());
      return;
    }

    const original = fields.find(f => f.fieldId === editingExistingFieldId);
    if (!original) return;

    const result = await handleAsyncError(async () => {
      await updateField({
        ...original,
        name: editingExistingField.name!.trim(),
        unit: editingExistingField.unit?.trim() || undefined,
        order: original.order,
        defaultDisplay: original.defaultDisplay,
      });
      await loadFields();
      return true;
    }, {
      context: '既存項目編集',
      fallbackMessage: '項目の編集に失敗しました'
    });

    if (result) {
      showSuccess('項目を編集しましたわ');
    }

    setEditingExistingFieldId(null);
    setEditingExistingField({});
    setShowSelectButtons(new Set());
  }, [editingExistingFieldId, editingExistingField, fields, updateField, handleAsyncError, loadFields, showSuccess]);

  // 既存項目の削除機能
  const handleDeleteExistingField = useCallback(async (field: Field) => {
    const isConfirmed = window.confirm(
      `項目「${field.name}」を削除してもよろしいですか？\n\nこの項目に関連するすべての記録データも削除されます。`
    );

    if (!isConfirmed) return;

    const result = await handleAsyncError(async () => {
      await deleteField(field.fieldId);
      await loadFields();
      setShowSelectButtons(new Set());
      return true;
    }, {
      context: '項目削除',
      fallbackMessage: '項目の削除に失敗しました'
    });

    if (result) {
      showSuccess('項目を削除しましたわ');
    }
  }, [deleteField, handleAsyncError, loadFields, showSuccess]);

  // ボタン表示制御
  const toggleButtons = useCallback((fieldId: string) => {
    setShowButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  }, []);

  const areButtonsShown = useCallback((fieldId: string) => {
    return showButtons.has(fieldId);
  }, [showButtons]);

  const toggleSelectButtons = useCallback((fieldId: string) => {
    setShowSelectButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  }, []);

  const areSelectButtonsShown = useCallback((fieldId: string) => {
    return showSelectButtons.has(fieldId);
  }, [showSelectButtons]);

  // 並び替えモーダル関連
  const handleOpenSortModal = useCallback(() => {
    const sortedFields = [...fields].sort((a, b) => (a.order || 999) - (b.order || 999));
    setSortableFields(sortedFields);
    sortableFieldsRef.current = sortedFields;
    setShowSortModal(true);
  }, [fields]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortableFields.findIndex((item) => item.fieldId === active.id);
      const newIndex = sortableFields.findIndex((item) => item.fieldId === over.id);
      const newItems = arrayMove(sortableFields, oldIndex, newIndex);

      setSortableFields(newItems);
      sortableFieldsRef.current = newItems;
    }
  }, [sortableFields]);

  const handleSaveSortOrder = useCallback(async () => {
    const result = await handleAsyncError(async () => {
      const currentFields = sortableFieldsRef.current;
      const updatePromises = currentFields.map((field, index) => {
        const updatedField = {
          ...field,
          order: index + 1,
        };
        return updateField(updatedField);
      });

      await Promise.all(updatePromises);
      await new Promise(resolve => setTimeout(resolve, 50));
      await loadFields();
      setShowSortModal(false);
      return true;
    }, {
      context: '並び順保存',
      fallbackMessage: '並び順の保存に失敗しました'
    });

    if (result) {
      showSuccess('並び順を保存しましたわ');
    }
  }, [updateField, handleAsyncError, loadFields, showSuccess]);

  const handleHideField = useCallback(async (field: Field) => {
    const result = await handleAsyncError(async () => {
      await updateField({
        ...field,
        defaultDisplay: false,
      });

      setTemporaryDisplayFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field.fieldId);
        return newSet;
      });

      setShowButtons(new Set());
      await loadFields();
      return true;
    }, {
      context: '項目非表示',
      fallbackMessage: '項目の非表示に失敗しました'
    });

    if (result) {
      showSuccess('項目を非表示にしましたわ');
    }
  }, [updateField, handleAsyncError, loadFields, showSuccess]);

  const handleToggleDisplayInModal = useCallback(async (fieldId: string) => {
    const currentField = sortableFields.find(f => f.fieldId === fieldId);
    if (!currentField) return;

    const updatedField = {
      ...currentField,
      defaultDisplay: !currentField.defaultDisplay,
    };

    await handleAsyncError(async () => {
      await updateField(updatedField);

      const updatedSortableFields = sortableFields.map(f =>
        f.fieldId === fieldId ? updatedField : f
      );
      setSortableFields(updatedSortableFields);
      sortableFieldsRef.current = updatedSortableFields;

      const updatedMainFields = fields.map(f =>
        f.fieldId === fieldId ? updatedField : f
      );
      useRecordsStore.setState({ fields: updatedMainFields });

      if (updatedField.defaultDisplay) {
        setTemporaryDisplayFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(fieldId);
          return newSet;
        });
      } else {
        const isCurrentlyShown = fields.some(f =>
          f.fieldId === fieldId && (f.defaultDisplay || temporaryDisplayFields.has(fieldId))
        );
        if (isCurrentlyShown) {
          setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));
        }
      }

      return true;
    }, {
      context: 'モーダル内表示状態変更',
      fallbackMessage: '表示状態の変更に失敗しました'
    });
  }, [sortableFields, fields, temporaryDisplayFields, updateField, handleAsyncError]);

  return {
    // 状態
    showSelectField,
    setShowSelectField,
    showAddField,
    setShowAddField,
    newField,
    setNewField,
    editFieldId,
    setEditFieldId,
    editField,
    setEditField,
    addFieldError,
    editingExistingFieldId,
    setEditingExistingFieldId,
    editingExistingField,
    setEditingExistingField,
    temporaryDisplayFields,
    showSortModal,
    setShowSortModal,
    sortableFields,

    // 関数
    getHiddenFields,
    handleAddField,
    handleEditField,
    handleEditFieldSave,
    handleShowExistingField,
    handleShowExistingFieldPermanently,
    handleEditExistingField,
    handleEditExistingFieldSave,
    handleDeleteExistingField,
    toggleButtons,
    areButtonsShown,
    toggleSelectButtons,
    areSelectButtonsShown,
    handleOpenSortModal,
    handleDragEnd,
    handleSaveSortOrder,
    handleHideField,
    handleToggleDisplayInModal,
  };
}
