import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateStore } from './date.mobx';

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

// グローバルオブジェクトのモック
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('DateStore (MobX)', () => {
  let store: DateStore;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    // 現在日時を固定
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15'));
    store = new DateStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初期化', () => {
    it('初期状態では今日の日付が設定される', () => {
      expect(store.selectedDate).toBe('2024-01-15');
      expect(store.centerDate).toBe('2024-01-15');
      expect(store.today).toBe('2024-01-15');
    });
  });

  describe('setSelectedDate', () => {
    it('有効な日付を設定できる', () => {
      store.setSelectedDate('2024-01-20');
      
      expect(store.selectedDate).toBe('2024-01-20');
      expect(store.centerDate).toBe('2024-01-20');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'selectedDate',
        '2024-01-20'
      );
    });

    it('無効な日付は設定されない', () => {
      const originalDate = store.selectedDate;
      store.setSelectedDate('invalid-date');
      
      expect(store.selectedDate).toBe(originalDate);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('setCenterDate', () => {
    it('有効な日付を設定できる', () => {
      store.setCenterDate('2024-01-10');
      
      expect(store.centerDate).toBe('2024-01-10');
      // centerDate はローカルストレージに保存されない
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('無効な日付は設定されない', () => {
      const originalDate = store.centerDate;
      store.setCenterDate('invalid-date');
      
      expect(store.centerDate).toBe(originalDate);
    });
  });

  describe('setToday', () => {
    it('今日の日付を更新できる', () => {
      vi.setSystemTime(new Date('2024-01-20'));
      
      store.setToday();
      
      expect(store.today).toBe('2024-01-20');
    });
  });

  describe('initializeFromStorage', () => {
    it('有効な保存日付を復元する', () => {
      localStorageMock.getItem.mockReturnValue('2024-01-10');
      
      store.initializeFromStorage();
      
      expect(store.selectedDate).toBe('2024-01-10');
      expect(store.centerDate).toBe('2024-01-10');
    });

    it('無効な保存日付はクリアされる', () => {
      localStorageMock.getItem.mockReturnValue('invalid-date');
      
      store.initializeFromStorage();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('selectedDate');
    });

    it('保存データがない場合は何もしない', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const originalSelected = store.selectedDate;
      store.initializeFromStorage();
      
      expect(store.selectedDate).toBe(originalSelected);
    });
  });

  describe('computed プロパティ', () => {
    it('isSelectedDateToday は選択日付が今日かどうかを正しく判定する', () => {
      // 今日を選択
      store.setSelectedDate('2024-01-15');
      expect(store.isSelectedDateToday).toBe(true);
      
      // 別の日を選択
      store.setSelectedDate('2024-01-10');
      expect(store.isSelectedDateToday).toBe(false);
    });
  });

  describe('日付判定メソッド', () => {
    it('isToday は正しく今日かどうかを判定する', () => {
      expect(store.isToday('2024-01-15')).toBe(true);
      expect(store.isToday('2024-01-10')).toBe(false);
    });

    it('isPast は正しく過去かどうかを判定する', () => {
      expect(store.isPast('2024-01-10')).toBe(true);
      expect(store.isPast('2024-01-20')).toBe(false);
    });

    it('isFuture は正しく未来かどうかを判定する', () => {
      expect(store.isFuture('2024-01-20')).toBe(true);
      expect(store.isFuture('2024-01-10')).toBe(false);
    });
  });

  describe('formatSelectedDate', () => {
    beforeEach(() => {
      store.setSelectedDate('2024-01-15');
    });

    it('iso 形式でフォーマットできる', () => {
      expect(store.formatSelectedDate('iso')).toBe('2024-01-15');
    });

    it('short 形式でフォーマットできる', () => {
      expect(store.formatSelectedDate('short')).toBe('2024-01-15');
    });

    it('デフォルトは short 形式', () => {
      expect(store.formatSelectedDate()).toBe('2024-01-15');
    });
  });
});