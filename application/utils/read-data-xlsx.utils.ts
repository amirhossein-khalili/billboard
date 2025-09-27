import { ErrorReporter, ParsedBillboardRow } from './types';
import { XlsxTableParser } from './xlsx-table-parser';

export class BillboardsXlsxParser extends XlsxTableParser<ParsedBillboardRow> {
  // eslint-disable-next-line class-methods-use-this
  protected validateHeader(header: string[]): string[] {
    const errors: string[] = [];

    const [orgHeader = '', messageHeader = ''] = header.map((h) => h.toLowerCase());

    if (!orgHeader.includes('org') || !orgHeader.includes('id')) {
      errors.push('Column 1 must be "Org ID" (or similar)');
    }

    if (!messageHeader.includes('message')) {
      errors.push('Column 2 must be "Message"');
    }

    return errors;
  }

  // eslint-disable-next-line class-methods-use-this
  protected mapRow(
    cells: string[],
    rowNumber: number,
    _header: string[],
    addError: ErrorReporter,
  ): ParsedBillboardRow | null {
    const [orgCellRaw = '', message = ''] = cells;

    if (!orgCellRaw) {
      addError('Org ID is required (or use "*")');
      return null;
    }

    if (!message) {
      addError('Message is required');
      return null;
    }

    if (message.length > 10000) {
      addError('Message exceeds 10000 characters');
      return null;
    }

    const orgCell = orgCellRaw.toLowerCase();
    const isWildcard = orgCell === '*' || orgCell === 'all';
    const organizationIds = isWildcard
      ? []
      : Array.from(
        new Set(
          orgCellRaw
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      );

    if (!isWildcard && organizationIds.length === 0) {
      addError('Invalid Org ID(s)');
      return null;
    }

    return {
      rowNumber,
      isWildcard,
      organizationIds,
      message,
    };
  }
}
