import '@testing-library/jest-dom';
import { vi } from 'vitest';
import i18n from '../i18n';

// モック実装
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IndexedDBのモック
const mockIDBFactory = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  databases: vi.fn(),
  cmp: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIDBFactory,
  writable: true,
});

// 日時のモック（テストの安定性のため）
const mockDate = new Date('2024-01-01T10:00:00.000Z');
vi.setSystemTime(mockDate);

beforeAll(async () => {
  await i18n.changeLanguage('ja');
});
