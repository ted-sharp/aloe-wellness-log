import { beforeEach, describe, expect, it, vi } from 'vitest';

// 簡易に App.tsx のローテーション仕様と同等の関数を再現（ユニット観点で検証）
const tipsList = ['a', 'b', 'c', 'd'];
const SHOWN_TIPS_KEY = 'shownTipIndices_v1';

const getShownTipIndices = (): number[] => {
  try {
    const raw = localStorage.getItem(SHOWN_TIPS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const arr = Array.isArray(data)
      ? data
      : data && Array.isArray(data.indices)
      ? data.indices
      : [];
    return (arr as unknown[])
      .map(n => (typeof n === 'number' ? n : Number.NaN))
      .filter(n => Number.isInteger(n) && n >= 0 && n < tipsList.length);
  } catch {
    return [];
  }
};

const saveShownTipIndices = (indices: number[]) => {
  localStorage.setItem(SHOWN_TIPS_KEY, JSON.stringify(indices));
};

const pickNextTipIndex = (): number => {
  const shown = getShownTipIndices();
  const all = Array.from({ length: tipsList.length }, (_, i) => i);
  const unseen = all.filter(i => !shown.includes(i));
  const pool = unseen.length > 0 ? unseen : all;
  if (unseen.length === 0) {
    // 全件表示済み → リセット
    saveShownTipIndices([]);
  }
  const idx = pool[Math.floor(Math.random() * pool.length)];
  const base = unseen.length > 0 ? shown : [];
  saveShownTipIndices([...base, idx]);
  return idx;
};

describe('TIPS rotation logic', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0); // 決定的にする
  });

  it('picks from unseen first and records index', () => {
    const idx = pickNextTipIndex();
    expect(idx).toBe(0);
    expect(JSON.parse(localStorage.getItem(SHOWN_TIPS_KEY) || '[]')).toEqual([
      0,
    ]);
  });

  it('does not duplicate until all seen, then resets', () => {
    // 1回目
    pickNextTipIndex();
    // 2回目
    pickNextTipIndex();
    // 3回目
    pickNextTipIndex();
    // 4回目（この時点で unseen が空 → リセット → pool は all）
    pickNextTipIndex();

    // 直前の保存で base は [] に戻る想定
    const saved = JSON.parse(localStorage.getItem(SHOWN_TIPS_KEY) || '[]');
    expect(Array.isArray(saved)).toBe(true);
    expect(saved.length).toBe(1);
  });

  it('lastTipsDate does not change during reset (not managed here)', () => {
    localStorage.setItem('lastTipsDate', '2099-01-01');
    pickNextTipIndex();
    localStorage.removeItem(SHOWN_TIPS_KEY); // 管理画面のリセットに相当
    expect(localStorage.getItem('lastTipsDate')).toBe('2099-01-01');
  });
});
