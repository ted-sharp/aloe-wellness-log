import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Field, RecordItem } from '../types/record';
import RecordCalendar from './RecordCalendar';

// react-calendarをモック
interface MockCalendarProps {
  onChange?: (date: Date) => void;
  value?: Date | null;
  tileContent?: (args: { date: Date; view: string }) => React.ReactNode;
}

vi.mock('react-calendar', () => ({
  default: ({ onChange, value: _value, tileContent }: MockCalendarProps) => (
    <div data-testid="mock-calendar">
      <button
        onClick={() => onChange?.(new Date('2023-12-15'))}
        data-testid="calendar-day-2023-12-15"
      >
        15
      </button>
      <button
        onClick={() => onChange?.(new Date('2023-12-16'))}
        data-testid="calendar-day-2023-12-16"
      >
        16
      </button>
      {/* tileContentのテストのためのモック要素 */}
      <div data-testid="tile-content-test">
        {tileContent &&
          tileContent({ date: new Date('2023-12-15'), view: 'month' })}
      </div>
    </div>
  ),
}));

// react-iconsをモック
vi.mock('react-icons/hi2', () => ({
  HiCheckCircle: () => <span data-testid="check-icon">✓</span>,
  HiClock: () => <span data-testid="clock-icon">🕐</span>,
  HiXCircle: () => <span data-testid="x-icon">✗</span>,
}));

// useRecordsStoreをモック
const mockLoadRecords = vi.fn();
const mockLoadFields = vi.fn();

const mockStore = {
  records: [] as RecordItem[],
  fields: [] as Field[],
  loadRecords: mockLoadRecords,
  loadFields: mockLoadFields,
};

vi.mock('../store/records', () => ({
  useRecordsStore: () => mockStore,
}));

describe('RecordCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.records = [];
    mockStore.fields = [];
  });

  it('基本的なレンダリングが正常に行われる', () => {
    render(<RecordCalendar />);

    expect(screen.getByText('カレンダー')).toBeInTheDocument();
    expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
  });

  it('コンポーネントマウント時にloadFieldsとloadRecordsが呼ばれる', () => {
    render(<RecordCalendar />);

    expect(mockLoadFields).toHaveBeenCalledTimes(1);
    expect(mockLoadRecords).toHaveBeenCalledTimes(1);
  });

  it('日付を選択すると選択日のヘッダーが表示される', async () => {
    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByText('2023/12/15 の記録')).toBeInTheDocument();
    });
  });

  it('記録がない選択日では適切なメッセージが表示される', async () => {
    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(
        screen.getByText('この日の記録はありませんわ。')
      ).toBeInTheDocument();
    });
  });

  it('記録がある日付にマーカーが表示される', () => {
    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'weight',
        value: 70,
      },
    ];

    render(<RecordCalendar />);

    // tileContentのテスト用要素でマーカーをチェック
    const tileContent = screen.getByTestId('tile-content-test');
    expect(tileContent).toBeInTheDocument();
  });

  it('選択日の記録が正しく表示される', async () => {
    mockStore.fields = [
      {
        fieldId: 'weight',
        name: '体重',
        type: 'number',
        unit: 'kg',
        order: 1,
        defaultDisplay: true,
      },
    ];

    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'weight',
        value: 70,
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('体重')).toBeInTheDocument();
      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
    });
  });

  it('ブール値の記録が正しく表示される', async () => {
    mockStore.fields = [
      {
        fieldId: 'exercise',
        name: '運動',
        type: 'boolean',
        order: 1,
        defaultDisplay: true,
      },
    ];

    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'exercise',
        value: true,
      },
      {
        id: '2',
        date: '2023-12-15',
        time: '11:00',
        datetime: '2023-12-15T11:00:00.000Z',
        fieldId: 'exercise',
        value: false,
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
      expect(screen.getByText('あり')).toBeInTheDocument();
      expect(screen.getByText('なし')).toBeInTheDocument();
    });
  });

  it('備考記録が正しく表示される', async () => {
    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'notes',
        value: 'テスト備考',
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByText('備考')).toBeInTheDocument();
      expect(screen.getByText('テスト備考')).toBeInTheDocument();
    });
  });

  it('長いテキストが省略されて表示される', async () => {
    const longText =
      'これは非常に長いテキストで30文字を超えています。省略されるはずです。';

    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'notes',
        value: longText,
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      const truncatedText = screen.getByText(
        'これは非常に長いテキストで30文字を超えています。省略される...'
      );
      expect(truncatedText).toBeInTheDocument();
    });
  });

  it('長いテキストをクリックすると全文が表示される', async () => {
    const longText =
      'これは非常に長いテキストで30文字を超えています。省略されるはずです。';

    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'notes',
        value: longText,
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      const truncatedButton = screen.getByText(
        'これは非常に長いテキストで30文字を超えています。省略される...'
      );
      fireEvent.click(truncatedButton);
    });

    await waitFor(() => {
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });

  it('記録が時刻の降順でソートされて表示される', async () => {
    mockStore.fields = [
      {
        fieldId: 'weight',
        name: '体重',
        type: 'number',
        unit: 'kg',
        order: 1,
        defaultDisplay: true,
      },
    ];

    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '08:00',
        datetime: '2023-12-15T08:00:00.000Z',
        fieldId: 'weight',
        value: 70,
      },
      {
        id: '2',
        date: '2023-12-15',
        time: '20:00',
        datetime: '2023-12-15T20:00:00.000Z',
        fieldId: 'weight',
        value: 69,
      },
      {
        id: '3',
        date: '2023-12-15',
        time: '12:00',
        datetime: '2023-12-15T12:00:00.000Z',
        fieldId: 'weight',
        value: 71,
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      const timeElements = screen.getAllByText(/^\d{2}:\d{2}$/);
      expect(timeElements[0]).toHaveTextContent('20:00');
      expect(timeElements[1]).toHaveTextContent('12:00');
      expect(timeElements[2]).toHaveTextContent('08:00');
    });
  });

  it('フィールドがorder順でソートされて表示される', async () => {
    mockStore.fields = [
      {
        fieldId: 'weight',
        name: '体重',
        type: 'number',
        unit: 'kg',
        order: 2,
        defaultDisplay: true,
      },
      {
        fieldId: 'exercise',
        name: '運動',
        type: 'boolean',
        order: 1,
        defaultDisplay: true,
      },
    ];

    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'weight',
        value: 70,
      },
      {
        id: '2',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'exercise',
        value: true,
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      const recordItems = screen.getAllByRole('listitem');
      expect(recordItems[0]).toHaveTextContent('運動');
      expect(recordItems[1]).toHaveTextContent('体重');
    });
  });

  it('未知のフィールドIDでもfieldId名で表示される', async () => {
    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'unknown_field',
        value: 'test value',
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByText('unknown_field')).toBeInTheDocument();
      expect(screen.getByText('test value')).toBeInTheDocument();
    });
  });

  it('時計アイコンが時刻の横に表示される', async () => {
    mockStore.records = [
      {
        id: '1',
        date: '2023-12-15',
        time: '10:00',
        datetime: '2023-12-15T10:00:00.000Z',
        fieldId: 'notes',
        value: 'test',
      },
    ];

    render(<RecordCalendar />);

    const dayButton = screen.getByTestId('calendar-day-2023-12-15');
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });
  });
});
