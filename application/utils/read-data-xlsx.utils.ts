import { ErrorReporter, ParsedBillboardRow } from './types';
import { XlsxTableParser } from './xlsx-table-parser';

/**
 * @class BillboardsXlsxParser
 * @description A concrete implementation of `XlsxTableParser` for parsing billboard data from an Excel file.
 */
export class BillboardsXlsxParser extends XlsxTableParser<ParsedBillboardRow> {
  /**
   * @protected
   * @method validateHeader
   * @description Validates the header row of the billboard Excel sheet.
   * @param {string[]} header - The header row to validate.
   * @returns {string[]} An array of error messages, or an empty array if the header is valid.
   */
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

  /**
   * @protected
   * @method mapRow
   * @description Maps a single row from the Excel sheet to a `ParsedBillboardRow` object.
   * @param {string[]} cells - The cells of the row.
   * @param {number} rowNumber - The row number in the worksheet.
   * @param {string[]} _header - The header row (unused).
   * @param {ErrorReporter} addError - A function to report errors for the current row.
   * @returns {ParsedBillboardRow | null} The mapped object, or null if the row is invalid.
   */
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
