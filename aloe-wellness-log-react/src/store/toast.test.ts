import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToastStore, ToastType } from './toast';

describe('toast store', () => {
  beforeEach(() => {
    // 各テスト前にstoreをリセット
    useToastStore.setState({ toasts: [] });
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('初期状態では空のtoasts配列を持つ', () => {
      const { toasts } = useToastStore.getState();
      expect(toasts).toEqual([]);
    });
  });

  describe('showSuccess', () => {
    it('成功メッセージを追加する', () => {
      const { showSuccess } = useToastStore.getState();

      showSuccess('テスト成功メッセージ');

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({
        type: ToastType.SUCCESS,
        message: 'テスト成功メッセージ',
      });
      expect(toasts[0].id).toBeDefined();
    });

        it('2秒後に自動的に削除される', () => {
      const { showSuccess } = useToastStore.getState();

      showSuccess('自動削除テスト');

      expect(useToastStore.getState().toasts).toHaveLength(1);

      // 2秒経過
      vi.advanceTimersByTime(2000);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('showError', () => {
    it('エラーメッセージを追加する', () => {
      const { showError } = useToastStore.getState();

      showError('テストエラーメッセージ');

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({
        type: ToastType.ERROR,
        message: 'テストエラーメッセージ',
      });
    });

        it('エラーは5秒後に自動削除される', () => {
      const { showError } = useToastStore.getState();

      showError('長時間表示エラー');

      expect(useToastStore.getState().toasts).toHaveLength(1);

      // 2秒では削除されない
      vi.advanceTimersByTime(2000);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      // 5秒で削除される
      vi.advanceTimersByTime(3000);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('showWarning', () => {
    it('警告メッセージを追加する', () => {
      const { showWarning } = useToastStore.getState();

      showWarning('テスト警告メッセージ');

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({
        type: ToastType.WARNING,
        message: 'テスト警告メッセージ',
      });
    });
  });

  describe('showInfo', () => {
    it('情報メッセージを追加する', () => {
      const { showInfo } = useToastStore.getState();

      showInfo('テスト情報メッセージ');

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({
        type: ToastType.INFO,
        message: 'テスト情報メッセージ',
      });
    });
  });

  describe('removeToast', () => {
    it('指定したIDのtoastを削除する', () => {
      const { showSuccess, removeToast } = useToastStore.getState();

      showSuccess('削除テスト1');
      showSuccess('削除テスト2');

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(2);

      const firstToastId = toasts[0].id;
      removeToast(firstToastId);

      const remainingToasts = useToastStore.getState().toasts;
      expect(remainingToasts).toHaveLength(1);
      expect(remainingToasts[0].message).toBe('削除テスト2');
    });

    it('存在しないIDの削除は無効果', () => {
      const { showSuccess, removeToast } = useToastStore.getState();

      showSuccess('削除テスト');

      expect(useToastStore.getState().toasts).toHaveLength(1);

      removeToast('存在しないID');

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

    describe('clearAll', () => {
    it('全てのtoastを削除する', () => {
      const { showSuccess, showError, showWarning, clearAll } = useToastStore.getState();

      showSuccess('成功1');
      showError('エラー1');
      showWarning('警告1');

      expect(useToastStore.getState().toasts).toHaveLength(3);

      clearAll();

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('複数toast管理', () => {
    it('複数のtoastを同時に管理できる', () => {
      const { showSuccess, showError, showWarning, showInfo } = useToastStore.getState();

      showSuccess('成功メッセージ');
      showError('エラーメッセージ');
      showWarning('警告メッセージ');
      showInfo('情報メッセージ');

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(4);

      // 各種類のtoastが含まれている
      expect(toasts.some(t => t.type === ToastType.SUCCESS)).toBe(true);
      expect(toasts.some(t => t.type === ToastType.ERROR)).toBe(true);
      expect(toasts.some(t => t.type === ToastType.WARNING)).toBe(true);
      expect(toasts.some(t => t.type === ToastType.INFO)).toBe(true);
    });

        it('古いtoastから順番に自動削除される', () => {
      const { showSuccess } = useToastStore.getState();

      showSuccess('1番目');

      // 1秒後に2番目追加
      vi.advanceTimersByTime(1000);
      showSuccess('2番目');

      // さらに1秒後に3番目追加（合計2秒経過）
      vi.advanceTimersByTime(1000);
      showSuccess('3番目');

      expect(useToastStore.getState().toasts).toHaveLength(3);

      // さらに1秒経過（1番目が2秒に到達）
      vi.advanceTimersByTime(1000);

      const remainingToasts = useToastStore.getState().toasts;
      expect(remainingToasts).toHaveLength(2);
      expect(remainingToasts.some(t => t.message === '1番目')).toBe(false);
      expect(remainingToasts.some(t => t.message === '2番目')).toBe(true);
      expect(remainingToasts.some(t => t.message === '3番目')).toBe(true);
    });
  });

  describe('ID生成', () => {
    it('各toastが一意のIDを持つ', () => {
      const { showSuccess } = useToastStore.getState();

      showSuccess('テスト1');
      showSuccess('テスト2');
      showSuccess('テスト3');

      const { toasts } = useToastStore.getState();
      const ids = toasts.map(t => t.id);

      // 重複がないことを確認
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toHaveLength(3);
    });
  });
});
