import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileText, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/datatable/DataTable';
import { Modal } from '@/components/modal/Modal';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { useCreateMasterData, useDeleteMasterData, useUpdateMasterData } from '@/hooks/useSettings';
import { useUiStore } from '@/app/store/ui-store';
import { useAccess } from '@/hooks/useAccess';
import { exportStyledXlsx, type XlsxColumn } from '@/lib/xlsxExport';
import {
  deleteEntityDocument,
  downloadEntityDocument,
  listEntityDocuments,
  uploadEntityDocuments,
  type EntityDocument,
  type EntityDocumentScope,
} from '@/api/entityDocuments';

export type MasterDataType = 'wps' | 'materials' | 'welders' | 'weld-coordinators' | 'inspection-templates';
type PreviewState = { url: string; mimeType: string; filename: string } | null;
type MasterDataRow = Record<string, unknown>;
type ImportAction = 'create' | 'update' | 'skip' | 'error';
type WelderImportPreviewItem = {
  rowNumber: number;
  action: ImportAction;
  reason: string;
  payload: MasterDataRow;
  existingId?: string | number;
};
type WelderImportPreview = {
  filename: string;
  items: WelderImportPreviewItem[];
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

const WELDER_KEYS = [
  'certificate_no',
  'process',
  'type_of_weld',
  'base_metal',
  'filler_material',
  'welding_position',
  'range_material_thickness',
  'range_outside_pipe_diameter',
  'name',
  'valid_until',
  'notes',
];

const LABEL_MAP: Record<string, string> = {
  code: 'Code',
  name: 'Welder',
  title: 'Naam / titel',
  kind: 'Type',
  description: 'Omschrijving',
  status: 'Status',
  process: 'Welding process',
  welding_method: 'Lasmethode',
  qualification: 'Kwalificatie',
  material_group: 'Materiaalgroep',
  thickness_range: 'Diktebereik',
  welding_position: 'Welding positions',
  certificate_no: 'Certificate No. (9606-1)',
  type_of_weld: 'Type of weld',
  base_metal: 'Base metal',
  filler_material: 'Filler material',
  range_material_thickness: 'Range material thickness',
  range_outside_pipe_diameter: 'Range outside pipe diameter',
  valid_until: 'Valid until',
  document_no: 'Documentnummer',
  norm: 'Norm',
  level: 'Niveau',
  email: 'E-mail',
  notes: 'Opmerkingen',
  exc_class: 'Executieklasse',
  is_default: 'Standaard',
  version: 'Versie',
  items_json: 'Template items',
};

const WELDER_IMPORT_HEADERS: Record<string, string> = {
  id: 'id',
  code: 'certificate_no',
  certificate_no: 'certificate_no',
  certificate_number: 'certificate_no',
  certificaatnummer: 'certificate_no',
  cert_no: 'certificate_no',
  certificate: 'certificate_no',
  '9606_1': 'certificate_no',
  welder: 'name',
  lasser: 'name',
  name: 'name',
  naam: 'name',
  process: 'process',
  proces: 'process',
  welding_process: 'process',
  lasproces: 'process',
  type_of_weld: 'type_of_weld',
  type_las: 'type_of_weld',
  weld_type: 'type_of_weld',
  base_metal: 'base_metal',
  base_material: 'base_metal',
  basismateriaal: 'base_metal',
  filler_material: 'filler_material',
  toevoegmateriaal: 'filler_material',
  welding_positions: 'welding_position',
  welding_position: 'welding_position',
  lasposities: 'welding_position',
  laspositie: 'welding_position',
  positions: 'welding_position',
  material_group: 'filler_material',
  materiaalgroep: 'filler_material',
  thickness_range: 'range_material_thickness',
  diktebereik: 'range_material_thickness',
  range_material_thickness: 'range_material_thickness',
  materiaaldiktebereik: 'range_material_thickness',
  range_outside_pipe_diameter: 'range_outside_pipe_diameter',
  pipe_diameter_range: 'range_outside_pipe_diameter',
  diameterbereik: 'range_outside_pipe_diameter',
  buisdiameterbereik: 'range_outside_pipe_diameter',
  valid_until: 'valid_until',
  valid_untill: 'valid_until',
  geldig_tot: 'valid_until',
  vervaldatum: 'valid_until',
  notes: 'notes',
  opmerkingen: 'notes',
};

function documentScopeFor(type: MasterDataType): EntityDocumentScope | null {
  if (type === 'welders') return 'welder';
  if (type === 'wps') return 'wps';
  if (type === 'weld-coordinators') return 'weld-coordinator';
  return null;
}

function documentKindFor(type: MasterDataType) {
  return type === 'welders' || type === 'weld-coordinators' ? 'certificate' : 'document';
}

function pickEditableKeys(rows: MasterDataRow[], type: MasterDataType) {
  if (type === 'inspection-templates') return ['name', 'exc_class', 'version', 'is_default', 'items_json'];
  if (type === 'welders') return WELDER_KEYS;
  if (type === 'weld-coordinators') return ['code', 'name', 'email', 'level', 'process', 'qualification', 'certificate_no', 'notes'];
  if (type === 'wps') return ['kind', 'code', 'title', 'document_no', 'version', 'process', 'welding_method', 'material_group', 'thickness_range', 'welding_position', 'norm', 'status', 'notes'];
  const source = rows[0] || { code: '', name: '', description: '', status: '' };
  return Object.keys(source).filter((key) => !['id', 'created_at', 'updated_at', 'tenant_id'].includes(key)).slice(0, 6);
}

function readValue(row: MasterDataRow, key: string): unknown {
  if (key === 'certificate_no') return row.certificate_no ?? row.code;
  if (key === 'process') return row.process ?? row.welding_process;
  if (key === 'welding_position') return row.welding_position ?? row.position;
  if (key === 'range_material_thickness') return row.range_material_thickness ?? row.thickness_range;
  if (key === 'range_outside_pipe_diameter') return row.range_outside_pipe_diameter ?? row.diameter_range;
  if (key === 'name') return row.name ?? row.full_name ?? row.display_name;
  if (key === 'valid_until') return row.valid_until ?? row.qualification_expiry ?? row.expiry_date;
  return row[key];
}

function displayValue(row: MasterDataRow, key: string): string {
  const value = readValue(row, key);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function exportCell(row: MasterDataRow, key: string): string {
  const value = readValue(row, key);
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function normalizeKey(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function defaultDraft(type: MasterDataType, rows: MasterDataRow[]): MasterDataRow {
  const draft: MasterDataRow = Object.fromEntries(pickEditableKeys(rows, type).map((key) => [key, '']));
  if (type === 'inspection-templates') {
    draft.exc_class = 'EXC2';
    draft.version = 1;
    draft.is_default = false;
    draft.items_json = JSON.stringify([{ code: 'VISUAL_BASE', title: 'Visuele controle', group: 'algemeen', required: true, default_status: 'conform', sort_order: 1 }], null, 2);
  }
  if (type === 'wps') {
    draft.kind = 'WPS';
    draft.status = 'actief';
  }
  if (type === 'weld-coordinators') draft.level = 'IWT';
  return draft;
}

function normalizeDraft(type: MasterDataType, draft: MasterDataRow): MasterDataRow {
  if (type === 'inspection-templates') {
    return {
      name: String(draft.name || ''),
      exc_class: String(draft.exc_class || 'EXC2'),
      version: Number(draft.version || 1),
      is_default: Boolean(draft.is_default),
      items_json: typeof draft.items_json === 'string' ? JSON.parse(draft.items_json || '[]') : draft.items_json,
    };
  }
  const normalized: MasterDataRow = {};
  Object.entries(draft).forEach(([key, value]) => {
    normalized[key] = typeof value === 'string' ? value.trim() : value;
  });
  if (type === 'wps' && normalized.kind === 'WPQ') normalized.kind = 'WPQR';
  if (type === 'welders' && !normalized.code && normalized.certificate_no) normalized.code = normalized.certificate_no;
  return normalized;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function extractId(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const direct = (result as MasterDataRow).id;
  if (direct) return String(direct);
  const data = (result as MasterDataRow).data;
  if (data && typeof data === 'object' && (data as MasterDataRow).id) return String((data as MasterDataRow).id);
  return null;
}

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeImportHeader(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/[.:()]/g, '').replace(/\s+/g, '_').replace(/-/g, '_');
}

function parseDelimited(text: string): string[][] {
  const delimiter = text.includes('\t') ? '\t' : text.includes(';') ? ';' : ',';
  return text
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"').trim()))
    .filter((line) => line.some(Boolean));
}

function parseHtmlRows(text: string): string[][] {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return Array.from(doc.querySelectorAll('tr'))
    .map((row) => Array.from(row.querySelectorAll('th,td')).map((cell) => String(cell.textContent || '').trim()))
    .filter((line) => line.some(Boolean));
}

function parseImportRows(text: string): MasterDataRow[] {
  const table = /<table|<tr|<html/i.test(text) ? parseHtmlRows(text) : parseDelimited(text);
  let headerIndex = -1;
  let headerMap: Record<number, string> = {};

  table.some((line, index) => {
    const candidate: Record<number, string> = {};
    line.forEach((header, columnIndex) => {
      const key = WELDER_IMPORT_HEADERS[normalizeImportHeader(header)];
      if (key) candidate[columnIndex] = key;
    });
    if (Object.values(candidate).includes('name') || Object.keys(candidate).length >= 2) {
      headerIndex = index;
      headerMap = candidate;
      return true;
    }
    return false;
  });

  if (headerIndex < 0) throw new Error('Geen geldige kolomkoppen gevonden. Gebruik minimaal Certificate No., Welder en Valid until.');

  return table.slice(headerIndex + 1).map((line) => {
    const item: MasterDataRow = {};
    Object.entries(headerMap).forEach(([columnIndex, key]) => {
      const value = line[Number(columnIndex)]?.trim();
      if (value) item[key] = value;
    });
    if (!item.code && item.certificate_no) item.code = item.certificate_no;
    return item;
  }).filter((item) => Object.values(item).some(Boolean));
}

function buildWelderImportPreview(filename: string, importedRows: MasterDataRow[], existingRows: MasterDataRow[]): WelderImportPreview {
  const existingById = new Map(existingRows.map((row) => [normalizeKey(row.id), row]));
  const existingByCode = new Map(existingRows.map((row) => [normalizeKey(row.code || row.certificate_no), row]).filter(([key]) => Boolean(key)));
  const existingByName = new Map(existingRows.map((row) => [normalizeKey(row.name), row]).filter(([key]) => Boolean(key)));
  const seenCertificates = new Map<string, number>();
  const seenNamesWithoutCertificate = new Map<string, number>();

  const items = importedRows.map((raw, index): WelderImportPreviewItem => {
    const payload = normalizeDraft('welders', raw);
    const certificate = normalizeText(payload.certificate_no || payload.code);
    const name = normalizeText(payload.name);
    const validUntil = normalizeText(payload.valid_until);
    const process = normalizeText(payload.process);
    const rowNumber = index + 1;
    const errors: string[] = [];

    if (!certificate) errors.push('Certificate No. ontbreekt');
    if (!name) errors.push('Welder ontbreekt');
    if (!validUntil) errors.push('Valid until ontbreekt');
    if (!process) errors.push('Welding process ontbreekt');

    const certificateKey = normalizeKey(certificate);
    const nameKey = normalizeKey(name);
    if (certificateKey && seenCertificates.has(certificateKey)) errors.push(`Dubbel certificaat in importbestand: ook regel ${seenCertificates.get(certificateKey)}`);
    if (certificateKey) seenCertificates.set(certificateKey, rowNumber);
    if (!certificateKey && nameKey && seenNamesWithoutCertificate.has(nameKey)) errors.push(`Dubbele lasser zonder certificaatnummer: ook regel ${seenNamesWithoutCertificate.get(nameKey)}`);
    if (!certificateKey && nameKey) seenNamesWithoutCertificate.set(nameKey, rowNumber);

    if (errors.length) return { rowNumber, action: 'error', reason: errors.join(', '), payload };

    const existing = payload.id
      ? existingById.get(normalizeKey(payload.id))
      : existingByCode.get(certificateKey) || existingByName.get(nameKey);

    if (existing?.id) return { rowNumber, action: 'update', reason: 'Bestaand record gevonden op certificaatnummer of naam', payload, existingId: existing.id as string | number };
    return { rowNumber, action: 'create', reason: 'Nieuw record', payload };
  });

  return {
    filename,
    items,
    created: items.filter((item) => item.action === 'create').length,
    updated: items.filter((item) => item.action === 'update').length,
    skipped: items.filter((item) => item.action === 'skip').length,
    errors: items.filter((item) => item.action === 'error').length,
  };
}

export function MasterDataManager({ title, type, rows, isLoading, isError, refetch }: {
  title: string;
  type: MasterDataType;
  rows: MasterDataRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}) {
  const canWrite = useAccess('settings.write');
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();
  const pushNotification = useUiStore((state) => state.pushNotification);
  const welderImportRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<MasterDataRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draft, setDraft] = useState<MasterDataRow>(() => defaultDraft(type, rows));
  const [importPreview, setImportPreview] = useState<WelderImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  const [docRows, setDocRows] = useState<EntityDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewState>(null);

  const scope = documentScopeFor(type);
  const documentLabel = type === 'welders' || type === 'weld-coordinators' ? 'Certificaten' : 'Documenten';

  useEffect(() => () => {
    if (preview?.url) window.URL.revokeObjectURL(preview.url);
  }, [preview?.url]);

  const filteredRows = useMemo<MasterDataRow[]>(
    () => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const editableKeys = useMemo(() => pickEditableKeys(rows, type), [rows, type]);
  const visibleKeys = useMemo(() => {
    const preferred = editableKeys.filter((key) => !['notes', 'items_json'].includes(key));
    if (type === 'welders') return preferred;
    const available = preferred.filter((key) => filteredRows.some((row) => row[key] !== undefined && row[key] !== null && row[key] !== ''));
    return (available.length ? available : preferred).slice(0, 6);
  }, [editableKeys, filteredRows, type]);

  async function refreshDocuments(entityId: string) {
    if (!scope || !entityId) return;
    setDocLoading(true);
    try {
      setDocRows((await listEntityDocuments(scope, entityId, documentKindFor(type))) || []);
    } catch (error) {
      setDocRows([]);
      setMessage(error instanceof Error ? error.message : `${documentLabel} laden mislukt.`);
    } finally {
      setDocLoading(false);
    }
  }

  const openCreate = () => {
    setEditingId(null);
    setDraft(defaultDraft(type, rows));
    setPendingFiles([]);
    setDocRows([]);
    setPreview(null);
    setEditorOpen(true);
  };

  const openEdit = (row: MasterDataRow) => {
    const rowId = String(row.id || 'new');
    setEditingId(rowId);
    const nextDraft = Object.fromEntries(editableKeys.map((key) => [key, exportCell(row, key)])) as MasterDataRow;
    if (type === 'inspection-templates') nextDraft.items_json = JSON.stringify(row.items_json || [], null, 2);
    setDraft(nextDraft);
    setPendingFiles([]);
    setDocRows([]);
    setPreview(null);
    setEditorOpen(true);
    if (scope && rowId !== 'new') void refreshDocuments(rowId);
  };

  async function uploadFilesForEntity(entityId: string, files: File[] | FileList) {
    if (!scope || !files || files.length === 0) return;
    setDocUploading(true);
    try {
      await uploadEntityDocuments(scope, entityId, files, documentKindFor(type));
      await refreshDocuments(entityId);
      setPendingFiles([]);
      setMessage(`${documentLabel} toegevoegd.`);
      pushNotification({ title: `${documentLabel} toegevoegd`, description: `${files.length} bestand(en) geüpload.`, tone: 'success' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload mislukt.');
      pushNotification({ title: 'Upload mislukt', description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'error' });
    } finally {
      setDocUploading(false);
    }
  }

  async function handleExistingUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!editingId || editingId === 'new' || !event.target.files?.length) return;
    await uploadFilesForEntity(String(editingId), event.target.files);
    event.target.value = '';
  }

  function handlePendingUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return;
    const files = Array.from(event.target.files || []);
    setPendingFiles((current) => [...current, ...files]);
    const firstImage = files.find((file) => file.type.startsWith('image/'));
    if (firstImage) {
      if (preview?.url) window.URL.revokeObjectURL(preview.url);
      setPreview({ url: window.URL.createObjectURL(firstImage), mimeType: firstImage.type, filename: firstImage.name });
    }
    event.target.value = '';
  }

  async function handleDocumentDownload(document: EntityDocument) {
    try {
      downloadBlob(document.filename || 'document.bin', await downloadEntityDocument(String(document.id)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download mislukt.');
    }
  }

  async function handleDocumentPreview(document: EntityDocument) {
    try {
      const blob = await downloadEntityDocument(String(document.id));
      if (preview?.url) window.URL.revokeObjectURL(preview.url);
      setPreview({ url: window.URL.createObjectURL(blob), mimeType: document.mime_type || blob.type || 'application/octet-stream', filename: document.filename || 'document' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Preview mislukt.');
    }
  }

  async function handleDocumentDelete(document: EntityDocument) {
    try {
      await deleteEntityDocument(String(document.id));
      setDocRows((current) => current.filter((item) => String(item.id) !== String(document.id)));
      setMessage(`${documentLabel} verwijderd.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
    }
  }

  async function exportWelders() {
    const columns: Array<XlsxColumn<MasterDataRow>> = [
      { key: 'certificate_no', header: 'Certificate No. (9606-1)', width: 28, value: (row) => exportCell(row, 'certificate_no') },
      { key: 'process', header: 'Welding process', width: 18, value: (row) => exportCell(row, 'process') },
      { key: 'type_of_weld', header: 'Type of weld', width: 16, value: (row) => exportCell(row, 'type_of_weld') },
      { key: 'base_metal', header: 'Base metal', width: 14, value: (row) => exportCell(row, 'base_metal') },
      { key: 'filler_material', header: 'Filler material', width: 18, value: (row) => exportCell(row, 'filler_material') },
      { key: 'welding_position', header: 'Welding positions', width: 20, value: (row) => exportCell(row, 'welding_position') },
      { key: 'range_material_thickness', header: 'Range material thickness', width: 24, value: (row) => exportCell(row, 'range_material_thickness') },
      { key: 'range_outside_pipe_diameter', header: 'Range outside pipe diameter', width: 26, value: (row) => exportCell(row, 'range_outside_pipe_diameter') },
      { key: 'name', header: 'Welder', width: 24, value: (row) => exportCell(row, 'name') },
      { key: 'valid_until', header: 'Valid until', width: 16, value: (row) => exportCell(row, 'valid_until') },
    ];
    await exportStyledXlsx({
      filename: `WeldInspect-Pro-Welding-Qualification-Summary-${todayStamp()}.xls`,
      sheetName: 'Welding Qualification',
      title: 'WeldInspect Pro — Summary of Welding Qualification',
      subtitle: `Lasserscertificeringsoverzicht · ${new Date().toLocaleString('nl-NL')} · ${filteredRows.length} lassers`,
      summary: [{ label: 'Aantal lassers', value: filteredRows.length, type: 'integer' }],
      columns,
      rows: filteredRows,
    });
  }

  async function importWelders(file: File | undefined) {
    if (!file || !canWrite) return;
    try {
      const importedRows = parseImportRows(await file.text());
      const nextPreview = buildWelderImportPreview(file.name, importedRows, rows);
      setImportPreview(nextPreview);
      setMessage(nextPreview.errors ? `Import gecontroleerd: ${nextPreview.errors} fout(en). Los deze op voordat je definitief importeert.` : 'Import gecontroleerd. Controleer de preview en klik daarna op Definitief importeren.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Welders import controleren mislukt.');
      pushNotification({ title: 'Welders import controleren mislukt', description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'error' });
    } finally {
      if (welderImportRef.current) welderImportRef.current.value = '';
    }
  }

  async function confirmWelderImport() {
    if (!importPreview || importPreview.errors > 0 || importing) return;
    setImporting(true);
    try {
      let created = 0;
      let updated = 0;
      const writableItems = importPreview.items.filter((item) => item.action === 'create' || item.action === 'update');
      for (const item of writableItems) {
        if (item.action === 'update' && item.existingId) {
          await updateMutation.mutateAsync({ type: 'welders', id: item.existingId, payload: item.payload });
          updated += 1;
        }
        if (item.action === 'create') {
          await createMutation.mutateAsync({ type: 'welders', payload: item.payload });
          created += 1;
        }
      }
      setMessage(`Welders import gereed: ${created} nieuw, ${updated} bijgewerkt, ${importPreview.skipped} overgeslagen.`);
      pushNotification({ title: 'Welders geïmporteerd', description: `${created} nieuw, ${updated} bijgewerkt.`, tone: 'success' });
      setImportPreview(null);
      refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Definitieve import mislukt. Reeds verwerkte regels kunnen zijn opgeslagen; controleer de lijst en importeer daarna alleen resterende regels.');
      pushNotification({ title: 'Welders import mislukt', description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'error' });
    } finally {
      setImporting(false);
    }
  }

  const saveRow = async () => {
    if (!canWrite) return;
    try {
      const payload = normalizeDraft(type, draft);
      let savedId: string | null = editingId ? String(editingId) : null;
      if (editingId && editingId !== 'new') {
        const result = await updateMutation.mutateAsync({ type, id: editingId, payload });
        savedId = extractId(result) || savedId;
        setMessage(`${title} bijgewerkt.`);
      } else {
        const result = await createMutation.mutateAsync({ type, payload });
        savedId = extractId(result);
        setMessage(`${title} aangemaakt.`);
      }
      if (scope && savedId && pendingFiles.length > 0) await uploadFilesForEntity(savedId, pendingFiles);
      pushNotification({ title: `${title} opgeslagen`, description: 'Wijziging opgeslagen.', tone: 'success' });
      setEditorOpen(false);
      setEditingId(null);
      setDraft(defaultDraft(type, rows));
      setPendingFiles([]);
      setDocRows([]);
      refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Opslaan mislukt.');
      pushNotification({ title: `${title} opslaan mislukt`, description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'error' });
    }
  };

  const removeRow = async () => {
    if (!deleteRow?.id || !canWrite) return;
    try {
      await deleteMutation.mutateAsync({ type, id: deleteRow.id as string | number });
      setMessage(`${title} verwijderd.`);
      pushNotification({ title: `${title} verwijderd`, description: 'Verwijderd.', tone: 'success' });
      setDeleteRow(null);
      refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
      pushNotification({ title: `${title} verwijderen mislukt`, description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'error' });
    }
  };

  const columns: ColumnDef<MasterDataRow>[] = [
    ...visibleKeys.map((key) => ({
      key,
      header: LABEL_MAP[key] || key,
      sortable: true,
      cell: (row: MasterDataRow) => displayValue(row, key),
    })),
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <Button variant="secondary" disabled={!canWrite} onClick={() => openEdit(row)}>Wijzigen</Button>
          {scope ? <Button variant="secondary" onClick={() => openEdit(row)}><Upload size={16} /> {documentLabel}</Button> : null}
          <Button variant="ghost" disabled={!canWrite} onClick={() => setDeleteRow(row)}><Trash2 size={16} /> Verwijderen</Button>
        </div>
      ),
    },
  ];

  const previewColumns: ColumnDef<WelderImportPreviewItem>[] = [
    { key: 'rowNumber', header: 'Regel', cell: (item) => String(item.rowNumber) },
    { key: 'action', header: 'Actie', cell: (item) => item.action === 'create' ? 'Nieuw' : item.action === 'update' ? 'Bijwerken' : item.action === 'error' ? 'Fout' : 'Overslaan' },
    { key: 'certificate', header: 'Certificate No.', cell: (item) => exportCell(item.payload, 'certificate_no') || '—' },
    { key: 'welder', header: 'Welder', cell: (item) => exportCell(item.payload, 'name') || '—' },
    { key: 'validUntil', header: 'Valid until', cell: (item) => exportCell(item.payload, 'valid_until') || '—' },
    { key: 'reason', header: 'Controle', cell: (item) => item.reason },
  ];

  const renderField = (key: string) => {
    if (type === 'inspection-templates' && key === 'exc_class') return <select value={String(draft[key] ?? 'EXC2')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select>;
    if (type === 'inspection-templates' && key === 'is_default') return <select value={String(Boolean(draft[key]))} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value === 'true' }))}><option value="false">Nee</option><option value="true">Ja</option></select>;
    if (key === 'items_json' || key === 'notes') return <textarea value={String(draft[key] ?? '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} style={{ minHeight: key === 'items_json' ? 220 : 96 }} />;
    if (key === 'kind') return <select value={String(draft[key] ?? 'WPS')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="WPS">WPS</option><option value="WPQR">WPQR</option></select>;
    if (key === 'process') return <select value={String(draft[key] ?? '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="">Kies proces</option><option value="111">111 BMBE</option><option value="135">135 MAG</option><option value="136">136 MAG gevulde draad</option><option value="138">138 MAG metaalpoeder</option><option value="141">141 TIG</option></select>;
    if (key === 'level') return <select value={String(draft[key] ?? 'IWT')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="IWE">IWE</option><option value="IWT">IWT</option><option value="IWS">IWS</option><option value="RWC">RWC</option></select>;
    return <Input value={String(draft[key] ?? '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />;
  };

  const renderDocumentSection = () => {
    if (!scope) return null;
    const isExisting = Boolean(editingId && editingId !== 'new');
    return (
      <div className="master-data-documents-panel" style={{ marginTop: 20, padding: 16, border: '1px solid #dbe7ff', borderRadius: 16, background: '#f8fbff', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="section-title-row">
          <div>
            <h3 style={{ margin: 0 }}>{documentLabel}</h3>
            <p className="list-subtle" style={{ margin: '4px 0 0' }}>Upload certificaten, WPS/WPQR-documenten, PDF's en foto's direct bij dit masterdata-record.</p>
          </div>
          <label className="button button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Upload size={16} /> {docUploading ? 'Uploaden...' : 'Bestanden toevoegen'}
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" hidden onChange={isExisting ? handleExistingUpload : handlePendingUpload} disabled={docUploading} />
          </label>
        </div>
        {!isExisting ? <InlineMessage tone="neutral">Nieuwe bestanden worden gekoppeld nadat je dit record opslaat. Geselecteerd: {pendingFiles.length} bestand(en).</InlineMessage> : null}
        {pendingFiles.length > 0 ? (
          <div className="list-stack compact-list">
            {pendingFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="list-row">
                <div><strong>{file.name}</strong><div className="list-subtle">{Math.round(file.size / 1024)} KB · klaar voor upload na opslaan</div></div>
                <Button variant="ghost" onClick={() => setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /> Verwijderen</Button>
              </div>
            ))}
          </div>
        ) : null}
        {isExisting && docLoading ? <LoadingState label={`${documentLabel} laden...`} /> : null}
        {isExisting && !docLoading && docRows.length === 0 ? <EmptyState title={`Geen ${documentLabel.toLowerCase()}`} description={`Voeg hier documenten toe voor deze ${title.toLowerCase()}.`} /> : null}
        {isExisting && !docLoading && docRows.length > 0 ? (
          <div className="list-stack compact-list">
            {docRows.map((document) => (
              <div key={String(document.id)} className="list-row">
                <div><strong><FileText size={15} /> {document.filename}</strong><div className="list-subtle">{document.mime_type || 'bestand'} · {document.uploaded_at || 'onbekende datum'}</div></div>
                <div className="inline-end-cluster">
                  <Button variant="secondary" onClick={() => void handleDocumentPreview(document)}><Eye size={16} /> Preview</Button>
                  <Button variant="secondary" onClick={() => void handleDocumentDownload(document)}><Download size={16} /> Download</Button>
                  <Button variant="ghost" onClick={() => void handleDocumentDelete(document)}><Trash2 size={16} /> Verwijderen</Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {preview ? (
          <div style={{ marginTop: 12, border: '1px solid #dbe7ff', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
            <div className="section-title-row" style={{ padding: 12 }}><strong>{preview.filename}</strong><Button variant="ghost" onClick={() => { window.URL.revokeObjectURL(preview.url); setPreview(null); }}><X size={16} /> Sluiten</Button></div>
            {preview.mimeType.startsWith('image/') ? <img src={preview.url} alt={preview.filename} style={{ display: 'block', width: '100%', maxHeight: 520, objectFit: 'contain' }} /> : preview.mimeType.includes('pdf') ? <iframe src={preview.url} title={preview.filename} style={{ width: '100%', height: 520, border: 0 }} /> : <div style={{ padding: 16 }}>Preview niet beschikbaar voor dit bestandstype. Gebruik Download.</div>}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <div className="section-title-row">
        <h3>{title}</h3>
        <div className="inline-end-cluster">
          <Badge tone={canWrite ? 'success' : 'neutral'}>{canWrite ? 'CRUD actief' : 'Alleen lezen'}</Badge>
          {type === 'welders' ? (
            <>
              <Button variant="secondary" onClick={() => void exportWelders()} disabled={!filteredRows.length}><Download size={16} /> Export Excel</Button>
              <Button variant="secondary" onClick={() => welderImportRef.current?.click()} disabled={!canWrite}><Upload size={16} /> Import Excel</Button>
              <input ref={welderImportRef} type="file" accept=".xls,.csv,text/csv,application/vnd.ms-excel" hidden onChange={(event) => void importWelders(event.target.files?.[0])} />
            </>
          ) : null}
          <Button onClick={openCreate} disabled={!canWrite}><Plus size={16} /> Nieuw</Button>
        </div>
      </div>
      {message ? <InlineMessage tone={message.toLowerCase().includes('fout') || message.toLowerCase().includes('mislukt') ? 'error' : 'success'}>{message}</InlineMessage> : null}
      {!canWrite ? <InlineMessage tone="error">{`Je hebt geen schrijfrechten voor ${title.toLowerCase()}.`}</InlineMessage> : null}
      <div className="toolbar-shell"><div className="search-shell inline-search-shell"><Search size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Zoek in ${title.toLowerCase()}`} /></div></div>
      {isLoading ? <LoadingState label={`${title} laden...`} /> : null}
      {isError ? <ErrorState title={`${title} niet geladen`} description="Controleer of het settings-endpoint bereikbaar is." /> : null}
      {!isLoading && !isError && filteredRows.length === 0 ? <EmptyState title={`Geen ${title.toLowerCase()}`} description="Pas je zoekterm aan of maak een nieuw item aan." /> : null}
      {!isLoading && !isError && filteredRows.length > 0 ? <DataTable columns={columns} rows={filteredRows} rowKey={(row) => String(row.id || row.certificate_no || row.code || row.name)} pageSize={8} /> : null}
      <Modal open={editorOpen} title={editingId ? `${title} wijzigen` : `${title} aanmaken`} onClose={() => setEditorOpen(false)}>
        <div className="form-grid">
          {editableKeys.map((key) => <label key={key}><span>{LABEL_MAP[key] || key}</span>{renderField(key)}</label>)}
          {renderDocumentSection()}
          <div className="stack-actions"><Button onClick={saveRow} disabled={!canWrite || createMutation.isPending || updateMutation.isPending || docUploading}>Opslaan</Button><Button variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button></div>
        </div>
      </Modal>
      <Modal open={Boolean(importPreview)} title="Welders import controleren" onClose={() => { if (!importing) setImportPreview(null); }}>
        {importPreview ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <InlineMessage tone={importPreview.errors ? 'error' : 'success'}>
              Bestand: {importPreview.filename} · Nieuw: {importPreview.created} · Bijwerken: {importPreview.updated} · Fouten: {importPreview.errors}
            </InlineMessage>
            <p className="list-subtle" style={{ margin: 0 }}>
              Er wordt nog niets opgeslagen. Controleer eerst deze preview. Definitief importeren is alleen mogelijk zonder foutregels.
            </p>
            <DataTable columns={previewColumns} rows={importPreview.items} rowKey={(item) => `${item.rowNumber}-${item.action}`} pageSize={10} />
            <div className="stack-actions">
              <Button onClick={() => void confirmWelderImport()} disabled={importing || importPreview.errors > 0 || importPreview.created + importPreview.updated === 0}>
                {importing ? 'Importeren...' : 'Definitief importeren'}
              </Button>
              <Button variant="secondary" onClick={() => setImportPreview(null)} disabled={importing}>Annuleren</Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <ConfirmDialog open={Boolean(deleteRow)} title="Item verwijderen" description={`Weet je zeker dat je ${String(deleteRow?.name || deleteRow?.certificate_no || deleteRow?.code || 'dit item')} wilt verwijderen?`} confirmLabel="Verwijderen" cancelLabel="Annuleren" onConfirm={removeRow} onClose={() => setDeleteRow(null)} />
    </Card>
  );
}

export default MasterDataManager;
