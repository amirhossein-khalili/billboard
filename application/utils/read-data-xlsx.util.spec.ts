import { BillboardMessagesXlsxParser } from './read-data-xlsx.utils';
import { ErrorReporter, ParsedBillboardMessageRow } from './types';

class TestableBillboardMessagesXlsxParser extends BillboardMessagesXlsxParser {
  public validateHeaderPublic(header: string[]): string[] {
    return this.validateHeader(header);
  }

  public mapRowPublic(
    cells: string[],
    rowNumber: number,
    header: string[],
    addError: ErrorReporter,
  ): ParsedBillboardMessageRow | null {
    return this.mapRow(cells, rowNumber, header, addError);
  }
}

describe('BillboardMessagesXlsxParser', () => {
  let parser: TestableBillboardMessagesXlsxParser;

  beforeEach(() => {
    parser = new TestableBillboardMessagesXlsxParser();
  });

  describe('validateHeader', () => {
    it('accepts a header containing organization and message columns', () => {
      const errors = parser.validateHeaderPublic(['Org ID', 'Message']);
      expect(errors).toHaveLength(0);
    });

    it('rejects headers missing the organization column', () => {
      const errors = parser.validateHeaderPublic(['Organization', 'Text']);
      expect(errors).toContain('Column 1 must be "Org ID" (or similar)');
    });

    it('rejects headers missing the message column', () => {
      const errors = parser.validateHeaderPublic(['Org ID', 'Notes']);
      expect(errors).toContain('Column 2 must be "Message"');
    });
  });

  describe('mapRow', () => {
    const header = ['Org ID', 'Message'];
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    it('maps a valid row with UUID to ParsedBillboardMessageRow', () => {
      const errors: string[] = [];
      const result = parser.mapRowPublic(
        [validUUID, ' Hello world '],
        2,
        header,
        (msg) => errors.push(msg),
      );

      expect(errors).toHaveLength(0);
      expect(result).toEqual({
        rowNumber: 2,
        organizationId: validUUID,
        message: 'Hello world',
      });
    });

    it('maps a valid row with wildcard to ParsedBillboardMessageRow', () => {
      const errors: string[] = [];
      const result = parser.mapRowPublic(
        ['*', ' Hello world '],
        2,
        header,
        (msg) => errors.push(msg),
      );

      expect(errors).toHaveLength(0);
      expect(result).toEqual({
        rowNumber: 2,
        organizationId: '*',
        message: 'Hello world',
      });
    });

    it('normalizes wildcard values ("*" and "all") to "*"', () => {
      const errors: string[] = [];
      const starResult = parser.mapRowPublic(
        ['*', 'Wildcard message'],
        5,
        header,
        (msg) => errors.push(msg),
      );

      const allErrors: string[] = [];
      const allResult = parser.mapRowPublic(
        ['all', 'All organizations'],
        6,
        header,
        (msg) => allErrors.push(msg),
      );

      expect(errors).toHaveLength(0);
      expect(allErrors).toHaveLength(1);
      expect(allErrors[0]).toContain('UUID or "*"');

      expect(starResult?.organizationId).toBe('*');
      expect(allResult).toBeNull();
    });

    it('rejects rows without organization id', () => {
      const errors: string[] = [];
      const result = parser.mapRowPublic(['   ', 'Message'], 3, header, (msg) => errors.push(msg));

      expect(result).toBeNull();
      expect(errors).toContain(
        'Org ID is required (use "*" for all organizations)',
      );
    });

    it('rejects rows with invalid organization ids', () => {
      const errors: string[] = [];
      const result = parser.mapRowPublic(
        ['invalid-id', 'Message'],
        4,
        header,
        (msg) => errors.push(msg),
      );

      expect(result).toBeNull();
      expect(errors).toContain('Org ID must be a UUID or "*"');
    });

    it('rejects rows with comma-separated organization ids', () => {
      const errors: string[] = [];
      const result = parser.mapRowPublic(
        ['org-1,org-2', 'Message'],
        4,
        header,
        (msg) => errors.push(msg),
      );

      expect(result).toBeNull();
      expect(errors).toContain(
        'Only one Org ID per row is allowed—split comma-separated values into multiple rows.',
      );
    });

    it('rejects rows with empty messages', () => {
      const errors: string[] = [];
      const result = parser.mapRowPublic(['*', '   '], 7, header, (msg) => errors.push(msg));

      expect(result).toBeNull();
      expect(errors).toContain('Message is required');
    });

    it('rejects rows with messages exceeding length limit', () => {
      const errors: string[] = [];
      const longMessage = 'x'.repeat(10001);

      const result = parser.mapRowPublic(['*', longMessage], 8, header, (msg) => errors.push(msg));

      expect(result).toBeNull();
      expect(errors).toContain('Message exceeds 10000 characters');
    });
  });
});