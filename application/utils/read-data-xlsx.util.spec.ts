import { BillboardsXlsxParser } from './read-data-xlsx.utils';
import { ErrorReporter } from './types';

describe('BillboardsXlsxParser', () => {
  let parser: BillboardsXlsxParser;
  let mockErrorReporter: jest.Mock<ErrorReporter>;

  beforeEach(() => {
    parser = new BillboardsXlsxParser();
    mockErrorReporter = jest.fn();
  });

  describe('validateHeader', () => {
    it('should return no errors for valid headers', () => {
      const validHeaders = [
        ['Org ID', 'Message'],
        ['Organization ID', 'Message'],
        ['ORG ID', 'MESSAGE'],
        ['org id', 'message'],
        ['Org IDs', 'Messages'],
        ['Organization IDs', 'Message Text'],
      ];

      validHeaders.forEach((header) => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        const errors = parser['validateHeader'](header);
        expect(errors).toEqual([]);
      });
    });

    it('should return error for missing org/id in first column', () => {
      const invalidHeaders = [
        ['Organization', 'Message'],
        ['Company', 'Message'],
        ['ID', 'Message'],
        ['Org', 'Message'],
        ['', 'Message'],
      ];

      invalidHeaders.forEach((header) => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        const errors = parser['validateHeader'](header);
        expect(errors).toContain('Column 1 must be "Org ID" (or similar)');
      });
    });

    it('should return error for missing message in second column', () => {
      const invalidHeaders = [
        ['Org ID', 'Text'],
        ['Org ID', 'Content'],
        ['Org ID', 'Announcement'],
        ['Org ID', ''],
      ];

      invalidHeaders.forEach((header) => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        const errors = parser['validateHeader'](header);
        expect(errors).toContain('Column 2 must be "Message"');
      });
    });

    it('should return multiple errors for completely invalid header', () => {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const errors = parser['validateHeader'](['Company', 'Text']);
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Column 1 must be "Org ID" (or similar)');
      expect(errors).toContain('Column 2 must be "Message"');
    });

    it('should handle empty header array', () => {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const errors = parser['validateHeader']([]);
      expect(errors).toHaveLength(2);
    });

    it('should handle header with only one column', () => {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const errors = parser['validateHeader'](['Org ID']);
      expect(errors).toContain('Column 2 must be "Message"');
      expect(errors).toHaveLength(1);
    });
  });

  describe('mapRow', () => {
    const mockHeader = ['Org ID', 'Message'];

    it('should parse valid row with single organization ID', () => {
      const cells = ['org-123', 'Test message'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 5, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 5,
        isWildcard: false,
        organizationIds: ['org-123'],
        message: 'Test message',
      });
      expect(mockErrorReporter).not.toHaveBeenCalled();
    });

    it('should parse valid row with multiple organization IDs', () => {
      const cells = ['org-123, org-456, org-789', 'Multi-org message'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 10, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 10,
        isWildcard: false,
        organizationIds: ['org-123', 'org-456', 'org-789'],
        message: 'Multi-org message',
      });
      expect(mockErrorReporter).not.toHaveBeenCalled();
    });

    it('should handle wildcard with asterisk', () => {
      const cells = ['*', 'Global message'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 2, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 2,
        isWildcard: true,
        organizationIds: [],
        message: 'Global message',
      });
      expect(mockErrorReporter).not.toHaveBeenCalled();
    });

    it('should handle wildcard with "all"', () => {
      const cells = ['all', 'Another global message'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 3, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 3,
        isWildcard: true,
        organizationIds: [],
        message: 'Another global message',
      });
    });

    it('should handle wildcard case-insensitively', () => {
      const wildcardVariants = ['ALL', 'All', 'aLL'];

      wildcardVariants.forEach((variant) => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        const result = parser['mapRow'](
          [variant, 'Message'],
          1,
          mockHeader,
          mockErrorReporter,
        );
        expect(result?.isWildcard).toBe(true);
        expect(result?.organizationIds).toEqual([]);
      });
    });

    it('should deduplicate organization IDs', () => {
      const cells = [
        'org-123, org-456, org-123, org-456',
        'Message with duplicates',
      ];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 7, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 7,
        isWildcard: false,
        organizationIds: ['org-123', 'org-456'],
        message: 'Message with duplicates',
      });
    });

    it('should trim organization IDs', () => {
      const cells = ['  org-123  ,   org-456   ', 'Message with spaces'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 8, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 8,
        isWildcard: false,
        organizationIds: ['org-123', 'org-456'],
        message: 'Message with spaces',
      });
    });

    it('should return null when org ID is missing', () => {
      const cells = ['', 'Message without org'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 4, mockHeader, mockErrorReporter);

      expect(result).toBeNull();
      expect(mockErrorReporter).toHaveBeenCalledWith(
        'Org ID is required (or use "*")',
      );
    });

    it('should return null when message is missing', () => {
      const cells = ['org-123', ''];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 5, mockHeader, mockErrorReporter);

      expect(result).toBeNull();
      expect(mockErrorReporter).toHaveBeenCalledWith('Message is required');
    });

    it('should return null when message exceeds 10000 characters', () => {
      const longMessage = 'a'.repeat(10001);
      const cells = ['org-123', longMessage];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 6, mockHeader, mockErrorReporter);

      expect(result).toBeNull();
      expect(mockErrorReporter).toHaveBeenCalledWith(
        'Message exceeds 10000 characters',
      );
    });

    it('should accept message exactly 10000 characters', () => {
      const maxMessage = 'a'.repeat(10000);
      const cells = ['org-123', maxMessage];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 6, mockHeader, mockErrorReporter);

      expect(result).not.toBeNull();
      expect(result?.message).toHaveLength(10000);
      expect(mockErrorReporter).not.toHaveBeenCalled();
    });

    it('should return null for invalid org IDs (only commas)', () => {
      const cells = [',,,', 'Message'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 9, mockHeader, mockErrorReporter);

      expect(result).toBeNull();
      expect(mockErrorReporter).toHaveBeenCalledWith('Invalid Org ID(s)');
    });

    it('should handle empty cells array', () => {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow']([], 1, mockHeader, mockErrorReporter);

      expect(result).toBeNull();
      expect(mockErrorReporter).toHaveBeenCalledWith(
        'Org ID is required (or use "*")',
      );
    });

    it('should handle cells with only org ID', () => {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](
        ['org-123'],
        1,
        mockHeader,
        mockErrorReporter,
      );

      expect(result).toBeNull();
      expect(mockErrorReporter).toHaveBeenCalledWith('Message is required');
    });

    it('should filter out empty org IDs from comma-separated list', () => {
      const cells = ['org-123,,org-456,, ,org-789', 'Message'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 10, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 10,
        isWildcard: false,
        organizationIds: ['org-123', 'org-456', 'org-789'],
        message: 'Message',
      });
    });

    it('should handle org IDs with special characters', () => {
      const cells = ['org-123-abc, org_456_def, org.789.ghi', 'Message'];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 11, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 11,
        isWildcard: false,
        organizationIds: ['org-123-abc', 'org_456_def', 'org.789.ghi'],
        message: 'Message',
      });
    });

    it('should preserve message formatting', () => {
      const messageWithFormatting = `Line 1
Line 2
\tIndented
  Spaces`;
      const cells = ['org-123', messageWithFormatting];
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const result = parser['mapRow'](cells, 12, mockHeader, mockErrorReporter);

      expect(result).toEqual({
        rowNumber: 12,
        isWildcard: false,
        organizationIds: ['org-123'],
        message: messageWithFormatting,
      });
    });
  });
});
