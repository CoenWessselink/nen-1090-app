import type { Alignment, Fill, Font, Workbook, Worksheet } from 'exceljs';

type ExcelCellValue = string | number | boolean | null | undefined;

export type XlsxColumn<T> = {
  key: keyof T | string;
  header: string;
  width?: number;
  type?: 'string' | 'number' | 'currency' | 'integer' | 'date';
  value?: (row: T) => ExcelCellValue;
};

export type XlsxSummaryItem = {
  label: string;
  value: ExcelCellValue;
  type?: 'string' | 'number' | 'currency' | 'integer';
};

export type ExportStyledXlsxOptions<T> = {
  filename: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: Array<XlsxColumn<T>>;
  rows: T[];
  summary?: XlsxSummaryItem[];
};

const APP_BLUE = 'FF2563EB';
const APP_DARK_BLUE = 'FF1E3A8A';
const APP_LIGHT_BLUE = 'FFDBEAFE';
const APP_SOFT_BLUE = 'FFEFF6FF';
const BORDER_BLUE = 'FFD7E3F3';
const TEXT_DARK = 'FF0F172A';
const WHITE = 'FFFFFFFF';

function safeSheetName(name: string) {
  return (name || 'Export').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Export';
}

function downloadName(filename: string) {
  const clean = filename.replace(/\.xml$/i, '.xlsx').replace(/\.xls$/i, '.xlsx');
  return clean.toLowerCase().endsWith('.xlsx') ? clean : `${clean}.xlsx`;
}

function styleFill(color: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function styleFont(options: Partial<Font> = {}): Partial<Font> {
  return { name: 'Aptos', color: { argb: TEXT_DARK }, size: 11, ...options };
}

function applyBorder(worksheet: Worksheet) {
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_BLUE } },
        left: { style: 'thin', color: { argb: BORDER_BLUE } },
        bottom: { style: 'thin', color: { argb: BORDER_BLUE } },
        right: { style: 'thin', color: { argb: BORDER_BLUE } },
      };
      cell.alignment = { vertical: 'middle', wrapText: true } as Partial<Alignment>;
    });
  });
}

function numericValue(value: ExcelCellValue) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export async function exportStyledXlsx<T>(options: ExportStyledXlsxOptions<T>) {
  const ExcelJS = await import('exceljs');
  const workbook: Workbook = new ExcelJS.Workbook();
  workbook.creator = 'WeldInspect Pro';
  workbook.created = new Date();
  workbook.modified = new Date();

  const { filename, sheetName, title, subtitle, columns, rows, summary = [] } = options;
  const worksheet = workbook.addWorksheet(safeSheetName(sheetName), {
    views: [{ state: 'frozen', ySplit: summary.length ? 6 : 4 }],
    properties: { defaultRowHeight: 22 },
  });

  const colCount = Math.max(columns.length, 1);
  worksheet.columns = columns.map((column) => ({ width: column.width || 18 }));

  worksheet.mergeCells(1, 1, 1, colCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = styleFont({ name: 'Aptos Display', size: 18, bold: true, color: { argb: WHITE } });
  titleCell.fill = styleFill(APP_DARK_BLUE);
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells(2, 1, 2, colCount);
  const subtitleCell = worksheet.getCell(2, 1);
  subtitleCell.value = subtitle || `Export gegenereerd op ${new Date().toLocaleString('nl-NL')}`;
  subtitleCell.font = styleFont({ bold: true, color: { argb: APP_DARK_BLUE } });
  subtitleCell.fill = styleFill(APP_LIGHT_BLUE);

  let rowIndex = 4;
  if (summary.length) {
    const summaryRow = worksheet.getRow(rowIndex);
    summary.slice(0, Math.floor(colCount / 2)).forEach((item, index) => {
      const labelCell = summaryRow.getCell(index * 2 + 1);
      const valueCell = summaryRow.getCell(index * 2 + 2);
      labelCell.value = item.label;
      valueCell.value = item.type === 'currency' || item.type === 'number' || item.type === 'integer' ? numericValue(item.value) : String(item.value ?? '');
      labelCell.font = styleFont({ bold: true, color: { argb: APP_DARK_BLUE } });
      valueCell.font = styleFont({ bold: true });
      labelCell.fill = styleFill(APP_SOFT_BLUE);
      valueCell.fill = styleFill(APP_SOFT_BLUE);
      if (item.type === 'currency') valueCell.numFmt = '€ #,##0.00';
      if (item.type === 'integer') valueCell.numFmt = '0';
    });
    rowIndex += 2;
  }

  const headerRow = worksheet.getRow(rowIndex);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = styleFont({ bold: true, color: { argb: WHITE } });
    cell.fill = styleFill(APP_BLUE);
  });
  headerRow.height = 24;

  rows.forEach((row) => {
    const excelRow = worksheet.addRow(
      columns.map((column) => {
        const value = column.value ? column.value(row) : (row as Record<string, ExcelCellValue>)[String(column.key)];
        return column.type === 'currency' || column.type === 'number' || column.type === 'integer' ? numericValue(value) : value ?? '';
      }),
    );
    columns.forEach((column, index) => {
      const cell = excelRow.getCell(index + 1);
      if (column.type === 'currency') cell.numFmt = '€ #,##0.00';
      if (column.type === 'integer') cell.numFmt = '0';
      if (column.type === 'number') cell.numFmt = '#,##0.00';
    });
  });

  worksheet.autoFilter = {
    from: { row: rowIndex, column: 1 },
    to: { row: Math.max(rowIndex + rows.length, rowIndex), column: colCount },
  };
  worksheet.getRow(rowIndex).font = styleFont({ bold: true, color: { argb: WHITE } });
  applyBorder(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
