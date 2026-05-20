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

function escapeHtml(value: ExcelCellValue) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function excelFilename(filename: string) {
  const clean = filename.replace(/\.xlsx$/i, '.xls').replace(/\.xml$/i, '.xls');
  return clean.toLowerCase().endsWith('.xls') ? clean : `${clean}.xls`;
}

function numericValue(value: ExcelCellValue) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function cell(value: ExcelCellValue, className = '') {
  return `<td${className ? ` class="${className}"` : ''}>${escapeHtml(value)}</td>`;
}

export async function exportStyledXlsx<T>(options: ExportStyledXlsxOptions<T>) {
  const { filename, title, subtitle, columns, rows, summary = [] } = options;
  const columnCount = Math.max(columns.length, 1);
  const summaryItems = summary.slice(0, Math.floor(columnCount / 2));
  const summaryRow = summaryItems.length
    ? `<tr>${summaryItems.map((item) => `${cell(item.label, 'summary-label')}${cell(
        item.type === 'currency' || item.type === 'number' || item.type === 'integer' ? numericValue(item.value) : item.value,
        item.type === 'currency' ? 'summary-value currency' : 'summary-value',
      )}`).join('')}<td colspan="${Math.max(columnCount - summaryItems.length * 2, 0)}"></td></tr><tr><td colspan="${columnCount}"></td></tr>`
    : '';

  const headerRow = `<tr>${columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')}</tr>`;
  const dataRows = rows.map((row) => {
    const cells = columns.map((column) => {
      const raw = column.value ? column.value(row) : (row as Record<string, ExcelCellValue>)[String(column.key)];
      if (column.type === 'currency') return cell(numericValue(raw).toFixed(2), 'currency');
      if (column.type === 'number') return cell(numericValue(raw), 'number');
      if (column.type === 'integer') return cell(Math.round(numericValue(raw)), 'number');
      return cell(raw);
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Aptos, Calibri, Arial, sans-serif; color: #0f172a; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #2563eb; color: #ffffff; font-weight: 800; border: 1px solid #1d4ed8; padding: 8px 10px; text-align: left; }
    td { border: 1px solid #d7e3f3; padding: 8px 10px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fbff; }
    .title { background: #1e3a8a; color: #ffffff; font-size: 20px; font-weight: 800; }
    .subtitle { background: #dbeafe; color: #1e3a8a; font-weight: 700; }
    .summary-label { background: #eff6ff; color: #1e3a8a; font-weight: 800; }
    .summary-value { background: #eff6ff; color: #0f172a; font-weight: 800; }
    .currency { mso-number-format:'€ #,##0.00'; text-align: right; }
    .number { mso-number-format:'0'; text-align: right; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="${columnCount}" class="title">${escapeHtml(title)}</td></tr>
    <tr><td colspan="${columnCount}" class="subtitle">${escapeHtml(subtitle || `Export gegenereerd op ${new Date().toLocaleString('nl-NL')}`)}</td></tr>
    <tr><td colspan="${columnCount}"></td></tr>
    ${summaryRow}
    ${headerRow}
    ${dataRows || `<tr><td colspan="${columnCount}">Geen regels beschikbaar.</td></tr>`}
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = excelFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
