import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastType, toastStore } from '../toast.mobx';

describe('toastStore actionable toast', () => {
  beforeEach(() => {
    toastStore.clearAll();
  });

  it('shows an actionable toast and triggers action then removes itself', () => {
    const onAction = vi.fn();

    toastStore.showActionableToast(
      '新しいバージョンがあります。再読み込みで最新に更新できます。',
      '再読み込み',
      onAction,
      ToastType.INFO
    );

    expect(toastStore.toasts).toHaveLength(1);
    const t = toastStore.toasts[0];
    expect(t.message).toContain('新しいバージョン');
    expect(t.duration).toBeUndefined();
    expect(t.action?.label).toBe('再読み込み');

    // simulate click
    t.action?.onClick();
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(toastStore.toasts).toHaveLength(0);
  });
});
