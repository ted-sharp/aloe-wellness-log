import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useCallback, useRef, useState } from 'react';
import { useRecordsStore } from '../store/records';
import { useToastStore } from '../store/toast';
import type { Field } from '../types/record';
import { useErrorHandler } from './useErrorHandler';
import { useI18n } from './useI18n';

type NewField = {
  name: string;
  type: 'number' | 'string' | 'boolean';
  unit?: string;
  excludeFromGraph?: boolean;
};

export function useFieldManagement() {
  const { t, getAnnouncement } = useI18n();
  const { fields, loadFields, addField, updateField, deleteField } =
    useRecordsStore();
  const { showSuccess, showError } = useToastStore();
  const { handleAsyncError } = useErrorHandler();

  // 状態管理
  const [showSelectField, setShowSelectField] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<NewField>({
    name: '',
    type: 'number',
    unit: '',
    excludeFromGraph: false,
  });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editField, setEditField] = useState<Partial<Field>>({
    excludeFromGraph: false,
  });
  const [addFieldError, setAddFieldError] = useState<string | null>(null);
  const [editingExistingFieldId, setEditingExistingFieldId] = useState<
    string | null
  >(null);
  const [editingExistingField, setEditingExistingField] = useState<
    Partial<Field>
  >({ excludeFromGraph: false });
  const [temporaryDisplayFields, setTemporaryDisplayFields] = useState<
    Set<string>
  >(new Set());
  const [showButtons, setShowButtons] = useState<Set<string>>(new Set());
  const [showSelectButtons, setShowSelectButtons] = useState<Set<string>>(
    new Set()
  );
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
  const handleAddField = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddFieldError(null);

      if (!newField.name.trim()) {
        setAddFieldError(t('validation.fieldNameInput'));
        return;
      }

      if (fields.some(f => f.name === newField.name.trim())) {
        setAddFieldError(t('validation.duplicateFieldName'));
        return;
      }

      const fieldId = newField.name.trim().replace(/\s+/g, '_').toLowerCase();

      const result = await handleAsyncError(
        async () => {
          await addField({
            fieldId,
            name: newField.name.trim(),
            type: newField.type,
            unit: newField.unit?.trim() || undefined,
            order: getNextDefaultOrder(),
            defaultDisplay: false,
            excludeFromGraph: !!newField.excludeFromGraph,
          });

          // 非表示項目として追加するので、一時的に表示リストに追加
          setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));

          setNewField({
            name: '',
            type: 'number',
            unit: '',
            excludeFromGraph: false,
          });
          setShowAddField(false);
          setShowSelectField(false);
          await loadFields();
          return true;
        },
        {
          context: t('actions.add'),
          fallbackMessage: t('errors.general'),
        }
      );

      if (result) {
        showSuccess(getAnnouncement('fieldAddedSuccess'));
      }
    },
    [
      newField,
      fields,
      addField,
      getNextDefaultOrder,
      handleAsyncError,
      loadFields,
      showSuccess,
    ]
  );

  // フィールド編集
  const handleEditField = useCallback((field: Field) => {
    setEditFieldId(field.fieldId);
    setEditField({
      name: field.name,
      unit: field.unit,
      excludeFromGraph: field.excludeFromGraph ?? false,
    });
  }, []);

  const handleEditFieldSave = useCallback(async () => {
    if (!editFieldId || !editField.name?.trim()) {
      setEditFieldId(null);
      setEditField({ excludeFromGraph: false });
      setShowButtons(new Set());
      return;
    }

    const original = fields.find(f => f.fieldId === editFieldId);
    if (!original) return;

    const result = await handleAsyncError(
      async () => {
        await updateField({
          ...original,
          name: editField.name!.trim(),
          unit: editField.unit?.trim() || undefined,
          excludeFromGraph: !!editField.excludeFromGraph,
        });
        await loadFields();
        return true;
      },
      {
        context: t('actions.edit'),
        fallbackMessage: t('errors.general'),
      }
    );

    if (result) {
      showSuccess(getAnnouncement('fieldEditedSuccess'));
    }

    setEditFieldId(null);
    setEditField({ excludeFromGraph: false });
    setShowButtons(new Set());
  }, [
    editFieldId,
    editField,
    fields,
    updateField,
    handleAsyncError,
    loadFields,
    showSuccess,
  ]);

  // 非表示項目を一時的に表示に追加する関数
  const handleShowExistingField = useCallback(
    (fieldId: string) => {
      const field = fields.find(f => f.fieldId === fieldId);
      if (field) {
        setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));
        setShowSelectField(false);
        setShowSelectButtons(new Set());
        showSuccess(getAnnouncement('fieldTempDisplayAdded'));
      }
    },
    [fields, showSuccess]
  );

  // 非表示項目を永続的に表示状態に変更する関数
  const handleShowExistingFieldPermanently = useCallback(
    async (fieldId: string) => {
      const field = fields.find(f => f.fieldId === fieldId);
      if (!field) return;

      // 楽観的更新: 即座にReact状態を更新
      const updatedField = { ...field, defaultDisplay: true };

      // メインのfields配列を即座に更新
      const updatedFields = fields.map(f =>
        f.fieldId === fieldId ? updatedField : f
      );

      // 楽観的更新を適用
      useRecordsStore.setState({ fields: updatedFields });

      try {
        await updateField(updatedField);

        setTemporaryDisplayFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(fieldId);
          return newSet;
        });

        setShowSelectButtons(new Set());

        // 選択画面を閉じてメイン画面に戻る
        setShowSelectField(false);

        await loadFields();

        showSuccess(getAnnouncement('fieldDisplayChanged'));
      } catch (error) {
        // エラー時のロールバック: 元の状態に戻す
        useRecordsStore.setState({ fields });

        const errorMessage =
          error instanceof Error
            ? error.message
            : '表示状態の変更に失敗しました';
        showError(errorMessage);
        console.error('表示状態変更エラー:', error);
      }
    },
    [fields, updateField, handleAsyncError, loadFields, showSuccess]
  );

  // 既存項目の編集機能
  const handleEditExistingField = useCallback((field: Field) => {
    setEditingExistingFieldId(field.fieldId);
    setEditingExistingField({
      name: field.name,
      unit: field.unit,
      excludeFromGraph: field.excludeFromGraph ?? false,
    });
    setShowSelectButtons(new Set());
  }, []);

  const handleEditExistingFieldSave = useCallback(async () => {
    if (!editingExistingFieldId || !editingExistingField.name?.trim()) {
      setEditingExistingFieldId(null);
      setEditingExistingField({ excludeFromGraph: false });
      setShowSelectButtons(new Set());
      return;
    }

    const original = fields.find(f => f.fieldId === editingExistingFieldId);
    if (!original) return;

    const result = await handleAsyncError(
      async () => {
        await updateField({
          ...original,
          name: editingExistingField.name!.trim(),
          unit: editingExistingField.unit?.trim() || undefined,
          order: original.order,
          defaultDisplay: original.defaultDisplay,
          excludeFromGraph: !!editingExistingField.excludeFromGraph,
        });
        await loadFields();
        return true;
      },
      {
        context: t('actions.edit'),
        fallbackMessage: t('errors.general'),
      }
    );

    if (result) {
      showSuccess(getAnnouncement('fieldEditedSuccess'));
    }

    setEditingExistingFieldId(null);
    setEditingExistingField({ excludeFromGraph: false });
    setShowSelectButtons(new Set());
  }, [
    editingExistingFieldId,
    editingExistingField,
    fields,
    updateField,
    handleAsyncError,
    loadFields,
    showSuccess,
  ]);

  // 既存項目の削除機能
  const handleDeleteExistingField = useCallback(
    async (field: Field) => {
      const isConfirmed = window.confirm(
        t('common.confirmDeleteField', { fieldName: field.name })
      );

      if (!isConfirmed) return;

      const result = await handleAsyncError(
        async () => {
          await deleteField(field.fieldId);
          await loadFields();
          setShowSelectButtons(new Set());
          return true;
        },
        {
          context: t('actions.delete'),
          fallbackMessage: t('errors.general'),
        }
      );

      if (result) {
        showSuccess(getAnnouncement('fieldDeletedSuccess'));
      }
    },
    [deleteField, handleAsyncError, loadFields, showSuccess]
  );

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

  const areButtonsShown = useCallback(
    (fieldId: string) => {
      return showButtons.has(fieldId);
    },
    [showButtons]
  );

  // ボタン表示をクリアする関数を追加
  const clearButtons = useCallback(() => {
    setShowButtons(new Set());
  }, []);

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

  const areSelectButtonsShown = useCallback(
    (fieldId: string) => {
      return showSelectButtons.has(fieldId);
    },
    [showSelectButtons]
  );

  // 選択ボタン表示をクリアする関数を追加
  const clearSelectButtons = useCallback(() => {
    setShowSelectButtons(new Set());
  }, []);

  // 並び替えモーダル関連
  const handleOpenSortModal = useCallback(async () => {
    // フィールドが読み込まれていない場合は再読み込み
    let currentFields = fields;
    if (currentFields.length === 0) {
      try {
        await loadFields();
        // ストアから最新のフィールドデータを取得
        const { fields: latestFields } = useRecordsStore.getState();
        currentFields = latestFields;

        // 再読み込み後もフィールドがない場合は警告
        if (currentFields.length === 0) {
          showError(t('errors.fieldDataNotFound'));
          return;
        }
      } catch (error) {
        showError(t('errors.fieldDataLoadFailed'));
        return;
      }
    }

    const sortedFields = [...currentFields].sort(
      (a, b) => (a.order || 999) - (b.order || 999)
    );
    setSortableFields(sortedFields);
    sortableFieldsRef.current = sortedFields;
    setShowSortModal(true);
  }, [fields, loadFields, showError]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sortableFields.findIndex(
          item => item.fieldId === active.id
        );
        const newIndex = sortableFields.findIndex(
          item => item.fieldId === over.id
        );
        const newItems = arrayMove(sortableFields, oldIndex, newIndex);

        setSortableFields(newItems);
        sortableFieldsRef.current = newItems;
      }
    },
    [sortableFields]
  );

  const handleSaveSortOrder = useCallback(async () => {
    const result = await handleAsyncError(
      async () => {
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
      },
      {
        context: t('actions.sort'),
        fallbackMessage: t('errors.general'),
      }
    );

    if (result) {
      showSuccess(getAnnouncement('sortOrderSaved'));
    }
  }, [updateField, handleAsyncError, loadFields, showSuccess]);

  const handleHideField = useCallback(
    async (field: Field) => {
      const result = await handleAsyncError(
        async () => {
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
        },
        {
          context: '項目非表示',
          fallbackMessage: '項目の非表示に失敗しました',
        }
      );

      if (result) {
        showSuccess(getAnnouncement('fieldHidden'));
      }
    },
    [updateField, handleAsyncError, loadFields, showSuccess]
  );

  const handleToggleDisplayInModal = useCallback(
    async (fieldId: string) => {
      const currentField = sortableFields.find(f => f.fieldId === fieldId);
      if (!currentField) return;

      const updatedField = {
        ...currentField,
        defaultDisplay: !currentField.defaultDisplay,
      };

      await handleAsyncError(
        async () => {
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
            const isCurrentlyShown = fields.some(
              f =>
                f.fieldId === fieldId &&
                (f.defaultDisplay || temporaryDisplayFields.has(fieldId))
            );
            if (isCurrentlyShown) {
              setTemporaryDisplayFields(prev => new Set([...prev, fieldId]));
            }
          }

          return true;
        },
        {
          context: 'モーダル内表示状態変更',
          fallbackMessage: '表示状態の変更に失敗しました',
        }
      );
    },
    [
      sortableFields,
      fields,
      temporaryDisplayFields,
      updateField,
      handleAsyncError,
    ]
  );

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
    clearButtons,
    clearSelectButtons,
  };
}
