import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
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

const LABEL_MAP: Record<string, string> = {
  code: 'Code',
  name: 'Naam',
  description: 'Omschrijving',
  status: 'Status',
  process: 'Proces',
  qualification: 'Kwalificatie',
  material_group: 'Materiaalgroep',
  certificate_no: 'Certificaat',
};

function pickEditableKeys(rows: Array<Record<string, unknown>>) {
  const source = rows[0] || { code: '', name: '', description: '', status: '' };
  return Object.keys(source)
    .filter((key) => !['id', 'created_at', 'updated_at', 'tenant_id'].includes(key))
    .slice(0, 6);
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
  type: 'wps' | 'materials' | 'welders' | 'inspection-templates';
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

  const filteredRows = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search]);
  const visibleKeys = useMemo(() => {
    const source = filteredRows[0] || rows[0] || { id: '', code: '', name: '', status: '' };
    return Object.keys(source).filter((key) => key !== 'id').slice(0, 4);
  }, [filteredRows, rows]);
  const editableKeys = useMemo(() => pickEditableKeys(rows), [rows]);
  const [draft, setDraft] = useState<Record<string, unknown>>(() => Object.fromEntries(pickEditableKeys(rows).map((key) => [key, ''])));

  const openCreate = () => {
    setEditingId(null);
    setDraft(Object.fromEntries(editableKeys.map((key) => [key, ''])));
    setEditorOpen(true);
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    ...visibleKeys.map((key) => ({ key, header: LABEL_MAP[key] || key, sortable: true, cell: (row: Record<string, unknown>) => String(row[key] || '—') })),
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
              setDraft(Object.fromEntries(editableKeys.map((key) => [key, row[key] ?? ''])));
              setEditorOpen(true);
            }}
          >
            Wijzigen
          </Button>
          <Button variant="ghost" disabled={!canWrite} onClick={() => setDeleteRow(row)}><Trash2 size={16} /> Verwijderen</Button>
        </div>
      ),
    },
  ];

  const saveRow = async () => {
    if (!canWrite) return;
    try {
      if (editingId && editingId !== 'new') {
        await updateMutation.mutateAsync({ type, id: editingId, payload: draft });
        setMessage(`${title} bijgewerkt.`);
      } else {
        await createMutation.mutateAsync({ type, payload: draft });
        setMessage(`${title} aangemaakt.`);
      }
      pushNotification({ title: `${title} opgeslagen`, description: 'Wijziging via bestaande settings-endpoints verstuurd.', tone: 'success' });
      setEditorOpen(false);
      setEditingId(null);
      setDraft(Object.fromEntries(editableKeys.map((key) => [key, ''])));
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
      {!canWrite ? (
        <InlineMessage tone="danger">{`Je hebt geen schrijfrechten voor ${title.toLowerCase()}.`}</InlineMessage>
      ) : null}
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
              <Input value={String(draft[key] || '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
            </label>
          ))}
          <div className="stack-actions">
            <Button onClick={saveRow} disabled={!canWrite || createMutation.isPending || updateMutation.isPending}>Opslaan</Button>
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
