// LocalStorage Keys (centralized)
export const STORAGE_KEYS = {
  disableTips: 'disableTips',
  lastTipsDate: 'lastTipsDate',
  shownTipIndices: 'shownTipIndices_v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
