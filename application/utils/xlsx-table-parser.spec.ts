import * as XLSX from 'xlsx';
import { XlsxTableParser } from './xlsx-table-parser';
import { XlsxParseOptions } from './types';

jest.mock('xlsx');

class TestParser extends XlsxTableParser<{ id: string; name: string }> {
  public exposeNormalizeRow(row: any[], trim: boolean): string[] {
    return this.normalizeRow(row, trim);
  }

  public exposeShouldSkipRow(cells: string[]): boolean {
    return (this as any).shouldSkipRow(cells);
  }

  protected validateHeader(header: string[]): string[] {
    const errors: string[] = [];
    if (!header.includes('id')) errors.push('Missing id column');
    if (!header.includes('name')) errors.push('Missing name column');
    return errors;
  }

  protected mapRow(
    cells: string[],
    rowNumber: number,
    header: string[],
    addError: (message: string) => void,
  ): { id: string; name: string } | null {
    const idIndex = header.indexOf('id');
    const nameIndex = header.indexOf('name');

    if (idIndex === -1 || nameIndex === -1) return null;

    const id = cells[idIndex];
    const name = cells[nameIndex];

    if (!id) {
      addError('ID is required');
      return null;
    }

    return { id, name };
  }
}

describe('XlsxTableParser', () => {
  let parser: TestParser;
  let mockWorkbook: XLSX.WorkBook;
  let mockWorksheet: XLSX.WorkSheet;

  beforeEach(() => {
    parser = new TestParser();
    mockWorksheet = {};
    mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: mockWorksheet },
    };

    (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parse', () => {
    it('should parse valid XLSX data successfully', () => {
      const mockData = [
        ['id', 'name'],
        ['1', 'John'],
        ['2', 'Jane'],
      ];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(XLSX.read).toHaveBeenCalledWith(buffer);
      expect(result.rows).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ]);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle workbook read errors', () => {
      const error = new Error('Corrupted file');
      (XLSX.read as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(result.rows).toEqual([]);
      expect(result.errors).toEqual([
        'Failed to read workbook: Corrupted file',
      ]);
    });

    it('should handle missing sheets', () => {
      mockWorkbook.SheetNames = [];

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(result.rows).toEqual([]);
      expect(result.errors).toEqual(['No sheets found in workbook']);
    });

    it('should handle empty worksheet', () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([]);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(result.rows).toEqual([]);
      expect(result.errors).toEqual([
        'Worksheet must include a header row and at least one data row',
      ]);
    });

    it('should validate header row', () => {
      const mockData = [['invalid', 'header']];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(result.rows).toEqual([]);
      expect(result.errors).toContain('Missing id column');
      expect(result.errors).toContain('Missing name column');
    });

    it('should skip empty rows', () => {
      const mockData = [
        ['id', 'name'],
        ['1', 'John'],
        ['', ''],
        ['2', 'Jane'],
      ];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(result.rows).toHaveLength(2);
      expect(result.rows).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ]);
    });

    it('should skip whitespace-only rows when trimming', () => {
      const mockData = [
        ['id', 'name'],
        ['1', 'John'],
        ['   ', '\t'],
        ['2', 'Jane'],
      ];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(result.rows).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ]);
    });

    it('should keep whitespace-only rows when trimming is disabled', () => {
      const mockData = [
        ['id', 'name'],
        ['1', 'John'],
        ['   ', '\t'],
      ];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer, { trimCells: false });

      expect(result.rows).toEqual([
        { id: '1', name: 'John' },
        { id: '   ', name: '\t' },
      ]);
    });

    it('should handle custom sheet name', () => {
      const options: XlsxParseOptions = { sheetName: 'CustomSheet' };
      mockWorkbook.SheetNames = ['CustomSheet', 'Sheet1'];
      mockWorkbook.Sheets.CustomSheet = mockWorksheet;

      const mockData = [
        ['id', 'name'],
        ['1', 'John'],
      ];
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer, options);

      expect(result.rows).toEqual([{ id: '1', name: 'John' }]);
    });

    it('should handle custom header row index', () => {
      const options: XlsxParseOptions = { headerRowIndex: 2 };
      const mockData = [
        ['', ''],
        ['', ''],
        ['id', 'name'],
        ['1', 'John'],
      ];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer, options);

      expect(result.rows).toEqual([{ id: '1', name: 'John' }]);
    });

    it('should trim cells by default', () => {
      const mockData = [
        ['id', 'name'],
        [' 1 ', ' John '],
      ];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(result.rows).toEqual([{ id: '1', name: 'John' }]);
    });

    it('should not trim cells when trimCells is false', () => {
      const options: XlsxParseOptions = { trimCells: false };
      const mockData = [
        ['id', 'name'],
        [' 1 ', ' John '],
      ];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer, options);

      expect(result.rows).toEqual([{ id: ' 1 ', name: ' John ' }]);
    });

    it('should report row-level errors', () => {
      const mockData = [
        ['id', 'name'],
        ['', 'John'],
        ['2', 'Jane'],
      ];

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = Buffer.from('test');
      const result = parser.parse(buffer);

      expect(result.rows).toEqual([{ id: '2', name: 'Jane' }]);
      expect(result.errors).toContain('Row 2: ID is required');
    });
  });

  describe('normalizeRow', () => {
    it('should normalize various data types to strings', () => {
      const testData = [123, 'hello', true, null, undefined];
      const result = parser.exposeNormalizeRow(testData, true);

      expect(result).toEqual(['123', 'hello', 'true', '', '']);
    });

    it('should trim cells when trim is true', () => {
      const testData = ['  hello  ', '  world  '];
      const result = parser.exposeNormalizeRow(testData, true);

      expect(result).toEqual(['hello', 'world']);
    });

    it('should not trim cells when trim is false', () => {
      const testData = ['  hello  ', '  world  '];
      const result = parser.exposeNormalizeRow(testData, false);

      expect(result).toEqual(['  hello  ', '  world  ']);
    });
  });

  describe('shouldSkipRow', () => {
    it('should skip empty rows', () => {
      expect(parser.exposeShouldSkipRow(['', '', ''])).toBe(true);
    });

    it('should not skip rows with content', () => {
      expect(parser.exposeShouldSkipRow(['', 'content', ''])).toBe(false);
    });

    it('should not skip rows with whitespace-only cells before trimming', () => {
      expect(parser.exposeShouldSkipRow(['   ', '\t', ''])).toBe(false);
    });
  });
});