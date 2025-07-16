import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getAllWeightRecords, 
  getAllBpRecords, 
  getAllDailyRecords, 
  getAllDailyFields 
} from '../../../db';
import { useDataExportLogic } from '../useDataExportLogic';

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

describe('useDataExportLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.createElement
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    
    global.document.createElement = vi.fn(() => mockAnchor);
  });

  describe('formatDateForFilename', () => {
    it('should format date for filename', () => {
      // Test the function directly without React rendering
      const logic = useDataExportLogic();
      const date = new Date('2024-01-15T10:30:45');
      const formatted = logic.formatDateForFilename(date);
      
      expect(formatted).toBe('20240115103045');
    });
  });

  describe('downloadFile', () => {
    it('should create download link and trigger download', () => {
      const { result } = renderHook(() => useDataExportLogic());
      
      const mockBlob = new Blob(['test data'], { type: 'text/plain' });
      const filename = 'test-file.txt';
      
      result.current.downloadFile(mockBlob, filename);
      
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });

  describe('getAllData', () => {
    it('should fetch all data from database', async () => {
      const { result } = renderHook(() => useDataExportLogic());
      
      const mockWeightRecords = [{ id: '1', weight: 70 }];
      const mockBpRecords = [{ id: '2', systolic: 120 }];
      const mockDailyRecords = [{ id: '3', value: 1 }];
      const mockDailyFields = [{ id: '4', name: 'exercise' }];
      
      const { getAllWeightRecords, getAllBpRecords, getAllDailyRecords, getAllDailyFields } = await import('../../../db');
      
      vi.mocked(getAllWeightRecords).mockResolvedValue(mockWeightRecords);
      vi.mocked(getAllBpRecords).mockResolvedValue(mockBpRecords);
      vi.mocked(getAllDailyRecords).mockResolvedValue(mockDailyRecords);
      vi.mocked(getAllDailyFields).mockResolvedValue(mockDailyFields);
      
      const data = await result.current.getAllData();
      
      expect(data).toEqual({
        weightRecords: mockWeightRecords,
        bpRecords: mockBpRecords,
        dailyRecords: mockDailyRecords,
        dailyFields: mockDailyFields,
      });
    });
  });

  describe('exportAsJSON', () => {
    it('should export data as JSON', async () => {
      const { result } = renderHook(() => useDataExportLogic());
      
      const mockData = {
        weightRecords: [{ id: '1', weight: 70 }],
        bpRecords: [{ id: '2', systolic: 120 }],
        dailyRecords: [{ id: '3', value: 1 }],
        dailyFields: [{ id: '4', name: 'exercise' }],
      };
      
      const { getAllWeightRecords, getAllBpRecords, getAllDailyRecords, getAllDailyFields } = await import('../../../db');
      
      vi.mocked(getAllWeightRecords).mockResolvedValue(mockData.weightRecords);
      vi.mocked(getAllBpRecords).mockResolvedValue(mockData.bpRecords);
      vi.mocked(getAllDailyRecords).mockResolvedValue(mockData.dailyRecords);
      vi.mocked(getAllDailyFields).mockResolvedValue(mockData.dailyFields);
      
      const mockOnStatusChange = vi.fn();
      
      await result.current.exportAsJSON(mockOnStatusChange);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith('データをエクスポート中...');
      expect(mockOnStatusChange).toHaveBeenCalledWith('JSONエクスポートが完了しました');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle export errors', async () => {
      const { result } = renderHook(() => useDataExportLogic());
      
      const { getAllWeightRecords } = await import('../../../db');
      vi.mocked(getAllWeightRecords).mockRejectedValue(new Error('Database error'));
      
      const mockOnStatusChange = vi.fn();
      
      await result.current.exportAsJSON(mockOnStatusChange);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith('データをエクスポート中...');
      expect(mockOnStatusChange).toHaveBeenCalledWith('エクスポートエラー: Database error');
    });
  });

  describe('exportAsCSV', () => {
    it('should export data as CSV files', async () => {
      const { result } = renderHook(() => useDataExportLogic());
      
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
        bpRecords: [
          {
            date: '2024-01-01',
            time: '08:00',
            systolic: 120,
            diastolic: 80,
            heartRate: 70,
            note: 'Normal',
            excludeFromGraph: false,
          },
        ],
        dailyRecords: [
          {
            date: '2024-01-01',
            fieldId: 'exercise',
            value: 1,
          },
        ],
        dailyFields: [
          {
            fieldId: 'exercise',
            name: 'Exercise',
          },
        ],
      };
      
      const { getAllWeightRecords, getAllBpRecords, getAllDailyRecords, getAllDailyFields } = await import('../../../db');
      
      vi.mocked(getAllWeightRecords).mockResolvedValue(mockData.weightRecords);
      vi.mocked(getAllBpRecords).mockResolvedValue(mockData.bpRecords);
      vi.mocked(getAllDailyRecords).mockResolvedValue(mockData.dailyRecords);
      vi.mocked(getAllDailyFields).mockResolvedValue(mockData.dailyFields);
      
      const mockOnStatusChange = vi.fn();
      
      await result.current.exportAsCSV(mockOnStatusChange);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith('CSVエクスポート中...');
      expect(mockOnStatusChange).toHaveBeenCalledWith('CSVエクスポートが完了しました');
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(3); // 3 CSV files
    });

    it('should handle CSV export errors', async () => {
      const { result } = renderHook(() => useDataExportLogic());
      
      const { getAllWeightRecords } = await import('../../../db');
      vi.mocked(getAllWeightRecords).mockRejectedValue(new Error('CSV export error'));
      
      const mockOnStatusChange = vi.fn();
      
      await result.current.exportAsCSV(mockOnStatusChange);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith('CSVエクスポート中...');
      expect(mockOnStatusChange).toHaveBeenCalledWith('CSVエクスポートエラー: CSV export error');
    });

    it('should handle empty fields gracefully', async () => {
      const { result } = renderHook(() => useDataExportLogic());
      
      const mockData = {
        weightRecords: [
          {
            date: '2024-01-01',
            time: '08:00',
            weight: 70.5,
            bodyFat: null,
            waist: null,
            note: null,
            excludeFromGraph: false,
          },
        ],
        bpRecords: [
          {
            date: '2024-01-01',
            time: '08:00',
            systolic: 120,
            diastolic: 80,
            heartRate: null,
            note: null,
            excludeFromGraph: false,
          },
        ],
        dailyRecords: [],
        dailyFields: [],
      };
      
      const { getAllWeightRecords, getAllBpRecords, getAllDailyRecords, getAllDailyFields } = await import('../../../db');
      
      vi.mocked(getAllWeightRecords).mockResolvedValue(mockData.weightRecords);
      vi.mocked(getAllBpRecords).mockResolvedValue(mockData.bpRecords);
      vi.mocked(getAllDailyRecords).mockResolvedValue(mockData.dailyRecords);
      vi.mocked(getAllDailyFields).mockResolvedValue(mockData.dailyFields);
      
      const mockOnStatusChange = vi.fn();
      
      await result.current.exportAsCSV(mockOnStatusChange);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith('CSVエクスポートが完了しました');
    });
  });
});