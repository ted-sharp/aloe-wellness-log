import { create } from 'zustand';
import { formatDate, SELECTED_DATE_KEY } from '../utils/dateUtils';

// 今日の日付をYYYY-MM-DD形式で取得するヘルパー関数
const getTodayDate = (): string => {
  return formatDate(new Date());
};

/**
 * 日付選択状態の型定義
 */
export interface DateState {
  // 現在選択されている日付
  selectedDate: string;
  
  // スクロール中心位置の日付
  centerDate: string;
  
  // 今日の日付（参照用）
  today: string;
  
  // アクション
  setSelectedDate: (date: string) => void;
  setCenterDate: (date: string) => void;
  setToday: () => void;
  initializeFromStorage: () => void;
  
  // ヘルパー関数
  isToday: (date?: string) => boolean;
  isPast: (date: string) => boolean;
  isFuture: (date: string) => boolean;
  formatSelectedDate: (format?: 'short' | 'long' | 'iso') => string;
}

/**
 * 日付選択グローバルストア
 * 
 * 全記録ページで共有される日付選択状態を管理します。
 * ローカルストレージとの同期により、ページ遷移時にも選択状態を保持します。
 */
export const useDateStore = create<DateState>((set, get) => ({
  // 初期状態
  selectedDate: getTodayDate(),
  centerDate: getTodayDate(),
  today: getTodayDate(),
  
  /**
   * 選択日付の変更
   * ローカルストレージに自動保存
   */
  setSelectedDate: (date: string) => {
    try {
      // 日付の有効性チェック
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date provided to setSelectedDate:', date);
        return;
      }
      
      // ローカルストレージに保存
      localStorage.setItem(SELECTED_DATE_KEY, date);
      
      // ストア状態更新
      set(() => ({
        selectedDate: date,
        centerDate: date, // 選択日付変更時は中心位置も同期
      }));
      
      // デバッグログ（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log('📅 Date selected:', date);
      }
    } catch (error) {
      console.error('Failed to set selected date:', error);
    }
  },
  
  /**
   * 中心日付の変更
   * スクロール位置の管理用（ローカルストレージには保存しない）
   */
  setCenterDate: (date: string) => {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date provided to setCenterDate:', date);
        return;
      }
      
      set({ centerDate: date });
    } catch (error) {
      console.error('Failed to set center date:', error);
    }
  },
  
  /**
   * 今日の日付を再設定
   * 日付変更時やアプリ復帰時に呼び出し
   */
  setToday: () => {
    const today = getTodayDate();
    set({ today });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📅 Today updated to:', today);
    }
  },
  
  /**
   * ローカルストレージから選択日付を復元
   * アプリ初期化時に呼び出し
   */
  initializeFromStorage: () => {
    try {
      const savedDate = localStorage.getItem(SELECTED_DATE_KEY);
      
      if (savedDate) {
        const dateObj = new Date(savedDate);
        
        // 保存された日付が有効な場合のみ復元
        if (!isNaN(dateObj.getTime())) {
          set({
            selectedDate: savedDate,
            centerDate: savedDate,
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log('📅 Date restored from storage:', savedDate);
          }
        } else {
          // 無効な日付の場合はローカルストレージをクリア
          localStorage.removeItem(SELECTED_DATE_KEY);
          console.warn('Invalid date found in storage, reset to today');
        }
      }
    } catch (error) {
      console.error('Failed to initialize date from storage:', error);
      // エラー時はローカルストレージをクリア
      try {
        localStorage.removeItem(SELECTED_DATE_KEY);
      } catch (clearError) {
        console.error('Failed to clear invalid date from storage:', clearError);
      }
    }
  },
  
  /**
   * 指定日付が今日かどうかを判定
   */
  isToday: (date?: string) => {
    const checkDate = date || get().selectedDate;
    return checkDate === get().today;
  },
  
  /**
   * 指定日付が過去かどうかを判定
   */
  isPast: (date: string) => {
    return date < get().today;
  },
  
  /**
   * 指定日付が未来かどうかを判定
   */
  isFuture: (date: string) => {
    return date > get().today;
  },
  
  /**
   * 選択日付を指定形式でフォーマット
   */
  formatSelectedDate: (format: 'short' | 'long' | 'iso' = 'short') => {
    const { selectedDate } = get();
    
    switch (format) {
      case 'iso':
        return selectedDate;
      case 'long':
        return new Date(selectedDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
      case 'short':
      default:
        return selectedDate;
    }
  },
}));

/**
 * 日付ストアのセレクター関数
 * コンポーネントで特定の値のみを監視したい場合に使用
 */
export const useDateSelectors = {
  /**
   * 選択日付のみを取得
   */
  selectedDate: () => useDateStore(state => state.selectedDate),
  
  /**
   * 中心日付のみを取得
   */
  centerDate: () => useDateStore(state => state.centerDate),
  
  /**
   * 今日の日付のみを取得
   */
  today: () => useDateStore(state => state.today),
  
  /**
   * 選択日付が今日かどうかのみを取得
   */
  isSelectedDateToday: () => useDateStore(state => state.isToday()),
  
  /**
   * 日付変更アクションのみを取得
   */
  actions: () => useDateStore(state => ({
    setSelectedDate: state.setSelectedDate,
    setCenterDate: state.setCenterDate,
    setToday: state.setToday,
  })),
};

/**
 * 日付ストアの初期化ヘルパー
 * アプリケーション起動時に呼び出し
 */
export const initializeDateStore = () => {
  const store = useDateStore.getState();
  
  // 今日の日付を設定
  store.setToday();
  
  // ローカルストレージから復元
  store.initializeFromStorage();
  
  // 日付変更の監視を設定（1日1回）
  const checkDateChange = () => {
    const currentToday = getTodayDate();
    const storeToday = useDateStore.getState().today;
    
    if (currentToday !== storeToday) {
      useDateStore.getState().setToday();
    }
  };
  
  // 1時間ごとに日付変更をチェック
  const intervalId = setInterval(checkDateChange, 60 * 60 * 1000);
  
  // クリーンアップ関数を返す
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * デバッグ用のストア状態ダンプ
 * 開発環境でのデバッグに使用
 */
export const debugDateStore = () => {
  if (process.env.NODE_ENV === 'development') {
    const state = useDateStore.getState();
    console.log('📅 Date Store State:', {
      selectedDate: state.selectedDate,
      centerDate: state.centerDate,
      today: state.today,
      isToday: state.isToday(),
      isPast: state.isPast(state.selectedDate),
      isFuture: state.isFuture(state.selectedDate),
      formattedDate: state.formatSelectedDate(),
    });
  }
};