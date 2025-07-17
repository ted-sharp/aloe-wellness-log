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
    
    global.document.createElement = vi.fn(() => mockAnchor);
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

  describe('CSV generation', () => {
    it('should generate weight CSV correctly', () => {
      const weightRecords = [
        {
          date: '2024-01-01',
          time: '08:00',
          weight: 70.5,
          bodyFat: 15.2,
          waist: 85.0,
          note: 'Morning',
          excludeFromGraph: false,
        },
      ];
      
      const expectedCSV = [
        'Date,Time,Weight,BodyFat,Waist,Note,ExcludeFromGraph',
        '2024-01-01,08:00,70.5,15.2,85,Morning,false'
      ].join('\n');
      
      const weightCSV = [
        'Date,Time,Weight,BodyFat,Waist,Note,ExcludeFromGraph',
        ...weightRecords.map(record => 
          `${record.date},${record.time},${record.weight},${record.bodyFat || ''},${record.waist || ''},${record.note || ''},${record.excludeFromGraph || false}`
        )
      ].join('\n');
      
      expect(weightCSV).toBe(expectedCSV);
    });

    it('should generate BP CSV correctly', () => {
      const bpRecords = [
        {
          date: '2024-01-01',
          time: '08:00',
          systolic: 120,
          diastolic: 80,
          heartRate: 70,
          note: 'Normal',
          excludeFromGraph: false,
        },
      ];
      
      const expectedCSV = [
        'Date,Time,Systolic,Diastolic,HeartRate,Note,ExcludeFromGraph',
        '2024-01-01,08:00,120,80,70,Normal,false'
      ].join('\n');
      
      const bpCSV = [
        'Date,Time,Systolic,Diastolic,HeartRate,Note,ExcludeFromGraph',
        ...bpRecords.map(record => 
          `${record.date},${record.time},${record.systolic},${record.diastolic},${record.heartRate || ''},${record.note || ''},${record.excludeFromGraph || false}`
        )
      ].join('\n');
      
      expect(bpCSV).toBe(expectedCSV);
    });

    it('should generate daily CSV correctly', () => {
      const dailyRecords = [
        {
          date: '2024-01-01',
          fieldId: 'exercise',
          value: 1,
        },
      ];
      
      const expectedCSV = [
        'Date,FieldId,Value',
        '2024-01-01,exercise,1'
      ].join('\n');
      
      const dailyCSV = [
        'Date,FieldId,Value',
        ...dailyRecords.map(record => 
          `${record.date},${record.fieldId},${record.value}`
        )
      ].join('\n');
      
      expect(dailyCSV).toBe(expectedCSV);
    });

    it('should handle empty/null values in CSV', () => {
      const weightRecords = [
        {
          date: '2024-01-01',
          time: '08:00',
          weight: 70.5,
          bodyFat: null,
          waist: null,
          note: null,
          excludeFromGraph: false,
        },
      ];
      
      const expectedCSV = [
        'Date,Time,Weight,BodyFat,Waist,Note,ExcludeFromGraph',
        '2024-01-01,08:00,70.5,,,,false'
      ].join('\n');
      
      const weightCSV = [
        'Date,Time,Weight,BodyFat,Waist,Note,ExcludeFromGraph',
        ...weightRecords.map(record => 
          `${record.date},${record.time},${record.weight},${record.bodyFat || ''},${record.waist || ''},${record.note || ''},${record.excludeFromGraph || false}`
        )
      ].join('\n');
      
      expect(weightCSV).toBe(expectedCSV);
    });
  });
});