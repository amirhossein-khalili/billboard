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

    it('maps a valid row to ParsedBillboardMessageRow', () => {
      const errors: string[] = [];
      const result = parser.mapRowPublic(
        ['org-123', ' Hello world '],
        2,
        header,
        (msg) => errors.push(msg),
      );

      expect(errors).toHaveLength(0);
      expect(result).toEqual({
        rowNumber: 2,
        organizationId: 'org-123',
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

      const allResult = parser.mapRowPublic(
        ['all', 'All organizations'],
        6,
        header,
        (msg) => errors.push(msg),
      );

      expect(starResult?.organizationId).toBe('*');
      expect(allResult?.organizationId).toBe('*');
    });

    it('rejects rows without organization id', () => {
      const errors: string[] = [];
      const result = parser.mapRowPublic(['   ', 'Message'], 3, header, (msg) => errors.push(msg));

      expect(result).toBeNull();
      expect(errors).toContain('Org ID is required (or use "*")');
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
      const result = parser.mapRowPublic(['org-1', '   '], 7, header, (msg) => errors.push(msg));

      expect(result).toBeNull();
      expect(errors).toContain('Message is required');
    });

    it('rejects rows with messages exceeding length limit', () => {
      const errors: string[] = [];
      const longMessage = 'x'.repeat(10001);

      const result = parser.mapRowPublic(
        ['org-1', longMessage],
        8,
        header,
        (msg) => errors.push(msg),
      );

      expect(result).toBeNull();
      expect(errors).toContain('Message exceeds 10000 characters');
    });
  });
});
