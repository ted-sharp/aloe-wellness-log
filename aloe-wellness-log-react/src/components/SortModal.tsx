import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HiArrowsUpDown,
  HiBars3,
  HiCheckCircle,
  HiXMark,
} from 'react-icons/hi2';
import {
  useKeyboardNavigation,
  useLiveRegion,
  useModalAccessibility,
} from '../hooks/useAccessibility';
import { useI18n } from '../hooks/useI18n';
import type { Field } from '../types/record';

// ソート可能なアイテムコンポーネント
function SortableItem({
  field,
  onToggleDisplay,
}: {
  field: Field;
  onToggleDisplay: (fieldId: string) => void;
}) {
  const { t } = useI18n();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.fieldId });

  const { announcePolite } = useLiveRegion();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 表示状態をトグルする関数
  const handleToggleDisplay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // ドラッグイベントとの競合を防ぐ
      e.preventDefault(); // デフォルトの動作も防ぐ
      const newState = !field.defaultDisplay;
      onToggleDisplay(field.fieldId);

      // スクリーンリーダー用アナウンス
      announcePolite(
        `${field.name}${t('dialogs.sortModal.toggledAnnouncement', {
          state: newState
            ? t('dialogs.sortModal.visible')
            : t('dialogs.sortModal.hidden'),
        })}`
      );
    },
    [
      field.fieldId,
      field.defaultDisplay,
      field.name,
      onToggleDisplay,
      announcePolite,
      t,
    ]
  );

  // キーボードナビゲーション用のハンドラー
  const handleKeyboardToggle = useCallback(() => {
    const newState = !field.defaultDisplay;
    onToggleDisplay(field.fieldId);

    // スクリーンリーダー用アナウンス
    announcePolite(
      `${field.name}${t('dialogs.sortModal.toggledAnnouncement', {
        state: newState
          ? t('dialogs.sortModal.visible')
          : t('dialogs.sortModal.hidden'),
      })}`
    );
  }, [
    field.fieldId,
    field.defaultDisplay,
    field.name,
    onToggleDisplay,
    announcePolite,
    t,
  ]);

  const keyboardHandlers = {
    onEnter: handleKeyboardToggle,
    onSpace: handleKeyboardToggle,
  };

  const { handleKeyDown } = useKeyboardNavigation(keyboardHandlers);

  // 表示状態の説明文
  const displayStateDescription = field.defaultDisplay
    ? t('dialogs.sortModal.visibleDescription')
    : t('dialogs.sortModal.hiddenDescription');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 sm:p-3 hover:shadow-md transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-400"
      {...attributes}
      role="listitem"
      aria-label={`${field.name}${t(
        'common.item'
      )} - ${displayStateDescription} ${t('accessibility.sortable')}`}
    >
      <div
        className="flex flex-col sm:grid sm:gap-3 sm:items-center gap-2"
        style={{ gridTemplateColumns: 'auto 1fr 1fr auto' }}
      >
        {/* スマホ用：項目名と単位を上部に */}
        <div className="flex justify-between items-center sm:hidden">
          <div className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {field.name}
          </div>
          <div
            className="text-sm text-gray-600 dark:text-gray-400"
            aria-label={`${t('dialogs.sortModal.unit')}: ${
              field.unit || t('dialogs.sortModal.noUnit')
            }`}
          >
            {field.unit ? `(${field.unit})` : '―'}
          </div>
        </div>

        {/* スマホ用：表示状態とドラッグハンドルを下部に */}
        <div className="flex justify-between items-center sm:hidden">
          <div>
            {field.defaultDisplay ? (
              <button
                onClick={handleToggleDisplay}
                onKeyDown={handleKeyDown}
                className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-1 transition-colors duration-150"
                aria-label={`${field.name}${t('dialogs.sortModal.makeHidden')}`}
                aria-pressed="true"
              >
                {t('dialogs.sortModal.visible')}
              </button>
            ) : (
              <button
                onClick={handleToggleDisplay}
                onKeyDown={handleKeyDown}
                className="bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-1 transition-colors duration-150"
                aria-label={`${field.name}${t(
                  'dialogs.sortModal.makeVisible'
                )}`}
                aria-pressed="false"
              >
                {t('dialogs.sortModal.hidden')}
              </button>
            )}
          </div>
          <div
            className="flex justify-center cursor-move focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-1 rounded p-1"
            tabIndex={0}
            role="button"
            aria-label={`${field.name}${t('dialogs.sortModal.dragToSort')}`}
            {...listeners}
          >
            <HiArrowsUpDown
              className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* デスクトップ用：横並びレイアウト（元の形式） */}
        <div className="hidden sm:contents">
          {/* 左端：表示/非表示状態（クリック可能） */}
          <div className="text-center border-r border-gray-200 dark:border-gray-600 pr-3">
            {field.defaultDisplay ? (
              <button
                onClick={handleToggleDisplay}
                onKeyDown={handleKeyDown}
                className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-1 transition-colors duration-150"
                aria-label={`${field.name}${t('dialogs.sortModal.makeHidden')}`}
                aria-pressed="true"
              >
                {t('dialogs.sortModal.visible')}
              </button>
            ) : (
              <button
                onClick={handleToggleDisplay}
                onKeyDown={handleKeyDown}
                className="bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-1 transition-colors duration-150"
                aria-label={`${field.name}${t(
                  'dialogs.sortModal.makeVisible'
                )}`}
                aria-pressed="false"
              >
                {t('dialogs.sortModal.hidden')}
              </button>
            )}
          </div>

          {/* 項目名 */}
          <div className="text-lg font-medium text-gray-700 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600 pr-3 text-right">
            {field.name}
          </div>

          {/* 単位 */}
          <div
            className="text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600 pr-3 text-left"
            aria-label={`${t('dialogs.sortModal.unit')}: ${
              field.unit || t('dialogs.sortModal.noUnit')
            }`}
          >
            {field.unit ? `(${field.unit})` : '―'}
          </div>

          {/* 右端：上下アイコン（ドラッグハンドル） */}
          <div
            className="flex justify-center cursor-move focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-1 rounded p-1"
            tabIndex={0}
            role="button"
            aria-label={`${field.name}${t('dialogs.sortModal.dragToSort')}`}
            {...listeners}
          >
            <HiArrowsUpDown
              className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SortModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: Field[];
  onDragEnd: (event: DragEndEvent) => void;
  onSave: () => void;
  onToggleDisplay: (fieldId: string) => void;
}

const SortModal: React.FC<SortModalProps> = ({
  isOpen,
  onClose,
  fields,
  onDragEnd,
  onSave,
  onToggleDisplay,
}) => {
  const { t } = useI18n();

  // アクセシビリティ関連フック
  const { modalProps } = useModalAccessibility(isOpen);
  const { announcePolite } = useLiveRegion();

  // キーボードナビゲーション
  const keyboardHandlers = {
    onEscape: onClose,
  };
  const { handleKeyDown } = useKeyboardNavigation(keyboardHandlers);

  // ドラッグ&ドロップセンサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ終了時の処理（アナウンス付き）
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        // 実際の並び替え処理
        onDragEnd(event);

        // 項目名を取得してアナウンス
        const activeField = fields.find(f => f.fieldId === active.id);
        const overField = fields.find(f => f.fieldId === over?.id);

        if (activeField && overField) {
          announcePolite(
            `${activeField.name}${t('dialogs.sortModal.dragEndAnnouncement', {
              target: overField.name,
            })}`
          );
        }
      }
    },
    [onDragEnd, fields, announcePolite, t]
  );

  // 保存時のアナウンス
  const handleSave = useCallback(() => {
    onSave();
    announcePolite(t('dialogs.sortModal.savedAnnouncement'));
  }, [onSave, announcePolite, t]);

  // モーダル開閉時のアナウンス
  useEffect(() => {
    if (isOpen) {
      announcePolite(t('dialogs.sortModal.openedAnnouncement'));
    }
  }, [isOpen, announcePolite, t]);

  // HeadlessUIの自動body制御を無効化（モバイル表示問題の修正）
  useEffect(() => {
    if (isOpen) {
      // シンプルなoverflow制御のみ（スクロールバー幅計算なし）
      document.body.style.overflow = 'hidden';
      // HeadlessUIによる意図しないpadding-rightを防ぐ
      document.body.style.paddingRight = '0px';
    }

    return () => {
      // 確実に復元
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto" {...modalProps}>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        onClick={onClose}
      />

      {/* モーダルコンテンツ */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          className="relative w-full max-w-sm sm:max-w-xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-4 sm:p-6 text-left align-middle shadow-xl transition-all"
          onKeyDown={handleKeyDown}
          onClick={e => e.stopPropagation()}
        >
          <h3
            className="text-xl sm:text-2xl font-bold leading-6 text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2"
            id="sort-modal-title"
          >
            <HiBars3
              className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400"
              aria-hidden="true"
            />
            {t('dialogs.sortModal.title')}
          </h3>

          <div className="mb-4" id="sort-modal-description">
            <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
              {t('dialogs.sortModal.description')}
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
              announcements: {
                onDragStart: ({ active }) => {
                  const field = fields.find(f => f.fieldId === active.id);
                  return `${field?.name || 'アイテム'}${t(
                    'dialogs.sortModal.dragStartAnnouncement'
                  )}`;
                },
                onDragOver: ({ active, over }) => {
                  const activeField = fields.find(f => f.fieldId === active.id);
                  const overField = fields.find(f => f.fieldId === over?.id);
                  if (activeField && overField) {
                    return `${activeField.name}${t(
                      'dialogs.sortModal.dragOverAnnouncement',
                      { target: overField.name }
                    )}`;
                  }
                  return '';
                },
                onDragEnd: ({ active, over }) => {
                  const activeField = fields.find(f => f.fieldId === active.id);
                  const overField = fields.find(f => f.fieldId === over?.id);
                  if (active.id === over?.id) {
                    return `${activeField?.name || 'アイテム'}${t(
                      'dialogs.sortModal.dragReturnAnnouncement'
                    )}`;
                  }
                  if (activeField && overField) {
                    return `${activeField.name}${t(
                      'dialogs.sortModal.dragEndAnnouncement',
                      { target: overField.name }
                    )}`;
                  }
                  return `${activeField?.name || 'アイテム'}${t(
                    'dialogs.sortModal.dragCompleteAnnouncement'
                  )}`;
                },
                onDragCancel: ({ active }) => {
                  const field = fields.find(f => f.fieldId === active.id);
                  return `${field?.name || 'アイテム'}${t(
                    'dialogs.sortModal.dragCancelAnnouncement'
                  )}`;
                },
              },
            }}
          >
            <SortableContext
              items={fields.map(field => field.fieldId)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="space-y-2 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-1 sm:pr-2"
                role="list"
                aria-label={t('dialogs.sortModal.listLabel')}
                aria-describedby="sort-modal-description"
              >
                {fields.map(field => (
                  <SortableItem
                    key={field.fieldId}
                    field={field}
                    onToggleDisplay={onToggleDisplay}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div
            className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end"
            role="group"
            aria-label={t('dialogs.sortModal.buttonsLabel')}
          >
            <button
              type="button"
              className="bg-gray-400 dark:bg-gray-600 text-white px-4 sm:px-6 py-2 rounded-lg shadow-md hover:bg-gray-500 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              onClick={onClose}
              aria-label={t('dialogs.sortModal.cancelLabel')}
            >
              <HiXMark className="w-4 h-4" aria-hidden="true" />
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="bg-purple-600 dark:bg-purple-700 text-white px-4 sm:px-6 py-2 rounded-lg shadow-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              onClick={handleSave}
              aria-label={t('dialogs.sortModal.saveLabel')}
            >
              <HiCheckCircle className="w-4 h-4" aria-hidden="true" />
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SortModal;
