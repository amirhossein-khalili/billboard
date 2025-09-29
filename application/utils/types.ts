/**
 * @type ParsedBillboardMessageRow
 * @description Represents a single row parsed from the billboard message Excel file.
 * Each row creates a separate entity.
 */
export type ParsedBillboardMessageRow = {
  rowNumber: number;
  organizationId: string; // Single organization ID or '*' for all organizations
  message: string;
};

/**
 * @type ParseResult<T>
 * @description Represents the result of a parsing operation.
 * @template T - The type of the parsed row object.
 */
export type ParseResult<T> = {
  /**
   * @property {T[]} rows - An array of successfully parsed rows.
   */
  rows: T[];
  /**
   * @property {string[]} errors - An array of error messages encountered during parsing.
   */
  errors: string[];
};

/**
 * @type XlsxParseOptions
 * @description Defines the options for parsing an XLSX file.
 */
export type XlsxParseOptions = {
  /**
   * @property {string} [sheetName] - The name of the sheet to parse. Defaults to the first sheet.
   */
  sheetName?: string;
  /**
   * @property {number} [headerRowIndex] - The index of the header row. Defaults to 0.
   */
  headerRowIndex?: number;
  /**
   * @property {boolean} [trimCells] - Whether to trim whitespace from cells. Defaults to true.
   */
  trimCells?: boolean;
};

/**
 * @type ErrorReporter
 * @description A function type for reporting errors.
 */
export type ErrorReporter = (message: string) => void;
