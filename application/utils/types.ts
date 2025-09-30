export type ParsedBillboardMessageRow = {
  rowNumber: number;
  organizationId: string;
  message: string;
};

export type ParseResult<T> = {
  rows: T[];
  errors: string[];
};

export type XlsxParseOptions = {
  sheetName?: string;
  headerRowIndex?: number;
  trimCells?: boolean;
};

export type ErrorReporter = (message: string) => void;