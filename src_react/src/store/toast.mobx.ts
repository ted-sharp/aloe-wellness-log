import { makeAutoObservable, runInAction } from 'mobx';

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
}

// トーストIDを生成するヘルパー関数
const generateToastId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export class ToastStore {
  toasts: Toast[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  showToast = (message: string, type: ToastType = ToastType.INFO, duration: number = 3000) => {
    const id = generateToastId();
    const newToast: Toast = {
      id,
      type,
      message,
      duration
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
  toasts: toastStore.toasts,
  showToast: toastStore.showToast,
  showSuccess: toastStore.showSuccess,
  showError: toastStore.showError,
  showWarning: toastStore.showWarning,
  showInfo: toastStore.showInfo,
  removeToast: toastStore.removeToast,
  clearAll: toastStore.clearAll,
});