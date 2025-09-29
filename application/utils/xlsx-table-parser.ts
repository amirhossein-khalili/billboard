import * as XLSX from 'xlsx';
import { ErrorReporter, ParseResult, XlsxParseOptions } from './types';

const DEFAULT_OPTIONS: Required<Omit<XlsxParseOptions, 'sheetName'>> = {
  headerRowIndex: 0,
  trimCells: true,
};

/**
 * @abstract
 * @class XlsxTableParser
 * @description An abstract class for parsing tabular data from an XLSX file.
 * @template T - The type of the parsed row object.
 */
export abstract class XlsxTableParser<T> {
  /**
   * @method parse
   * @description Parses an XLSX file buffer into an array of objects.
   * @param {Buffer} buffer - The buffer containing the XLSX file data.
   * @param {XlsxParseOptions} [options={}] - Options for parsing the file.
   * @returns {ParseResult<T>} An object containing the parsed rows and any errors that occurred.
   */
  parse(buffer: Buffer, options: XlsxParseOptions = {}): ParseResult<T> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error ?? 'unknown');
      return {
        rows: [],
        errors: [`Failed to read workbook: ${reason}`],
      };
    }

    const sheetName = options.sheetName ?? workbook.SheetNames[0];
    if (!sheetName) {
      return { rows: [], errors: ['No sheets found in workbook'] };
    }

    const worksheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
    }) as (string | number | boolean | null | undefined)[][];

    if (!aoa || aoa.length <= config.headerRowIndex) {
      return {
        rows: [],
        errors: [
          'Worksheet must include a header row and at least one data row',
        ],
      };
    }

    const header = this.normalizeRow(
      aoa[config.headerRowIndex],
      config.trimCells,
    );
    const headerErrors = this.validateHeader(header);
    errors.push(...headerErrors);
    if (headerErrors.length > 0) {
      return { rows: [], errors };
    }

    const rows: T[] = [];
    let i = config.headerRowIndex + 1;
    for (const rawRow of aoa.slice(config.headerRowIndex + 1)) {
      const cells = this.normalizeRow(rawRow ?? [], config.trimCells);
      if (this.shouldSkipRow(cells)) {
        i += 1;
      } else {
        const rowNumber = i + 1;
        const addError: ErrorReporter = (message) =>
          errors.push(`Row ${rowNumber}: ${message}`);

        const parsed = this.mapRow(cells, rowNumber, header, addError);
        if (parsed) {
          rows.push(parsed);
        }
        i += 1;
      }
    }

    return { rows, errors };
  }

  /**
   * @protected
   * @method normalizeRow
   * @description Normalizes the cells of a row into an array of strings.
   * @param {any[]} row - The row to normalize.
   * @param {boolean} trim - Whether to trim whitespace from each cell.
   * @returns {string[]} The normalized row.
   */
  protected normalizeRow(row: any[], trim: boolean): string[] {
    return row.map((cell) => this.normalizeCell(cell, trim));
  }

  /**
   * @private
   * @method normalizeCell
   * @description Normalizes a single cell value into a string.
   * @param {any} value - The cell value.
   * @param {boolean} trim - Whether to trim whitespace from the cell.
   * @returns {string} The normalized cell value.
   */
  // eslint-disable-next-line class-methods-use-this
  private normalizeCell(value: any, trim: boolean): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = typeof value === 'string' ? value : String(value);
    return trim ? str.trim() : str;
  }

  /**
   * @private
   * @method shouldSkipRow
   * @description Determines whether a row should be skipped (e.g., if it's empty).
   * @param {string[]} cells - The cells of the row.
   * @returns {boolean} True if the row should be skipped, otherwise false.
   */
  // eslint-disable-next-line class-methods-use-this
  private shouldSkipRow(cells: string[]): boolean {
    return cells.every((cell) => cell.length === 0);
  }

  /**
   * @protected
   * @abstract
   * @method validateHeader
   * @description Validates the header row of the worksheet.
   * @param {string[]} header - The header row.
   * @returns {string[]} An array of error messages, or an empty array if the header is valid.
   */
  protected abstract validateHeader(header: string[]): string[];

  /**
   * @protected
   * @abstract
   * @method mapRow
   * @description Maps a row of cells to an object of type T.
   * @param {string[]} cells - The cells of the row.
   * @param {number} rowNumber - The row number in the worksheet.
   * @param {string[]} header - The header row.
   * @param {ErrorReporter} addError - A function to report errors for the current row.
   * @returns {T | null} The mapped object, or null if the row should be skipped.
   */
  protected abstract mapRow(
    cells: string[],
    rowNumber: number,
    header: string[],
    addError: ErrorReporter,
  ): T | null;
}
