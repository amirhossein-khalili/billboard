import * as XLSX from 'xlsx';

export function makeXlsx(rows: Array<[string, string]>): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Org ID', 'Message'], ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  // @ts-ignore
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

export function makeCustomAoAXlsx(aoa: any[][]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  // @ts-ignore
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}
