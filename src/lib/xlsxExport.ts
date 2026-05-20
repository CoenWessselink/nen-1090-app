type XlsxCellValue = string | number | boolean | null | undefined;

export type XlsxColumn<T> = {
  key: keyof T | string;
  header: string;
  width?: number;
  type?: 'string' | 'number' | 'currency' | 'integer' | 'date';
  value?: (row: T) => XlsxCellValue;
};

export type XlsxSummaryItem = {
  label: string;
  value: XlsxCellValue;
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

const textEncoder = new TextEncoder();
let crcTable: Uint32Array | null = null;

function escapeXml(value: XlsxCellValue) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnLetter(index: number) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
}

function crc32(bytes: Uint8Array) {
  const table = crcTable || (crcTable = makeCrcTable());
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const b = new Uint8Array(2);
  const view = new DataView(b.buffer);
  view.setUint16(0, value, true);
  return b;
}

function u32(value: number) {
  const b = new Uint8Array(4);
  const view = new DataView(b.buffer);
  view.setUint32(0, value >>> 0, true);
  return b;
}

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function zip(files: Array<{ name: string; content: string }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = textEncoder.encode(file.name);
    const content = textEncoder.encode(file.content);
    const crc = crc32(content);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(content.length), u32(content.length), u16(name.length), u16(0), name, content,
    ]);
    localParts.push(local);

    centralParts.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(content.length), u32(content.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }

  const central = concat(centralParts);
  return concat([
    ...localParts,
    central,
    concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)]),
  ]);
}

function cellXml(ref: string, value: XlsxCellValue, style = 0, numeric = false) {
  if (value === null || value === undefined || value === '') return `<c r="${ref}" s="${style}"/>`;
  if (numeric && typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function safeSheetName(name: string) {
  const clean = name.replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31);
  return clean || 'Export';
}

export function exportStyledXlsx<T>(options: ExportStyledXlsxOptions<T>) {
  const { filename, sheetName, title, subtitle, columns, rows, summary = [] } = options;
  const colCount = Math.max(columns.length, 1);
  const lastCol = columnLetter(colCount - 1);
  let rowIndex = 1;
  const xmlRows: string[] = [];

  xmlRows.push(`<row r="${rowIndex}">${cellXml(`A${rowIndex}`, title, 1)}${Array.from({ length: colCount - 1 }, (_, i) => cellXml(`${columnLetter(i + 1)}${rowIndex}`, '', 1)).join('')}</row>`);
  const titleRow = rowIndex;
  rowIndex += 1;

  xmlRows.push(`<row r="${rowIndex}">${cellXml(`A${rowIndex}`, subtitle || `Export gegenereerd op ${new Date().toLocaleString('nl-NL')}`, 2)}${Array.from({ length: colCount - 1 }, (_, i) => cellXml(`${columnLetter(i + 1)}${rowIndex}`, '', 2)).join('')}</row>`);
  const subtitleRow = rowIndex;
  rowIndex += 2;

  if (summary.length) {
    const cells: string[] = [];
    summary.slice(0, colCount / 2).forEach((item, index) => {
      const labelCol = index * 2;
      const valueCol = labelCol + 1;
      cells.push(cellXml(`${columnLetter(labelCol)}${rowIndex}`, item.label, 5));
      const valueStyle = item.type === 'currency' ? 6 : item.type === 'number' || item.type === 'integer' ? 7 : 5;
      cells.push(cellXml(`${columnLetter(valueCol)}${rowIndex}`, item.value, valueStyle, item.type === 'currency' || item.type === 'number' || item.type === 'integer'));
    });
    xmlRows.push(`<row r="${rowIndex}">${cells.join('')}</row>`);
    rowIndex += 2;
  }

  xmlRows.push(`<row r="${rowIndex}">${columns.map((column, index) => cellXml(`${columnLetter(index)}${rowIndex}`, column.header, 3)).join('')}</row>`);
  rowIndex += 1;

  rows.forEach((row) => {
    const cells = columns.map((column, index) => {
      const raw = column.value ? column.value(row) : (row as Record<string, XlsxCellValue>)[String(column.key)];
      const style = column.type === 'currency' ? 4 : column.type === 'number' || column.type === 'integer' ? 7 : 0;
      return cellXml(`${columnLetter(index)}${rowIndex}`, raw, style, column.type === 'currency' || column.type === 'number' || column.type === 'integer');
    });
    xmlRows.push(`<row r="${rowIndex}">${cells.join('')}</row>`);
    rowIndex += 1;
  });

  const colsXml = columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width || 18}" customWidth="1"/>`).join('');
  const mergeXml = `<mergeCells count="2"><mergeCell ref="A${titleRow}:${lastCol}${titleRow}"/><mergeCell ref="A${subtitleRow}:${lastCol}${subtitleRow}"/></mergeCells>`;
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${summary.length ? 6 : 4}" topLeftCell="A${summary.length ? 7 : 5}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${colsXml}</cols><sheetData>${xmlRows.join('')}</sheetData>${mergeXml}<autoFilter ref="A${summary.length ? 6 : 4}:${lastCol}${Math.max(rowIndex - 1, summary.length ? 6 : 4)}"/><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(safeSheetName(sheetName))}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="€ #,##0.00"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><b/><sz val="11"/><color rgb="FF1E3A8A"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD7E3F3"/></left><right style="thin"><color rgb="FFD7E3F3"/></right><top style="thin"><color rgb="FFD7E3F3"/></top><bottom style="thin"><color rgb="FFD7E3F3"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

  const bytes = zip([
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rels },
    { name: 'xl/workbook.xml', content: workbook },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet },
    { name: 'xl/styles.xml', content: styles },
  ]);

  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
