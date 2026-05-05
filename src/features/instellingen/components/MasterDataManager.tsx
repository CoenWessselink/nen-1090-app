import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
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

const LABEL_MAP: Record<string, string> = {
  code: 'Code',
  name: 'Naam',
  title: 'Naam / titel',
  kind: 'Type',
  description: 'Omschrijving',
  status: 'Status',
  process: 'Proces',
  welding_method: 'Lasmethode',
  qualification: 'Kwalificatie',
  material_group: 'Materiaalgroep',
  thickness_range: 'Diktebereik',
  welding_position: 'Laspositie',
  certificate_no: 'Certificaatnummer',
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

function documentScopeFor(type: MasterDataType): EntityDocumentScope | null {
  if (type === 'welders') return 'welder';
  if (type === 'wps') return 'wps';
  if (type === 'weld-coordinators') return 'weld-coordinator';
  return null;
}

function documentKindFor(type: MasterDataType): string {
  if (type === 'welders' || type === 'weld-coordinators') return 'certificate';
  return 'document';
}

function pickEditableKeys(rows: Array<Record<string, unknown>>, type: MasterDataType) {
  if (type === 'inspection-templates') return ['name', 'exc_class', 'version', 'is_default', 'items_json'];
  if (type === 'welders') return ['code', 'name', 'process', 'welding_method', 'qualification', 'certificate_no', 'material_group', 'thickness_range', 'welding_position', 'notes'];
  if (type === 'weld-coordinators') return ['code', 'name', 'email', 'level', 'process', 'qualification', 'certificate_no', 'notes'];
  if (type === 'wps') return ['kind', 'code', 'title', 'document_no', 'version', 'process', 'welding_method', 'material_group', 'thickness_range', 'welding_position', 'norm', 'status', 'notes'];
  const source = rows[0] || { code: '', name: '', description: '', status: '' };
  return Object.keys(source).filter((key) => !['id', 'created_at', 'updated_at', 'tenant_id'].includes(key)).slice(0, 6);
}

function defaultDraft(type: MasterDataType, rows: Array<Record<string, unknown>>) {
  const draft: Record<string, unknown> = Object.fromEntries(pickEditableKeys(rows, type).map((key) => [key, '']));
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

function normalizeDraft(type: MasterDataType, draft: Record<string, unknown>) {
  if (type === 'inspection-templates') {
    return {
      name: String(draft.name || ''),
      exc_class: String(draft.exc_class || 'EXC2'),
      version: Number(draft.version || 1),
      is_default: Boolean(draft.is_default),
      items_json: typeof draft.items_json === 'string' ? JSON.parse(draft.items_json || '[]') : draft.items_json,
    };
  }
  const normalized: Record<string, unknown> = {};
  Object.entries(draft).forEach(([key, value]) => {
    normalized[key] = typeof value === 'string' ? value.trim() : value;
  });
  if (type === 'wps' && normalized.kind === 'WPQ') normalized.kind = 'WPQR';
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
  const direct = (result as Record<string, unknown>).id;
  if (direct) return String(direct);
  const data = (result as Record<string, unknown>).data;
  if (data && typeof data === 'object' && (data as Record<string, unknown>).id) {
    return String((data as Record<string, unknown>).id);
  }
  return null;
}

export function MasterDataManager({
  title,
  type,
  rows,
  isLoading,
  isError,
  refetch,
}: {
  title: string;
  type: MasterDataType;
  rows: Array<Record<string, unknown>>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}) {
  const canWrite = useAccess('settings.write');
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();
  const pushNotification = useUiStore((state) => state.pushNotification);

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>(() => defaultDraft(type, rows));

  const [docRows, setDocRows] = useState<EntityDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewState>(null);

  const scope = documentScopeFor(type);
  const documentLabel = type === 'welders' || type === 'weld-coordinators' ? 'Certificaten' : 'Documenten';

  useEffect(() => {
    return () => {
      if (preview?.url) window.URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const filteredRows = useMemo(
    () => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const editableKeys = useMemo(() => pickEditableKeys(rows, type), [rows, type]);

  const visibleKeys = useMemo(() => {
    const preferred = editableKeys.filter((key) => !['notes', 'items_json'].includes(key));
    const available = preferred.filter((key) => filteredRows.some((row) => row[key] !== undefined && row[key] !== null && row[key] !== ''));
    return (available.length ? available : preferred).slice(0, 6);
  }, [editableKeys, filteredRows]);

  async function refreshDocuments(entityId: string) {
    if (!scope || !entityId) return;
    setDocLoading(true);
    try {
      const response = await listEntityDocuments(scope, entityId, documentKindFor(type));
      setDocRows(response || []);
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

  const openEdit = (row: Record<string, unknown>) => {
    const rowId = String(row.id || 'new');
    setEditingId(rowId);
    const nextDraft = Object.fromEntries(editableKeys.map((key) => [key, row[key] ?? '']));
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
      pushNotification({ title: 'Upload mislukt', description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'danger' });
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
    setPendingFiles((current) => [...current, ...Array.from(event.target.files || [])]);
    event.target.value = '';
  }

  async function handleDocumentDownload(document: EntityDocument) {
    try {
      const blob = await downloadEntityDocument(String(document.id));
      downloadBlob(document.filename || 'document.bin', blob);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download mislukt.');
    }
  }

  async function handleDocumentPreview(document: EntityDocument) {
    try {
      const blob = await downloadEntityDocument(String(document.id));
      if (preview?.url) window.URL.revokeObjectURL(preview.url);
      setPreview({
        url: window.URL.createObjectURL(blob),
        mimeType: document.mime_type || blob.type || 'application/octet-stream',
        filename: document.filename || 'document',
      });
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

      if (scope && savedId && pendingFiles.length > 0) {
        await uploadFilesForEntity(savedId, pendingFiles);
      }

      pushNotification({ title: `${title} opgeslagen`, description: 'Wijziging opgeslagen.', tone: 'success' });
      setEditorOpen(false);
      setEditingId(null);
      setDraft(defaultDraft(type, rows));
      setPendingFiles([]);
      setDocRows([]);
      refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Opslaan mislukt.');
      pushNotification({ title: `${title} opslaan mislukt`, description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'danger' });
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
      pushNotification({ title: `${title} verwijderen mislukt`, description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'danger' });
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    ...visibleKeys.map((key) => ({
      key,
      header: LABEL_MAP[key] || key,
      sortable: true,
      cell: (row: Record<string, unknown>) => String(row[key] ?? '—'),
    })),
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <Button variant="secondary" disabled={!canWrite} onClick={() => openEdit(row)}>
            Wijzigen
          </Button>
          {scope ? (
            <Button variant="secondary" onClick={() => openEdit(row)}>
              <Upload size={16} /> {documentLabel}
            </Button>
          ) : null}
          <Button variant="ghost" disabled={!canWrite} onClick={() => setDeleteRow(row)}>
            <Trash2 size={16} /> Verwijderen
          </Button>
        </div>
      ),
    },
  ];

  const renderField = (key: string) => {
    if (type === 'inspection-templates' && key === 'exc_class') {
      return <select value={String(draft[key] ?? 'EXC2')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select>;
    }
    if (type === 'inspection-templates' && key === 'is_default') {
      return <select value={String(Boolean(draft[key]))} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value === 'true' }))}><option value="false">Nee</option><option value="true">Ja</option></select>;
    }
    if (key === 'items_json' || key === 'notes') {
      return <textarea value={String(draft[key] ?? '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} style={{ minHeight: key === 'items_json' ? 220 : 96 }} />;
    }
    if (key === 'kind') {
      return <select value={String(draft[key] ?? 'WPS')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="WPS">WPS</option><option value="WPQR">WPQR</option></select>;
    }
    if (key === 'process') {
      return <select value={String(draft[key] ?? '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="">Kies proces</option><option value="111">111 BMBE</option><option value="135">135 MAG</option><option value="136">136 MAG gevulde draad</option><option value="138">138 MAG metaalpoeder</option><option value="141">141 TIG</option></select>;
    }
    if (key === 'level') {
      return <select value={String(draft[key] ?? 'IWT')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="IWE">IWE</option><option value="IWT">IWT</option><option value="IWS">IWS</option><option value="RWC">RWC</option></select>;
    }
    return <Input value={String(draft[key] ?? '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />;
  };

  const renderDocumentSection = () => {
    if (!scope) return null;
    const isExisting = Boolean(editingId && editingId !== 'new');

    return (
      <div className="page-stack" style={{ marginTop: 20, padding: 16, border: '1px solid #dbe7ff', borderRadius: 16, background: '#f8fbff' }}>
        <div className="section-title-row">
          <div>
            <h3 style={{ margin: 0 }}>{documentLabel}</h3>
            <p className="list-subtle" style={{ margin: '4px 0 0' }}>
              Upload certificaten, WPS/WPQR-documenten, PDF's en foto's direct bij dit masterdata-record.
            </p>
          </div>
          <label className="button button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Upload size={16} /> {docUploading ? 'Uploaden...' : 'Bestanden toevoegen'}
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              hidden
              onChange={isExisting ? handleExistingUpload : handlePendingUpload}
              disabled={docUploading}
            />
          </label>
        </div>

        {!isExisting ? (
          <InlineMessage tone="neutral">
            Nieuwe bestanden worden gekoppeld nadat je dit record opslaat. Geselecteerd: {pendingFiles.length} bestand(en).
          </InlineMessage>
        ) : null}

        {pendingFiles.length > 0 ? (
          <div className="list-stack compact-list">
            {pendingFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="list-row">
                <div>
                  <strong>{file.name}</strong>
                  <div className="list-subtle">{Math.round(file.size / 1024)} KB · klaar voor upload na opslaan</div>
                </div>
                <Button variant="ghost" onClick={() => setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <X size={16} /> Verwijderen
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {isExisting && docLoading ? <LoadingState label={`${documentLabel} laden...`} /> : null}

        {isExisting && !docLoading && docRows.length === 0 ? (
          <EmptyState title={`Geen ${documentLabel.toLowerCase()}`} description={`Voeg hier documenten toe voor deze ${title.toLowerCase()}.`} />
        ) : null}

        {isExisting && !docLoading && docRows.length > 0 ? (
          <div className="list-stack compact-list">
            {docRows.map((document) => (
              <div key={String(document.id)} className="list-row">
                <div>
                  <strong><FileText size={15} /> {document.filename}</strong>
                  <div className="list-subtle">
                    {document.mime_type || 'bestand'} · {document.uploaded_at || 'onbekende datum'}
                  </div>
                </div>
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
            <div className="section-title-row" style={{ padding: 12 }}>
              <strong>{preview.filename}</strong>
              <Button variant="ghost" onClick={() => { window.URL.revokeObjectURL(preview.url); setPreview(null); }}><X size={16} /> Sluiten</Button>
            </div>
            {preview.mimeType.startsWith('image/') ? (
              <img src={preview.url} alt={preview.filename} style={{ display: 'block', width: '100%', maxHeight: 520, objectFit: 'contain' }} />
            ) : preview.mimeType.includes('pdf') ? (
              <iframe src={preview.url} title={preview.filename} style={{ width: '100%', height: 520, border: 0 }} />
            ) : (
              <div style={{ padding: 16 }}>Preview niet beschikbaar voor dit bestandstype. Gebruik Download.</div>
            )}
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
          <Button onClick={openCreate} disabled={!canWrite}><Plus size={16} /> Nieuw</Button>
        </div>
      </div>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {!canWrite ? <InlineMessage tone="danger">{`Je hebt geen schrijfrechten voor ${title.toLowerCase()}.`}</InlineMessage> : null}

      <div className="toolbar-shell">
        <div className="search-shell inline-search-shell">
          <Search size={16} />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Zoek in ${title.toLowerCase()}`} />
        </div>
      </div>

      {isLoading ? <LoadingState label={`${title} laden...`} /> : null}
      {isError ? <ErrorState title={`${title} niet geladen`} description="Controleer of het settings-endpoint bereikbaar is." /> : null}
      {!isLoading && !isError && filteredRows.length === 0 ? <EmptyState title={`Geen ${title.toLowerCase()}`} description="Pas je zoekterm aan of maak een nieuw item aan." /> : null}
      {!isLoading && !isError && filteredRows.length > 0 ? <DataTable columns={columns} rows={filteredRows} rowKey={(row) => String(row.id || row.code || row.name)} pageSize={8} /> : null}

      <Modal open={editorOpen} title={editingId ? `${title} wijzigen` : `${title} aanmaken`} onClose={() => setEditorOpen(false)}>
        <div className="form-grid">
          {editableKeys.map((key) => (
            <label key={key}>
              <span>{LABEL_MAP[key] || key}</span>
              {renderField(key)}
            </label>
          ))}
          {renderDocumentSection()}
          <div className="stack-actions">
            <Button onClick={saveRow} disabled={!canWrite || createMutation.isPending || updateMutation.isPending || docUploading}>
              Opslaan
            </Button>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Item verwijderen"
        description={`Weet je zeker dat je ${String(deleteRow?.name || deleteRow?.code || 'dit item')} wilt verwijderen?`}
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        onConfirm={removeRow}
        onClose={() => setDeleteRow(null)}
      />
    </Card>
  );
}

export default MasterDataManager;
