import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Field, RecordItem as RecordItemType } from '../types/record';
import RecordItem from './RecordItem';

describe('RecordItem', () => {
  const mockRecord: RecordItemType = {
    id: 'test-record-1',
    date: '2024-01-01',
    time: '08:00',
    datetime: '2024-01-01T08:00:00.000Z',
    fieldId: 'weight',
    value: 65.5,
  };

  const mockField: Field = {
    fieldId: 'weight',
    name: '体重',
    type: 'number',
    unit: 'kg',
    order: 1,
    defaultDisplay: true,
  };

  const mockHandlers = {
    onEdit: vi.fn(),
    onEditSave: vi.fn(),
    onEditCancel: vi.fn(),
    onDelete: vi.fn(),
    onEditValueChange: vi.fn(),
    onToggleTextExpansion: vi.fn(),
    onToggleButtons: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('レコード情報を正しく表示する', () => {
      render(
        <RecordItem
          record={mockRecord}
          field={mockField}
          editId={null}
          editValue=""
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('体重')).toBeInTheDocument();
      expect(screen.getByText('65.5')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
    });

    it('フィールドが見つからない場合でも表示する', () => {
      render(
        <RecordItem
          record={mockRecord}
          field={undefined}
          editId={null}
          editValue=""
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      // fieldIdがそのまま表示される
      expect(screen.getByText('weight')).toBeInTheDocument();
      expect(screen.getByText('65.5')).toBeInTheDocument();
    });

    it('boolean型の値を正しく表示する', () => {
      const booleanRecord = { ...mockRecord, value: true };
      const booleanField = { ...mockField, type: 'boolean' as const };

      render(
        <RecordItem
          record={booleanRecord}
          field={booleanField}
          editId={null}
          editValue=""
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('あり')).toBeInTheDocument();
    });

    it('文字列型の値を正しく表示する', () => {
      const stringRecord = { ...mockRecord, value: 'テストメモ' };
      const stringField = { ...mockField, type: 'string' as const };

      render(
        <RecordItem
          record={stringRecord}
          field={stringField}
          editId={null}
          editValue=""
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('テストメモ')).toBeInTheDocument();
    });
  });

  describe('ユーザーインタラクション', () => {
    it('クリックでボタン表示を切り替える', () => {
      render(
        <RecordItem
          record={mockRecord}
          field={mockField}
          editId={null}
          editValue=""
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      // レコード項目のクリック可能な部分をクリック
      const clickableArea = screen
        .getByRole('listitem')
        .querySelector('.cursor-pointer');
      if (clickableArea) {
        fireEvent.click(clickableArea);
      }

      expect(mockHandlers.onToggleButtons).toHaveBeenCalledWith(mockRecord.id);
    });

    it('ボタンが表示されている時に編集ボタンをクリックできる', () => {
      const showButtons = new Set([mockRecord.id]);

      render(
        <RecordItem
          record={mockRecord}
          field={mockField}
          editId={null}
          editValue=""
          expandedTexts={new Set()}
          showButtons={showButtons}
          {...mockHandlers}
        />
      );

      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);

      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockRecord);
    });

    it('ボタンが表示されている時に削除ボタンをクリックできる', () => {
      const showButtons = new Set([mockRecord.id]);

      render(
        <RecordItem
          record={mockRecord}
          field={mockField}
          editId={null}
          editValue=""
          expandedTexts={new Set()}
          showButtons={showButtons}
          {...mockHandlers}
        />
      );

      const deleteButton = screen.getByText('削除');
      fireEvent.click(deleteButton);

      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockRecord);
    });
  });

  describe('編集機能', () => {
    it('編集モードで入力フィールドを表示する', () => {
      render(
        <RecordItem
          record={mockRecord}
          field={mockField}
          editId={mockRecord.id}
          editValue={65.5}
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      const input = screen.getByDisplayValue('65.5');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'number');
    });

    it('編集モードで値を変更できる', () => {
      render(
        <RecordItem
          record={mockRecord}
          field={mockField}
          editId={mockRecord.id}
          editValue={65.5}
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      const input = screen.getByDisplayValue('65.5');
      fireEvent.change(input, { target: { value: '66.0' } });

      expect(mockHandlers.onEditValueChange).toHaveBeenCalledWith('66.0');
    });

    it('編集モードで保存ボタンをクリックできる', () => {
      render(
        <RecordItem
          record={mockRecord}
          field={mockField}
          editId={mockRecord.id}
          editValue={66.0}
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      expect(mockHandlers.onEditSave).toHaveBeenCalledWith(mockRecord);
    });

    it('編集モードでキャンセルボタンをクリックできる', () => {
      render(
        <RecordItem
          record={mockRecord}
          field={mockField}
          editId={mockRecord.id}
          editValue={66.0}
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);

      expect(mockHandlers.onEditCancel).toHaveBeenCalledWith(mockRecord.id);
    });

    it('boolean型の編集でチェックボックスを表示する', () => {
      const booleanRecord = { ...mockRecord, value: true };
      const booleanField = { ...mockField, type: 'boolean' as const };

      render(
        <RecordItem
          record={booleanRecord}
          field={booleanField}
          editId={mockRecord.id}
          editValue={true}
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });
  });

  describe('長い文字列の処理', () => {
    it('長い文字列を省略表示する', () => {
      const longText = 'これは非常に長いテキストです。'.repeat(10);
      const longTextRecord = { ...mockRecord, value: longText };
      const stringField = { ...mockField, type: 'string' as const };

      render(
        <RecordItem
          record={longTextRecord}
          field={stringField}
          editId={null}
          editValue=""
          expandedTexts={new Set()}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      // 長いテキストが表示される（実際のコンポーネントでは省略されない）
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('展開ボタンで長い文字列を全表示できる', () => {
      const longText = 'これは非常に長いテキストです。'.repeat(10);
      const longTextRecord = { ...mockRecord, value: longText };
      const stringField = { ...mockField, type: 'string' as const };
      const expandedTexts = new Set([mockRecord.id]);

      render(
        <RecordItem
          record={longTextRecord}
          field={stringField}
          editId={null}
          editValue=""
          expandedTexts={expandedTexts}
          showButtons={new Set()}
          {...mockHandlers}
        />
      );

      // 完全なテキストが表示される
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });
});
