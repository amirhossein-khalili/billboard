export type ParsedBillboardRow = {
  rowNumber: number;
  isWildcard: boolean;
  organizationIds: string[];
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
