import { ErrorReporter, ParsedBillboardMessageRow } from './types';
import { XlsxTableParser } from './xlsx-table-parser';

/**
 * @class BillboardsXlsxParser
 * @description A concrete implementation of `XlsxTableParser` for parsing billboard
 * data from an Excel file.
 */
export class BillboardMessagesXlsxParser extends XlsxTableParser<ParsedBillboardMessageRow> {
  /**
   * @protected
   * @method validateHeader
   * @description Validates the header row of the billboard Excel sheet.
   * @param {string[]} header - The header row to validate.
   * @returns {string[]} An array of error messages, or an empty array if the header is valid.
   */
  // eslint-disable-next-line class-methods-use-this
  protected validateHeader(header: string[]): string[] {
    const errors: string[] = [];

    const [orgHeader = '', messageHeader = ''] = header.map((h) =>
      h.toLowerCase(),
    );

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
   * @description Maps a single row from the Excel sheet to a `ParsedBillboardMessageRow` object.
   * @param {string[]} cells - The cells of the row.
   * @param {number} rowNumber - The row number in the worksheet.
   * @param {string[]} _header - The header row (unused).
   * @param {ErrorReporter} addError - A function to report errors for the current row.
   * @returns {ParsedBillboardMessageRow | null} The mapped object, or null if the row is invalid.
   */
  // eslint-disable-next-line class-methods-use-this
  protected mapRow(
    cells: string[],
    rowNumber: number,
    _header: string[],
    addError: ErrorReporter,
  ): ParsedBillboardMessageRow | null {
    const [orgCellRaw = '', messageRaw = ''] = cells;

    const organizationIdNormalized = orgCellRaw.trim();
    const message = messageRaw.trim();

    if (!organizationIdNormalized) {
      addError('Org ID is required (or use "*")');
      return null;
    }

    if (organizationIdNormalized.includes(',')) {
      addError(
        'Only one Org ID per row is allowed—split comma-separated values into multiple rows.',
      );
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

    const organizationId =
      organizationIdNormalized === '*'
        ? '*'
        : organizationIdNormalized.toLowerCase() === 'all'
          ? '*'
          : organizationIdNormalized;

    return {
      rowNumber,
      organizationId,
      message,
    };
  }
}
