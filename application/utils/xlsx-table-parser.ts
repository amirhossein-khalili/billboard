import * as XLSX from 'xlsx';
import { ErrorReporter, ParseResult, XlsxParseOptions } from './types';

const DEFAULT_OPTIONS: Required<Omit<XlsxParseOptions, 'sheetName'>> = {
  headerRowIndex: 0,
  trimCells: true,
};

export abstract class XlsxTableParser<T> {
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

  protected normalizeRow(row: any[], trim: boolean): string[] {
    return row.map((cell) => this.normalizeCell(cell, trim));
  }

  private normalizeCell(value: any, trim: boolean): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = typeof value === 'string' ? value : String(value);
    return trim ? str.trim() : str;
  }

  private shouldSkipRow(cells: string[]): boolean {
    return cells.every((cell) => cell.length === 0);
  }

  protected abstract validateHeader(header: string[]): string[];

  protected abstract mapRow(
    cells: string[],
    rowNumber: number,
    header: string[],
    addError: ErrorReporter,
  ): T | null;
}