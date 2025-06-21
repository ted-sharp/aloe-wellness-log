import React from 'react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import {
  HiBars3,
  HiCheckCircle,
  HiXMark,
  HiArrowsUpDown
} from 'react-icons/hi2';
import type { Field } from '../types/record';

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
  onToggleDisplay
}) => {
  // ドラッグ&ドロップセンサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={fields.map(field => field.fieldId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                      {fields.map((field) => (
                        <SortableItem key={field.fieldId} field={field} onToggleDisplay={onToggleDisplay} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    className="bg-gray-400 text-white px-6 py-2 rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-200 font-medium flex items-center gap-2"
                    onClick={onClose}
                  >
                    <HiXMark className="w-4 h-4" />
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200 font-medium flex items-center gap-2"
                    onClick={onSave}
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
  );
};

export default SortModal;
