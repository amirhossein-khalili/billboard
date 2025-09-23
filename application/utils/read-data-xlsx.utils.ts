// application/utils/read-data-xlsx.utils.ts
import * as XLSX from 'xlsx';

export type ParsedBillboardRow = {
  rowNumber: number;
  isWildcard: boolean;
  organizationIds: string[]; // empty when wildcard
  message: string; // markdown supported by client
};

export type ParseResult = {
  rows: ParsedBillboardRow[];
  errors: string[];
};

function normalizeString(v: any): string {
  return (typeof v === 'string' ? v : String(v ?? '')).trim();
}

export function parseBillboardsXlsxFromBuffer(fileBuffer: Buffer): ParseResult {
  const errors: string[] = [];
  const rows: ParsedBillboardRow[] = [];

  let wb: XLSX.WorkBook | null = null;
  try {
    wb = XLSX.read(fileBuffer);
  } catch (e: any) {
    return {
      rows: [],
      errors: [`Failed to read workbook: ${e?.message || e}`],
    };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ['No sheets found in workbook'] };
  }
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
  }) as any[][];

  if (!aoa || aoa.length < 2) {
    return {
      rows: [],
      errors: ['Worksheet must include a header row and at least one data row'],
    };
  }

  // Expect headers: [ 'Org ID', 'Message' ]
  const header = aoa[0] || [];
  const orgIdx = 0;
  const msgIdx = 1;

  const orgHeader = normalizeString(header[orgIdx]).toLowerCase();
  const msgHeader = normalizeString(header[msgIdx]).toLowerCase();

  if (!orgHeader.includes('org') || !orgHeader.includes('id')) {
    errors.push('Column 1 must be "Org ID" (or similar)');
  }
  if (!msgHeader.includes('message')) {
    errors.push('Column 2 must be "Message"');
  }

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const orgCell = normalizeString(row[orgIdx]);
    const message = normalizeString(row[msgIdx]);

    if (!orgCell && !message) continue; // skip empty rows

    if (!orgCell) {
      errors.push(`Row ${r + 1}: Org ID is required (or use "*")`);
      continue;
    }
    if (!message) {
      errors.push(`Row ${r + 1}: Message is required`);
      continue;
    }
    if (message.length > 10000) {
      errors.push(`Row ${r + 1}: Message exceeds 10000 characters`);
      continue;
    }

    const isWildcard = orgCell === '*' || orgCell.toLowerCase() === 'all';
    const organizationIds = isWildcard
      ? []
      : Array.from(
          new Set(
            orgCell
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
          ),
        );

    if (!isWildcard && organizationIds.length === 0) {
      errors.push(`Row ${r + 1}: Invalid Org ID(s)`);
      continue;
    }

    rows.push({
      rowNumber: r + 1,
      isWildcard,
      organizationIds,
      message,
    });
  }

  return { rows, errors };
}
