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
import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment, useCallback, useEffect } from 'react';
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
import type { Field } from '../types/record';

// ソート可能なアイテムコンポーネント
function SortableItem({
  field,
  onToggleDisplay,
}: {
  field: Field;
  onToggleDisplay: (fieldId: string) => void;
}) {
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
        `${field.name}を${newState ? '表示' : '非表示'}に変更しました`
      );
    },
    [
      field.fieldId,
      field.defaultDisplay,
      field.name,
      onToggleDisplay,
      announcePolite,
    ]
  );

  // キーボードナビゲーション用のハンドラー
  const handleKeyboardToggle = useCallback(() => {
    const newState = !field.defaultDisplay;
    onToggleDisplay(field.fieldId);

    // スクリーンリーダー用アナウンス
    announcePolite(
      `${field.name}を${newState ? '表示' : '非表示'}に変更しました`
    );
  }, [
    field.fieldId,
    field.defaultDisplay,
    field.name,
    onToggleDisplay,
    announcePolite,
  ]);

  const keyboardHandlers = {
    onEnter: handleKeyboardToggle,
    onSpace: handleKeyboardToggle,
  };

  const { handleKeyDown } = useKeyboardNavigation(keyboardHandlers);

  // 表示状態の説明文
  const displayStateDescription = field.defaultDisplay
    ? '表示中です。Enterキーで非表示にできます。'
    : '非表示です。Enterキーで表示にできます。';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 hover:shadow-md transition-all duration-200 hover:border-purple-300"
      {...attributes}
      role="listitem"
      aria-label={`${field.name}項目 - ${displayStateDescription} ドラッグして並び替えできます。`}
    >
      <div
        className="flex flex-col sm:grid sm:gap-3 sm:items-center gap-2"
        style={{ gridTemplateColumns: 'auto 1fr 1fr auto' }}
      >
        {/* スマホ用：項目名と単位を上部に */}
        <div className="flex justify-between items-center sm:hidden">
          <div className="text-lg font-medium text-gray-700">{field.name}</div>
          <div
            className="text-sm text-gray-600"
            aria-label={`単位: ${field.unit || 'なし'}`}
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
                className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors duration-150"
                aria-label={`${field.name}を非表示にする`}
                aria-pressed="true"
              >
                表示中
              </button>
            ) : (
              <button
                onClick={handleToggleDisplay}
                onKeyDown={handleKeyDown}
                className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors duration-150"
                aria-label={`${field.name}を表示にする`}
                aria-pressed="false"
              >
                非表示
              </button>
            )}
          </div>
          <div
            className="flex justify-center cursor-move focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 rounded p-1"
            tabIndex={0}
            role="button"
            aria-label={`${field.name}をドラッグして並び替え`}
            {...listeners}
          >
            <HiArrowsUpDown
              className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors duration-150"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* デスクトップ用：横並びレイアウト（元の形式） */}
        <div className="hidden sm:contents">
          {/* 左端：表示/非表示状態（クリック可能） */}
          <div className="text-center border-r border-gray-200 pr-3">
            {field.defaultDisplay ? (
              <button
                onClick={handleToggleDisplay}
                onKeyDown={handleKeyDown}
                className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors duration-150"
                aria-label={`${field.name}を非表示にする`}
                aria-pressed="true"
              >
                表示中
              </button>
            ) : (
              <button
                onClick={handleToggleDisplay}
                onKeyDown={handleKeyDown}
                className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors duration-150"
                aria-label={`${field.name}を表示にする`}
                aria-pressed="false"
              >
                非表示
              </button>
            )}
          </div>

          {/* 項目名 */}
          <div className="text-lg font-medium text-gray-700 border-r border-gray-200 pr-3 text-right">
            {field.name}
          </div>

          {/* 単位 */}
          <div
            className="text-gray-600 border-r border-gray-200 pr-3 text-left"
            aria-label={`単位: ${field.unit || 'なし'}`}
          >
            {field.unit ? `(${field.unit})` : '―'}
          </div>

          {/* 右端：上下アイコン（ドラッグハンドル） */}
          <div
            className="flex justify-center cursor-move focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 rounded p-1"
            tabIndex={0}
            role="button"
            aria-label={`${field.name}をドラッグして並び替え`}
            {...listeners}
          >
            <HiArrowsUpDown
              className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors duration-150"
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
  // アクセシビリティ関連フック
  const { modalProps } = useModalAccessibility(isOpen);
  const { announcePolite, announceAssertive } = useLiveRegion();

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
            `${activeField.name}を${overField.name}の位置に移動しました`
          );
        }
      }
    },
    [onDragEnd, fields, announcePolite]
  );

  // 保存時のアナウンス
  const handleSave = useCallback(() => {
    onSave();
    announcePolite('項目の順序を保存しました');
  }, [onSave, announcePolite]);

  // モーダル開閉時のアナウンス
  useEffect(() => {
    if (isOpen) {
      announcePolite(
        '項目並び替えダイアログが開きました。Escapeキーで閉じることができます。'
      );
    }
  }, [isOpen, announcePolite]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
            className="fixed inset-0 backdrop-blur-sm"
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
              <Dialog.Panel
                className="w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl transform overflow-hidden rounded-2xl bg-white p-4 sm:p-6 text-left align-middle shadow-xl transition-all mx-2 sm:mx-0"
                onKeyDown={handleKeyDown}
                {...modalProps}
              >
                <Dialog.Title
                  as="h3"
                  className="text-xl sm:text-2xl font-bold leading-6 text-gray-900 mb-4 sm:mb-6 flex items-center gap-2"
                  id="sort-modal-title"
                >
                  <HiBars3
                    className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600"
                    aria-hidden="true"
                  />
                  項目の並び替え
                </Dialog.Title>

                <div className="mb-4" id="sort-modal-description">
                  <p className="text-gray-600 text-xs sm:text-sm">
                    ドラッグ&ドロップまたはキーボードで項目の表示順序を変更できます。右端のハンドルをドラッグするか、フォーカスしてSpaceキーを押して並び替えを開始してください。各項目の表示/非表示もボタンから切り替えできます。
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
                        return `${
                          field?.name || 'アイテム'
                        }のドラッグを開始しました`;
                      },
                      onDragOver: ({ active, over }) => {
                        const activeField = fields.find(
                          f => f.fieldId === active.id
                        );
                        const overField = fields.find(
                          f => f.fieldId === over?.id
                        );
                        if (activeField && overField) {
                          return `${activeField.name}を${overField.name}の上に移動中`;
                        }
                        return '';
                      },
                      onDragEnd: ({ active, over }) => {
                        const activeField = fields.find(
                          f => f.fieldId === active.id
                        );
                        const overField = fields.find(
                          f => f.fieldId === over?.id
                        );
                        if (active.id === over?.id) {
                          return `${
                            activeField?.name || 'アイテム'
                          }を元の位置に戻しました`;
                        }
                        if (activeField && overField) {
                          return `${activeField.name}を${overField.name}の位置に移動しました`;
                        }
                        return `${
                          activeField?.name || 'アイテム'
                        }のドラッグが完了しました`;
                      },
                      onDragCancel: ({ active }) => {
                        const field = fields.find(f => f.fieldId === active.id);
                        return `${
                          field?.name || 'アイテム'
                        }のドラッグをキャンセルしました`;
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
                      aria-label="並び替え可能な項目一覧"
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
                  aria-label="ダイアログ操作ボタン"
                >
                  <button
                    type="button"
                    className="bg-gray-400 text-white px-4 sm:px-6 py-2 rounded-lg shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                    onClick={onClose}
                    aria-label="変更をキャンセルしてダイアログを閉じる"
                  >
                    <HiXMark className="w-4 h-4" aria-hidden="true" />
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="bg-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                    onClick={handleSave}
                    aria-label="項目の順序と表示設定を保存"
                  >
                    <HiCheckCircle className="w-4 h-4" aria-hidden="true" />
                    保存
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SortModal;
