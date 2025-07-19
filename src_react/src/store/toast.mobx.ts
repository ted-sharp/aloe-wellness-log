import { makeAutoObservable, runInAction, action, computed } from 'mobx';

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ミリ秒、undefinedの場合は自動消去しない
  timestamp?: number; // 作成時刻（パフォーマンス計測用）
}

// 型安全性のためのインターフェース
export interface ToastStoreState {
  toasts: Toast[];
}

export interface ToastDisplayOptions {
  showTimestamp?: boolean;
  maxToasts?: number;
  groupByType?: boolean;
}

// トーストIDを生成するヘルパー関数
const generateToastId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export class ToastStore {
  toasts: Toast[] = [];

  constructor() {
    makeAutoObservable(this, {
      // パフォーマンス最適化: アクションの明示的定義
      showToast: action,
      showSuccess: action,
      showError: action,
      showWarning: action,
      showInfo: action,
      removeToast: action,
      clearAll: action,
      // computed値
      hasToasts: computed,
      activeToasts: computed,
      errorToasts: computed,
      successToasts: computed,
      warningToasts: computed,
      infoToasts: computed,
      toastCounts: computed,
      oldestToast: computed,
      newestToast: computed,
      hasErrors: computed,
      hasWarnings: computed,
      toastSummary: computed,
    });
  }

  // Computed values for better state management
  get hasToasts(): boolean {
    return this.toasts.length > 0;
  }

  get activeToasts(): Toast[] {
    return this.toasts;
  }

  get errorToasts(): Toast[] {
    return this.toasts.filter(toast => toast.type === ToastType.ERROR);
  }

  // 追加のパフォーマンス最適化されたcomputed値
  get successToasts(): Toast[] {
    return this.toasts.filter(toast => toast.type === ToastType.SUCCESS);
  }

  get warningToasts(): Toast[] {
    return this.toasts.filter(toast => toast.type === ToastType.WARNING);
  }

  get infoToasts(): Toast[] {
    return this.toasts.filter(toast => toast.type === ToastType.INFO);
  }

  get toastCounts(): Record<ToastType, number> {
    const counts = {
      [ToastType.SUCCESS]: 0,
      [ToastType.ERROR]: 0,
      [ToastType.WARNING]: 0,
      [ToastType.INFO]: 0,
    };
    
    this.toasts.forEach(toast => {
      counts[toast.type]++;
    });
    
    return counts;
  }

  get oldestToast(): Toast | null {
    if (this.toasts.length === 0) return null;
    return this.toasts.reduce((oldest, current) => {
      const oldestTime = oldest.timestamp || 0;
      const currentTime = current.timestamp || 0;
      return currentTime < oldestTime ? current : oldest;
    });
  }

  get newestToast(): Toast | null {
    if (this.toasts.length === 0) return null;
    return this.toasts.reduce((newest, current) => {
      const newestTime = newest.timestamp || 0;
      const currentTime = current.timestamp || 0;
      return currentTime > newestTime ? current : newest;
    });
  }

  get hasErrors(): boolean {
    return this.errorToasts.length > 0;
  }

  get hasWarnings(): boolean {
    return this.warningToasts.length > 0;
  }

  get toastSummary(): {
    total: number;
    byType: Record<ToastType, number>;
    hasErrors: boolean;
    hasWarnings: boolean;
    oldest: Toast | null;
    newest: Toast | null;
  } {
    return {
      total: this.toasts.length,
      byType: this.toastCounts,
      hasErrors: this.hasErrors,
      hasWarnings: this.hasWarnings,
      oldest: this.oldestToast,
      newest: this.newestToast,
    };
  }

  showToast = (message: string, type: ToastType = ToastType.INFO, duration: number = 3000) => {
    const id = generateToastId();
    const newToast: Toast = {
      id,
      type,
      message,
      duration,
      timestamp: Date.now() // パフォーマンス計測のためのタイムスタンプ
    };

    this.toasts.push(newToast);

    // 自動削除の設定（durationが指定されている場合のみ）
    if (duration && duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }
  };

  showSuccess = (message: string, duration: number = 2000) => {
    this.showToast(message, ToastType.SUCCESS, duration);
  };

  showError = (message: string, duration: number = 5000) => {
    this.showToast(message, ToastType.ERROR, duration);
  };

  showWarning = (message: string, duration: number = 4000) => {
    this.showToast(message, ToastType.WARNING, duration);
  };

  showInfo = (message: string, duration: number = 3000) => {
    this.showToast(message, ToastType.INFO, duration);
  };

  removeToast = (id: string) => {
    runInAction(() => {
      this.toasts = this.toasts.filter(toast => toast.id !== id);
    });
  };

  clearAll = () => {
    this.toasts = [];
  };
}

// シングルトンインスタンス
export const toastStore = new ToastStore();

// React Hook（既存のコンポーネントとの互換性のため）
export const useToastStore = () => ({
  // 既存API（互換性維持）
  toasts: toastStore.toasts,
  showToast: toastStore.showToast,
  showSuccess: toastStore.showSuccess,
  showError: toastStore.showError,
  showWarning: toastStore.showWarning,
  showInfo: toastStore.showInfo,
  removeToast: toastStore.removeToast,
  clearAll: toastStore.clearAll,
  
  // 新しいAPI（ベストプラクティス）
  hasToasts: toastStore.hasToasts,
  activeToasts: toastStore.activeToasts,
  errorToasts: toastStore.errorToasts,
  successToasts: toastStore.successToasts,
  warningToasts: toastStore.warningToasts,
  infoToasts: toastStore.infoToasts,
  toastCounts: toastStore.toastCounts,
  hasErrors: toastStore.hasErrors,
  hasWarnings: toastStore.hasWarnings,
  toastSummary: toastStore.toastSummary,
});

// パフォーマンス最適化されたセレクターフック
export const useToasts = () => toastStore.toasts;
export const useToastActions = () => ({
  showToast: toastStore.showToast,
  showSuccess: toastStore.showSuccess,
  showError: toastStore.showError,
  showWarning: toastStore.showWarning,
  showInfo: toastStore.showInfo,
  removeToast: toastStore.removeToast,
  clearAll: toastStore.clearAll,
});

// 細かい粒度のセレクター（高パフォーマンス）
export const useToastsByType = (type: ToastType) => {
  switch (type) {
    case ToastType.ERROR:
      return toastStore.errorToasts;
    case ToastType.SUCCESS:
      return toastStore.successToasts;
    case ToastType.WARNING:
      return toastStore.warningToasts;
    case ToastType.INFO:
      return toastStore.infoToasts;
    default:
      return [];
  }
};

export const useToastCounts = () => toastStore.toastCounts;
export const useToastSummary = () => toastStore.toastSummary;
export const useHasErrors = () => toastStore.hasErrors;
export const useHasWarnings = () => toastStore.hasWarnings;

// 型安全なユーティリティ関数
export const isValidToastType = (type: string): type is ToastType => {
  return Object.values(ToastType).includes(type as ToastType);
};

export const createToast = (
  message: string, 
  type: ToastType = ToastType.INFO, 
  duration?: number
): Omit<Toast, 'id' | 'timestamp'> => {
  return {
    message,
    type,
    duration,
  };
};

export const getToastColor = (type: ToastType): string => {
  switch (type) {
    case ToastType.SUCCESS:
      return 'green';
    case ToastType.ERROR:
      return 'red';
    case ToastType.WARNING:
      return 'yellow';
    case ToastType.INFO:
    default:
      return 'blue';
  }
};