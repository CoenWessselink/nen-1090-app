import React, { useRef, useState } from 'react';

import { createWelder, updateWelder } from '@/api/settings';
import { exportStyledXlsx } from '@/lib/xlsxExport';
import EnterpriseCard from '../EnterpriseCard';
import EnterpriseTable from '../EnterpriseTable';
import AttachmentList from '../AttachmentList';

interface WeldersSectionProps {
  rows: any[];
}

type WelderImportRow = Record<string, unknown>;

const WELDER_EXPORT_COLUMNS = [
  { key: 'id', header: 'ID', width: 24 },
  { key: 'name', header: 'Welder', width: 28, value: (row: any) => row.name || row.full_name || row.display_name || '' },
  { key: 'qualification_expiry', header: 'Qualification Expiry', width: 20, value: (row: any) => row.qualification_expiry || row.valid_until || row.expiry_date || '' },
  { key: 'certificate_number', header: 'Certificate Number', width: 24, value: (row: any) => row.certificate_number || row.wpq_number || row.qualification_number || '' },
  { key: 'standard', header: 'Standard', width: 18, value: (row: any) => row.standard || row.norm || '' },
  { key: 'process', header: 'Process', width: 18, value: (row: any) => row.process || row.welding_process || '' },
  { key: 'material_group', header: 'Material Group', width: 18, value: (row: any) => row.material_group || row.material || '' },
  { key: 'thickness_range', header: 'Thickness Range', width: 20, value: (row: any) => row.thickness_range || '' },
  { key: 'diameter_range', header: 'Diameter Range', width: 20, value: (row: any) => row.diameter_range || '' },
  { key: 'position', header: 'Position', width: 16, value: (row: any) => row.position || row.welding_position || '' },
  { key: 'valid_from', header: 'Valid From', width: 16, value: (row: any) => row.valid_from || row.issue_date || '' },
  { key: 'status', header: 'Status', width: 16, value: (row: any) => row.status || '' },
  { key: 'certificates', header: 'Certificates', width: 14, type: 'integer' as const, value: (row: any) => Array.isArray(row.certificates) ? row.certificates.length : 0 },
];

const HEADER_TO_FIELD: Record<string, string> = {
  id: 'id',
  welder: 'name',
  lasser: 'name',
  name: 'name',
  naam: 'name',
  full_name: 'name',
  'qualification expiry': 'qualification_expiry',
  qualification_expiry: 'qualification_expiry',
  kwalificatie_vervaldatum: 'qualification_expiry',
  vervaldatum: 'qualification_expiry',
  valid_until: 'qualification_expiry',
  'certificate number': 'certificate_number',
  certificate_number: 'certificate_number',
  certificaatnummer: 'certificate_number',
  wpq_number: 'certificate_number',
  qualification_number: 'certificate_number',
  standard: 'standard',
  norm: 'standard',
  process: 'process',
  proces: 'process',
  welding_process: 'process',
  'material group': 'material_group',
  material_group: 'material_group',
  materiaalgroep: 'material_group',
  'thickness range': 'thickness_range',
  thickness_range: 'thickness_range',
  diktebereik: 'thickness_range',
  'diameter range': 'diameter_range',
  diameter_range: 'diameter_range',
  diameterbereik: 'diameter_range',
  position: 'position',
  positie: 'position',
  welding_position: 'position',
  'valid from': 'valid_from',
  valid_from: 'valid_from',
  geldig_vanaf: 'valid_from',
  issue_date: 'valid_from',
  status: 'status',
};

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeHeader(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/_/g, '_');
}

function cellText(value: unknown) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'text' in value) return String((value as { text?: unknown }).text || '');
  return String(value).trim();
}

async function readWelderImportRows(file: File): Promise<WelderImportRow[]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  let headerRowNumber = 1;
  let headerMap: Record<number, string> = {};

  worksheet.eachRow((row, rowNumber) => {
    if (Object.keys(headerMap).length) return;
    const candidate: Record<number, string> = {};
    row.eachCell((cell, colNumber) => {
      const header = normalizeHeader(cell.value);
      const field = HEADER_TO_FIELD[header] || HEADER_TO_FIELD[header.replace(/ /g, '_')];
      if (field) candidate[colNumber] = field;
    });
    if (Object.keys(candidate).length >= 2 || Object.values(candidate).includes('name')) {
      headerRowNumber = rowNumber;
      headerMap = candidate;
    }
  });

  if (!Object.keys(headerMap).length) throw new Error('Geen geldige kolomkoppen gevonden. Gebruik minimaal Welder/Name en Qualification Expiry.');

  const imported: WelderImportRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;
    const item: WelderImportRow = {};
    Object.entries(headerMap).forEach(([columnNumber, field]) => {
      const value = cellText(row.getCell(Number(columnNumber)).value);
      if (value) item[field] = value;
    });
    if (Object.values(item).some(Boolean)) imported.push(item);
  });
  return imported;
}

function normalizeImportPayload(row: WelderImportRow) {
  const name = String(row.name || '').trim();
  return {
    ...row,
    name,
    qualification_expiry: row.qualification_expiry || row.valid_until || row.expiry_date || '',
    certificate_number: row.certificate_number || row.wpq_number || row.qualification_number || '',
    process: row.process || row.welding_process || '',
    material_group: row.material_group || row.material || '',
    position: row.position || row.welding_position || '',
    status: row.status || 'active',
  };
}

export default function WeldersSection({ rows }: WeldersSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    setMessage(null);
    await exportStyledXlsx({
      filename: `WeldInspect-Pro-Welders-${todayStamp()}.xlsx`,
      sheetName: 'Welders',
      title: 'WeldInspect Pro — Welders',
      subtitle: `Export vanuit Instellingen > Welders · ${new Date().toLocaleString('nl-NL')} · ${rows.length} welders`,
      summary: [
        { label: 'Aantal welders', value: rows.length, type: 'integer' },
      ],
      columns: WELDER_EXPORT_COLUMNS,
      rows,
    });
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const importedRows = await readWelderImportRows(file);
      if (!importedRows.length) throw new Error('Geen welders gevonden in het Excel-bestand.');

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const existingById = new Map(rows.map((row) => [String(row.id || ''), row]));
      const existingByName = new Map(rows.map((row) => [String(row.name || row.full_name || '').trim().toLowerCase(), row]));

      for (const raw of importedRows) {
        const payload = normalizeImportPayload(raw);
        const name = String(payload.name || '').trim();
        if (!name) {
          skipped += 1;
          continue;
        }
        const existing = payload.id ? existingById.get(String(payload.id)) : existingByName.get(name.toLowerCase());
        if (existing?.id) {
          await updateWelder(existing.id, payload);
          updated += 1;
        } else {
          await createWelder(payload);
          created += 1;
        }
      }

      setMessage(`Import gereed: ${created} nieuw, ${updated} bijgewerkt, ${skipped} overgeslagen. Pagina wordt vernieuwd.`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import mislukt. Controleer het Excel-bestand.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <EnterpriseCard title="Welders">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" className="mobile-secondary-button" onClick={() => void handleExport()} disabled={busy || !rows.length}>
          Export Excel
        </button>
        <button type="button" className="mobile-primary-button" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          {busy ? 'Importeren…' : 'Import Excel'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
      </div>
      {message ? <div className="cg-alert" style={{ marginBottom: 12 }}>{message}</div> : null}
      <EnterpriseTable
        rows={rows}
        columns={[
          {
            key: 'id',
            label: 'ID',
          },
          {
            key: 'name',
            label: 'Welder',
          },
          {
            key: 'qualification_expiry',
            label: 'Qualification Expiry',
          },
        ]}
      />

      {rows.map((row) => (
        <AttachmentList
          key={row.id}
          attachments={row.certificates ?? []}
        />
      ))}
    </EnterpriseCard>
  );
}
