import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastStore, ToastType } from './toast.mobx';

describe('ToastStore (MobX)', () => {
  let store: ToastStore;

  beforeEach(() => {
    store = new ToastStore();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初期化', () => {
    it('初期状態では空の配列', () => {
      expect(store.toasts).toEqual([]);
    });
  });

  describe('showToast', () => {
    it('トーストを追加できる', () => {
      store.showToast('テストメッセージ', ToastType.INFO, 3000);
      
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].message).toBe('テストメッセージ');
      expect(store.toasts[0].type).toBe(ToastType.INFO);
      expect(store.toasts[0].duration).toBe(3000);
      expect(store.toasts[0].id).toBeDefined();
    });

    it('自動削除が設定される', () => {
      store.showToast('テストメッセージ', ToastType.INFO, 1000);
      
      expect(store.toasts).toHaveLength(1);
      
      // 1秒後に削除される
      vi.advanceTimersByTime(1000);
      
      expect(store.toasts).toHaveLength(0);
    });

    it('duration が 0 の場合は自動削除されない', () => {
      store.showToast('テストメッセージ', ToastType.INFO, 0);
      
      expect(store.toasts).toHaveLength(1);
      
      // 時間が経過しても削除されない
      vi.advanceTimersByTime(5000);
      
      expect(store.toasts).toHaveLength(1);
    });
  });

  describe('ショートカットメソッド', () => {
    it('showSuccess は成功トーストを表示する', () => {
      store.showSuccess('成功メッセージ', 2000);
      
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].type).toBe(ToastType.SUCCESS);
      expect(store.toasts[0].message).toBe('成功メッセージ');
      expect(store.toasts[0].duration).toBe(2000);
    });

    it('showError はエラートーストを表示する', () => {
      store.showError('エラーメッセージ', 5000);
      
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].type).toBe(ToastType.ERROR);
      expect(store.toasts[0].message).toBe('エラーメッセージ');
      expect(store.toasts[0].duration).toBe(5000);
    });

    it('showWarning は警告トーストを表示する', () => {
      store.showWarning('警告メッセージ', 4000);
      
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].type).toBe(ToastType.WARNING);
      expect(store.toasts[0].message).toBe('警告メッセージ');
      expect(store.toasts[0].duration).toBe(4000);
    });

    it('showInfo は情報トーストを表示する', () => {
      store.showInfo('情報メッセージ', 3000);
      
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].type).toBe(ToastType.INFO);
      expect(store.toasts[0].message).toBe('情報メッセージ');
      expect(store.toasts[0].duration).toBe(3000);
    });
  });

  describe('removeToast', () => {
    it('指定したIDのトーストを削除できる', () => {
      store.showToast('メッセージ1', ToastType.INFO, 0);
      store.showToast('メッセージ2', ToastType.INFO, 0);
      
      expect(store.toasts).toHaveLength(2);
      
      const firstToastId = store.toasts[0].id;
      store.removeToast(firstToastId);
      
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0].message).toBe('メッセージ2');
    });

    it('存在しないIDを指定しても何もしない', () => {
      store.showToast('メッセージ', ToastType.INFO, 0);
      
      expect(store.toasts).toHaveLength(1);
      
      store.removeToast('non-existent-id');
      
      expect(store.toasts).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('すべてのトーストを削除できる', () => {
      store.showToast('メッセージ1', ToastType.INFO, 0);
      store.showToast('メッセージ2', ToastType.ERROR, 0);
      store.showToast('メッセージ3', ToastType.WARNING, 0);
      
      expect(store.toasts).toHaveLength(3);
      
      store.clearAll();
      
      expect(store.toasts).toHaveLength(0);
    });
  });

  describe('複数トースト管理', () => {
    it('複数のトーストを同時に管理できる', () => {
      store.showSuccess('成功', 1000);
      store.showError('エラー', 2000);
      store.showWarning('警告', 3000);
      
      expect(store.toasts).toHaveLength(3);
      
      // 1秒後に成功トーストが削除
      vi.advanceTimersByTime(1000);
      expect(store.toasts).toHaveLength(2);
      
      // さらに1秒後にエラートーストが削除
      vi.advanceTimersByTime(1000);
      expect(store.toasts).toHaveLength(1);
      
      // さらに1秒後に警告トーストが削除
      vi.advanceTimersByTime(1000);
      expect(store.toasts).toHaveLength(0);
    });
  });
});