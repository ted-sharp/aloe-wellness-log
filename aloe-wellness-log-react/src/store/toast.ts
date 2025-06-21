import { create } from 'zustand';

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

interface ToastState {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// トーストIDを生成するヘルパー関数
const generateToastId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (message: string, type: ToastType = ToastType.INFO, duration: number = 3000) => {
    const id = generateToastId();
    const newToast: Toast = {
      id,
      type,
      message,
      duration
    };

    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));

    // 自動削除の設定（durationが指定されている場合のみ）
    if (duration && duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  showSuccess: (message: string, duration: number = 2000) => {
    get().showToast(message, ToastType.SUCCESS, duration);
  },

  showError: (message: string, duration: number = 5000) => {
    get().showToast(message, ToastType.ERROR, duration);
  },

  showWarning: (message: string, duration: number = 4000) => {
    get().showToast(message, ToastType.WARNING, duration);
  },

  showInfo: (message: string, duration: number = 3000) => {
    get().showToast(message, ToastType.INFO, duration);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  }
}));
