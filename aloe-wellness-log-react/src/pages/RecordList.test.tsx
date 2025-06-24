import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRecordsStore } from '../store/records';
import RecordList from './RecordList';

// zustandストアをモック
vi.mock('../store/records', () => ({
  useRecordsStore: vi.fn(),
}));

// パフォーマンス監視をモック
vi.mock('../utils/performanceMonitor', () => ({
  performanceMonitor: {
    trackRender: {
      start: vi.fn(),
      end: vi.fn(),
    },
    trackInteraction: {
      start: vi.fn(() => 'test-id'),
      end: vi.fn(),
    },
  },
  trackDatabaseOperation: vi.fn((_name, fn) => fn()),
}));

// devToolsをモック
vi.mock('../utils/devTools', () => ({
  isDev: false,
}));

const mockUseRecordsStore = vi.mocked(useRecordsStore);

describe('RecordList', () => {
  const mockLoadRecords = vi.fn();
  const mockLoadFields = vi.fn();
  const mockUpdateRecord = vi.fn();
  const mockDeleteRecord = vi.fn();

  const mockFields = [
    {
      fieldId: 'weight',
      name: '体重',
      type: 'number' as const,
      unit: 'kg',
      order: 1,
      defaultDisplay: true,
    },
    {
      fieldId: 'systolic_bp',
      name: '最高血圧',
      type: 'number' as const,
      unit: 'mmHg',
      order: 2,
      defaultDisplay: true,
    },
  ];

  const mockRecords = [
    {
      id: '1',
      fieldId: 'weight',
      value: 70,
      date: '2024-01-15',
      time: '08:00',
      notes: '',
    },
    {
      id: '2',
      fieldId: 'systolic_bp',
      value: 120,
      date: '2024-01-15',
      time: '08:00',
      notes: '',
    },
    {
      id: '3',
      fieldId: 'weight',
      value: 69.5,
      date: '2024-01-14',
      time: '08:00',
      notes: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRecordsStore.mockReturnValue({
      records: mockRecords,
      fields: mockFields,
      initializeFields: vi.fn(),
      loadRecords: mockLoadRecords,
      loadFields: mockLoadFields,
      addRecord: vi.fn(),
      updateRecord: mockUpdateRecord,
      deleteRecord: mockDeleteRecord,
      addField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      reorderFields: vi.fn(),
    });
  });

  test('一覧ページが正しくレンダリングされる', async () => {
    render(<RecordList />);

    expect(screen.getByRole('heading', { name: '一覧' })).toBeInTheDocument();

    // データ読み込み関数が呼び出される
    await waitFor(() => {
      expect(mockLoadFields).toHaveBeenCalled();
      expect(mockLoadRecords).toHaveBeenCalled();
    });
  });

  test('記録が日付・時刻でグループ化されて表示される', async () => {
    render(<RecordList />);

    await waitFor(() => {
      // 2024-01-15 08:00のグループ
      expect(screen.getByText('2024-01-15 08:00')).toBeInTheDocument();
      // 2024-01-14 08:00のグループ
      expect(screen.getByText('2024-01-14 08:00')).toBeInTheDocument();
    });
  });

  test('記録件数が表示される', async () => {
    render(<RecordList />);

    await waitFor(() => {
      // 2つの日時グループがある
      const items = screen.getAllByText(
        (content, element) =>
          !!element?.textContent?.includes('件の記録グループ') &&
          element.textContent?.startsWith('2')
      );
      expect(items.length).toBeGreaterThan(0);
    });
  });

  test('表示件数を変更できる', async () => {
    render(<RecordList />);

    const pageSizeSelect = screen.getByRole('option', { name: /20件/ });
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });

    expect(pageSizeSelect).toHaveValue('50');
  });

  test('レコードがフィールドの順序に従って表示される', async () => {
    render(<RecordList />);

    await waitFor(() => {
      // 体重と最高血圧のレコードが表示されることを確認
      expect(screen.getAllByText('体重')).toHaveLength(2); // 2つの日付グループに表示される
      expect(screen.getByText('最高血圧')).toBeInTheDocument();
      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });
  });

  test('空の状態が適切に処理される', async () => {
    mockUseRecordsStore.mockReturnValue({
      records: [],
      fields: [],
      initializeFields: vi.fn(),
      loadRecords: mockLoadRecords,
      loadFields: mockLoadFields,
      addRecord: vi.fn(),
      updateRecord: mockUpdateRecord,
      deleteRecord: mockDeleteRecord,
      addField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      reorderFields: vi.fn(),
    });

    render(<RecordList />);

    await waitFor(() => {
      expect(
        screen.getByText(
          (content, element) => element?.textContent === '0件の記録グループ'
        )
      ).toBeInTheDocument();
    });
  });

  test('ページネーションが複数ページで表示される', async () => {
    // 多くのレコードを用意してページングをテスト
    const manyRecords = Array.from({ length: 100 }, (_, i) => ({
      id: `record-${i}`,
      fieldId: 'weight',
      value: 70 + i * 0.1,
      date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      time: '08:00',
      notes: '',
    }));

    mockUseRecordsStore.mockReturnValue({
      records: manyRecords,
      fields: mockFields,
      initializeFields: vi.fn(),
      loadRecords: mockLoadRecords,
      loadFields: mockLoadFields,
      addRecord: vi.fn(),
      updateRecord: mockUpdateRecord,
      deleteRecord: mockDeleteRecord,
      addField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      reorderFields: vi.fn(),
    });

    render(<RecordList />);

    await waitFor(() => {
      // ページネーションボタンが表示される（複数ページ分のコンテンツがあることを確認）
      const paginationButtons = screen.getAllByRole('button');
      expect(paginationButtons.length).toBeGreaterThan(0);

      // ページ情報が表示される
      expect(screen.getAllByText(/ページ/).length).toBeGreaterThan(0);
    });
  });

  test('notesフィールドが適切に処理される', async () => {
    const recordsWithNotes = [
      {
        id: '1',
        fieldId: 'notes',
        value: 'テスト備考',
        date: '2024-01-15',
        time: '08:00',
        notes: '',
      },
    ];

    mockUseRecordsStore.mockReturnValue({
      records: recordsWithNotes,
      fields: mockFields,
      initializeFields: vi.fn(),
      loadRecords: mockLoadRecords,
      loadFields: mockLoadFields,
      addRecord: vi.fn(),
      updateRecord: mockUpdateRecord,
      deleteRecord: mockDeleteRecord,
      addField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      reorderFields: vi.fn(),
    });

    render(<RecordList />);

    await waitFor(() => {
      expect(screen.getByText('2024-01-15 08:00')).toBeInTheDocument();
    });
  });

  test('フィールドが見つからない場合も適切に処理される', async () => {
    const recordsWithUnknownField = [
      {
        id: '1',
        fieldId: 'unknown_field',
        value: 'test',
        date: '2024-01-15',
        time: '08:00',
        notes: '',
      },
    ];

    mockUseRecordsStore.mockReturnValue({
      records: recordsWithUnknownField,
      fields: mockFields,
      initializeFields: vi.fn(),
      loadRecords: mockLoadRecords,
      loadFields: mockLoadFields,
      addRecord: vi.fn(),
      updateRecord: mockUpdateRecord,
      deleteRecord: mockDeleteRecord,
      addField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      reorderFields: vi.fn(),
    });

    render(<RecordList />);

    await waitFor(() => {
      expect(
        screen.getByText(
          (content, element) => element?.textContent === '1件の記録グループ'
        )
      ).toBeInTheDocument();
    });
  });

  test('データ読み込みエラーが適切に処理される', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockLoadRecords.mockRejectedValue(new Error('データ読み込みエラー'));

    render(<RecordList />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Data loading error:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  test('レコードの並び替えが正しく機能する', async () => {
    render(<RecordList />);

    await waitFor(() => {
      const groups = screen.getAllByText(/2024-01-\d{2} 08:00/);
      // 新しい日付が上に来ることを確認
      expect(groups[0]).toHaveTextContent('2024-01-15 08:00');
      expect(groups[1]).toHaveTextContent('2024-01-14 08:00');
    });
  });
});
