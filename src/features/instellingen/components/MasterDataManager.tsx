
import { useMemo, useState } from 'react';
import { Download, Plus, Search, Trash2, Upload } from 'lucide-react';
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
  deleteWelderCertificate,
  downloadWelderCertificate,
  listWelderCertificates,
  uploadWelderCertificate,
  type WelderCertificate,
} from '@/api/welders';

const LABEL_MAP: Record<string, string> = {
  code: 'Code',
  name: 'Naam',
  description: 'Omschrijving',
  status: 'Status',
  process: 'Proces',
  qualification: 'Kwalificatie',
  material_group: 'Materiaalgroep',
  certificate_no: 'Certificaat',
  exc_class: 'Executieklasse',
  is_default: 'Standaard',
  version: 'Versie',
};

function pickEditableKeys(rows: Array<Record<string, unknown>>, type: 'wps' | 'materials' | 'welders' | 'weld-coordinators' | 'inspection-templates') {
  if (type === 'inspection-templates') {
    return ['name', 'exc_class', 'version', 'is_default', 'items_json'];
  }
  if (type === 'welders') {
    return ['code', 'name'];
  }
  if (type === 'weld-coordinators') {
    return ['code', 'name', 'process', 'qualification', 'certificate_no', 'notes'];
  }
  const source = rows[0] || { code: '', name: '', description: '', status: '' };
  return Object.keys(source)
    .filter((key) => !['id', 'created_at', 'updated_at', 'tenant_id'].includes(key))
    .slice(0, 6);
}

function defaultDraft(type: 'wps' | 'materials' | 'welders' | 'weld-coordinators' | 'inspection-templates', rows: Array<Record<string, unknown>>) {
  const keys = pickEditableKeys(rows, type);
  const draft: Record<string, unknown> = Object.fromEntries(keys.map((key) => [key, '']));
  if (type === 'inspection-templates') {
    draft.exc_class = 'EXC2';
    draft.version = 1;
    draft.is_default = false;
    draft.items_json = JSON.stringify([
      { code: 'VISUAL_BASE', title: 'Visuele controle', group: 'algemeen', required: true, default_status: 'conform', sort_order: 1 },
    ], null, 2);
  }
  return draft;
}

function normalizeTemplateDraft(draft: Record<string, unknown>) {
  return {
    name: String(draft.name || ''),
    exc_class: String(draft.exc_class || 'EXC2'),
    version: Number(draft.version || 1),
    is_default: Boolean(draft.is_default),
    items_json: typeof draft.items_json === 'string' ? JSON.parse(draft.items_json || '[]') : draft.items_json,
  };
}

function downloadBlob(filename: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
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
  type: 'wps' | 'materials' | 'welders' | 'weld-coordinators' | 'inspection-templates';
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

  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [certificateOwner, setCertificateOwner] = useState<Record<string, unknown> | null>(null);
  const [certificateRows, setCertificateRows] = useState<WelderCertificate[]>([]);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

  const filteredRows = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search]);
  const visibleKeys = useMemo(() => {
    const source = filteredRows[0] || rows[0] || { id: '', code: '', name: '', status: '' };
    return Object.keys(source).filter((key) => key !== 'id').slice(0, 4);
  }, [filteredRows, rows]);
  const editableKeys = useMemo(() => pickEditableKeys(rows, type), [rows, type]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(defaultDraft(type, rows));
    setEditorOpen(true);
  };

  async function openCertificates(row: Record<string, unknown>) {
    const welderId = String(row.id || '');
    if (!welderId) return;
    setCertificateOwner(row);
    setCertificateModalOpen(true);
    setCertificateLoading(true);
    try {
      const response = await listWelderCertificates(welderId);
      setCertificateRows(response || []);
    } catch (error) {
      setCertificateRows([]);
      setMessage(error instanceof Error ? error.message : 'Certificaten laden mislukt.');
    } finally {
      setCertificateLoading(false);
    }
  }

  const columns: ColumnDef<Record<string, unknown>>[] = [
    ...visibleKeys.map((key) => ({
      key,
      header: LABEL_MAP[key] || key,
      sortable: true,
      cell: (row: Record<string, unknown>) => String(row[key] || '—'),
    })),
    {
      key: 'actions',
      header: 'Acties',
      cell: (row) => (
        <div className="row-actions">
          <Button
            variant="secondary"
            disabled={!canWrite}
            onClick={() => {
              setEditingId(String(row.id || 'new'));
              const nextDraft = Object.fromEntries(editableKeys.map((key) => [key, row[key] ?? '']));
              if (type === 'inspection-templates') {
                nextDraft.items_json = JSON.stringify(row.items_json || [], null, 2);
              }
              setDraft(nextDraft);
              setEditorOpen(true);
            }}
          >
            Wijzigen
          </Button>
          {type === 'welders' ? (
            <Button variant="secondary" onClick={() => void openCertificates(row)}>
              <Upload size={16} /> Certificaten
            </Button>
          ) : null}
          <Button variant="ghost" disabled={!canWrite} onClick={() => setDeleteRow(row)}><Trash2 size={16} /> Verwijderen</Button>
        </div>
      ),
    },
  ];

  const saveRow = async () => {
    if (!canWrite) return;
    try {
      const payload = type === 'inspection-templates' ? normalizeTemplateDraft(draft) : draft;
      if (editingId && editingId !== 'new') {
        await updateMutation.mutateAsync({ type, id: editingId, payload });
        setMessage(`${title} bijgewerkt.`);
      } else {
        await createMutation.mutateAsync({ type, payload });
        setMessage(`${title} aangemaakt.`);
      }
      pushNotification({ title: `${title} opgeslagen`, description: 'Wijziging via bestaande settings-endpoints verstuurd.', tone: 'success' });
      setEditorOpen(false);
      setEditingId(null);
      setDraft(defaultDraft(type, rows));
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
      pushNotification({ title: `${title} verwijderd`, description: 'Verwijderactie via bestaande settings-endpoints verstuurd.', tone: 'success' });
      setDeleteRow(null);
      refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
      pushNotification({ title: `${title} verwijderen mislukt`, description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'error' });
    }
  };

  async function handleCertificateUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!certificateOwner?.id || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    setUploadingCertificate(true);
    try {
      await uploadWelderCertificate(String(certificateOwner.id), file);
      const response = await listWelderCertificates(String(certificateOwner.id));
      setCertificateRows(response || []);
      setMessage('Lascertificaat toegevoegd.');
      pushNotification({ title: 'Lascertificaat toegevoegd', description: file.name, tone: 'success' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload mislukt.');
      pushNotification({ title: 'Upload mislukt', description: error instanceof Error ? error.message : 'Onbekende fout', tone: 'error' });
    } finally {
      setUploadingCertificate(false);
      event.target.value = '';
    }
  }

  async function handleCertificateDownload(certificate: WelderCertificate) {
    try {
      const blob = await downloadWelderCertificate(String(certificate.id));
      downloadBlob(certificate.filename || 'certificaat.bin', blob);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download mislukt.');
    }
  }

  async function handleCertificateDelete(certificate: WelderCertificate) {
    try {
      await deleteWelderCertificate(String(certificate.id));
      setCertificateRows((current) => current.filter((item) => String(item.id) !== String(certificate.id)));
      setMessage('Lascertificaat verwijderd.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
    }
  }

  return (
    <Card>
      <div className="section-title-row">
        <h3>{title}</h3>
        <div className="inline-end-cluster">
          <Badge tone={canWrite ? 'success' : 'warning'}>{canWrite ? 'CRUD actief' : 'Alleen lezen'}</Badge>
          <Button onClick={openCreate} disabled={!canWrite}><Plus size={16} /> Nieuw</Button>
        </div>
      </div>
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {!canWrite ? <InlineMessage tone="danger">{`Je hebt geen schrijfrechten voor ${title.toLowerCase()}.`}</InlineMessage> : null}
      <div className="toolbar-shell">
        <div className="search-shell inline-search-shell"><Search size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Zoek in ${title.toLowerCase()}`} /></div>
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
              {type === 'inspection-templates' && key === 'exc_class' ? (
                <select value={String(draft[key] || 'EXC2')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}>
                  <option value="EXC1">EXC1</option>
                  <option value="EXC2">EXC2</option>
                  <option value="EXC3">EXC3</option>
                  <option value="EXC4">EXC4</option>
                </select>
              ) : type === 'inspection-templates' && key === 'is_default' ? (
                <select value={String(Boolean(draft[key]))} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value === 'true' }))}>
                  <option value="false">Nee</option>
                  <option value="true">Ja</option>
                </select>
              ) : key === 'items_json' ? (
                <textarea value={String(draft[key] || '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} style={{ minHeight: 220 }} />
              ) : (
                <Input value={String(draft[key] || '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
              )}
            </label>
          ))}
          <div className="stack-actions">
            <Button onClick={saveRow} disabled={!canWrite || createMutation.isPending || updateMutation.isPending}>Opslaan</Button>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button>
          </div>
        </div>
      </Modal>

      <Modal open={certificateModalOpen} title={`Lascertificaten · ${String(certificateOwner?.name || certificateOwner?.code || '')}`} onClose={() => setCertificateModalOpen(false)}>
        <div className="page-stack">
          <div className="stack-actions">
            <label className="button button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Upload size={16} /> {uploadingCertificate ? 'Uploaden...' : 'Certificaat uploaden'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" hidden onChange={handleCertificateUpload} disabled={uploadingCertificate} />
            </label>
          </div>
          {certificateLoading ? <LoadingState label="Certificaten laden..." /> : null}
          {!certificateLoading && certificateRows.length === 0 ? <EmptyState title="Geen certificaten" description="Voeg hier lascertificaten toe voor deze lasser." /> : null}
          {!certificateLoading && certificateRows.length > 0 ? (
            <div className="list-stack compact-list">
              {certificateRows.map((certificate) => (
                <div key={String(certificate.id)} className="list-row">
                  <div>
                    <strong>{certificate.filename}</strong>
                    <div className="list-subtle">{certificate.uploaded_at || 'Onbekende datum'}</div>
                  </div>
                  <div className="inline-end-cluster">
                    <Button variant="secondary" onClick={() => void handleCertificateDownload(certificate)}><Download size={16} /> Download</Button>
                    <Button variant="ghost" onClick={() => void handleCertificateDelete(certificate)}><Trash2 size={16} /> Verwijderen</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
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
