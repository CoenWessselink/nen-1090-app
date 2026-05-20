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

function escapeXml(value: ExcelCellValue) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeSheetName(name: string) {
  return (name || 'Export').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Export';
}

function downloadName(filename: string) {
  return filename.replace(/\.xlsx$/i, '.xml').replace(/\.xls$/i, '.xml').replace(/\.xml$/i, '.xml') || 'export.xml';
}

function excelCell(value: ExcelCellValue, styleId = 'Default', numeric = false) {
  if (numeric && typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function columnXml(width?: number) {
  return `<Column ss:AutoFitWidth="0" ss:Width="${Math.max(9, Number(width || 18)) * 6}"/>`;
}

export function exportStyledXlsx<T>(options: ExportStyledXlsxOptions<T>) {
  const { filename, sheetName, title, subtitle, columns, rows, summary = [] } = options;
  const columnCount = Math.max(columns.length, 1);
  const summaryItems = summary.slice(0, Math.floor(columnCount / 2));

  const titleRow = `<Row ss:Height="28">${excelCell(title, 'Title')}${Array.from({ length: columnCount - 1 }, () => '<Cell ss:StyleID="Title"/>').join('')}</Row>`;
  const subtitleRow = `<Row>${excelCell(subtitle || `Export gegenereerd op ${new Date().toLocaleString('nl-NL')}`, 'Subtitle')}${Array.from({ length: columnCount - 1 }, () => '<Cell ss:StyleID="Subtitle"/>').join('')}</Row>`;

  const summaryRow = summaryItems.length
    ? `<Row>${summaryItems.flatMap((item) => [
        excelCell(item.label, 'SummaryLabel'),
        excelCell(item.value, item.type === 'currency' ? 'SummaryCurrency' : 'SummaryValue', item.type === 'currency' || item.type === 'number' || item.type === 'integer'),
      ]).join('')}</Row><Row/>`
    : '';

  const headerRow = `<Row>${columns.map((column) => excelCell(column.header, 'Header')).join('')}</Row>`;
  const dataRows = rows.map((row) => {
    const cells = columns.map((column) => {
      const raw = column.value ? column.value(row) : (row as Record<string, ExcelCellValue>)[String(column.key)];
      const numeric = column.type === 'currency' || column.type === 'number' || column.type === 'integer';
      const style = column.type === 'currency' ? 'Currency' : numeric ? 'Number' : 'Default';
      return excelCell(raw, style, numeric);
    }).join('');
    return `<Row>${cells}</Row>`;
  }).join('');

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>WeldInspect Pro</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="#0f172a"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#dbe7f3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#dbe7f3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#dbe7f3"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#dbe7f3"/></Borders>
  </Style>
  <Style ss:ID="Title"><Font ss:FontName="Aptos Display" ss:Size="18" ss:Bold="1" ss:Color="#ffffff"/><Interior ss:Color="#1e3a8a" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Subtitle"><Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1" ss:Color="#1e3a8a"/><Interior ss:Color="#dbeafe" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1" ss:Color="#ffffff"/><Interior ss:Color="#2563eb" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1d4ed8"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1d4ed8"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1d4ed8"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1d4ed8"/></Borders></Style>
  <Style ss:ID="SummaryLabel"><Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1" ss:Color="#1e3a8a"/><Interior ss:Color="#eff6ff" ss:Pattern="Solid"/></Style>
  <Style ss:ID="SummaryValue"><Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1" ss:Color="#0f172a"/><Interior ss:Color="#eff6ff" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Currency"><NumberFormat ss:Format="&quot;€&quot; #,##0.00"/></Style>
  <Style ss:ID="SummaryCurrency"><Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1" ss:Color="#0f172a"/><Interior ss:Color="#eff6ff" ss:Pattern="Solid"/><NumberFormat ss:Format="&quot;€&quot; #,##0.00"/></Style>
  <Style ss:ID="Number"><NumberFormat ss:Format="0"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(safeSheetName(sheetName))}">
  <Table>
   ${columns.map((column) => columnXml(column.width)).join('')}
   ${titleRow}
   ${subtitleRow}
   <Row/>
   ${summaryRow}
   ${headerRow}
   ${dataRows || `<Row>${excelCell('Geen regels beschikbaar.', 'Default')}</Row>`}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>${summaryItems.length ? 6 : 4}</SplitHorizontal>
   <TopRowBottomPane>${summaryItems.length ? 7 : 5}</TopRowBottomPane>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
