import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database functions
vi.mock('../../../db', () => ({
  getAllWeightRecords: vi.fn(),
  getAllBpRecords: vi.fn(),
  getAllDailyRecords: vi.fn(),
  getAllDailyFields: vi.fn(),
}));

// Mock DOM APIs
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('useDataExportLogic (unit tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.createElement
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    
    global.document.createElement = vi.fn(() => mockAnchor as any);
  });

  describe('formatDateForFilename', () => {
    it('should format date for filename', () => {
      const date = new Date('2024-01-15T10:30:45');
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const formatted = `${year}${month}${day}${hours}${minutes}${seconds}`;
      
      expect(formatted).toBe('20240115103045');
    });
  });

  describe('downloadFile', () => {
    it('should create download link and trigger download', () => {
      const mockBlob = new Blob(['test data'], { type: 'text/plain' });
      const filename = 'test-file.txt';
      
      const url = URL.createObjectURL(mockBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });

  describe('JSON data structure', () => {
    it('should create proper JSON structure', () => {
      const mockData = {
        weightRecords: [
          {
            date: '2024-01-01',
            time: '08:00',
            weight: 70.5,
            bodyFat: 15.2,
            waist: 85.0,
            note: 'Morning',
            excludeFromGraph: false,
          },
        ],
        bpRecords: [],
        dailyRecords: [],
        dailyFields: [],
      };
      
      const json = JSON.stringify(mockData, null, 2);
      const parsed = JSON.parse(json);
      
      expect(parsed).toEqual(mockData);
      expect(parsed.weightRecords).toHaveLength(1);
      expect(parsed.weightRecords[0].weight).toBe(70.5);
    });
  });
});