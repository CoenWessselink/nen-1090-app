import { useMemo, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Modal } from '@/components/modal/Modal';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { useAccess } from '@/hooks/useAccess';
import {
  useCreateMasterData,
  useDeleteMasterData,
  useDuplicateInspectionTemplate,
  useInspectionTemplates,
  useUpdateMasterData,
} from '@/hooks/useSettings';
import { useUiStore } from '@/app/store/ui-store';

type TemplateStatus = 'conform' | 'defect' | 'gerepareerd';

type TemplateCheck = {
  code: string;
  title: string;
  group: string;
  norm_reference: string;
  required: boolean;
  default_status: TemplateStatus;
  sort_order: number;
};

type TemplateDraft = {
  name: string;
  code: string;
  exc_class: 'EXC1' | 'EXC2' | 'EXC3' | 'EXC4';
  version: number;
  is_default: boolean;
  norms: string[];
  items: TemplateCheck[];
};

type TemplateRow = Record<string, unknown>;

const PRESET_LIBRARY: Record<TemplateDraft['exc_class'], TemplateCheck[]> = {
  EXC1: [
    { code: 'VIS-001', title: 'Visuele controle na hechten', group: 'Visueel', norm_reference: 'NEN-EN 1090-2 / ISO 5817', required: true, default_status: 'conform', sort_order: 1 },
    { code: 'DIM-001', title: 'Maatvoering en passing controleren', group: 'Maatvoering', norm_reference: 'NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 2 },
  ],
  EXC2: [
    { code: 'VIS-001', title: 'Visuele controle van lasrupsen', group: 'Visueel', norm_reference: 'ISO 5817 niveau C', required: true, default_status: 'conform', sort_order: 1 },
    { code: 'WPS-001', title: 'WPS en materiaalcombinatie verifiëren', group: 'Document', norm_reference: 'ISO 3834 / NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 2 },
    { code: 'TRACE-001', title: 'Traceerbaarheid lasser en materiaal', group: 'Traceerbaarheid', norm_reference: 'ISO 3834', required: true, default_status: 'conform', sort_order: 3 },
  ],
  EXC3: [
    { code: 'VIS-001', title: 'Visuele inspectie inclusief randzones', group: 'Visueel', norm_reference: 'ISO 5817 niveau B/C', required: true, default_status: 'conform', sort_order: 1 },
    { code: 'WPS-001', title: 'WPS/WPQR en voorbewerking bevestigen', group: 'Document', norm_reference: 'ISO 3834-2', required: true, default_status: 'conform', sort_order: 2 },
    { code: 'NDT-001', title: 'NDT-verwijzing en inspectieniveau vastleggen', group: 'NDT', norm_reference: 'NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 3 },
  ],
  EXC4: [
    { code: 'VIS-001', title: 'Visuele inspectie volgens hoogste klasse', group: 'Visueel', norm_reference: 'ISO 5817 niveau B', required: true, default_status: 'conform', sort_order: 1 },
    { code: 'WPS-001', title: 'WPS/WPQR, parameters en vrijgave bevestigen', group: 'Document', norm_reference: 'ISO 3834-2', required: true, default_status: 'conform', sort_order: 2 },
    { code: 'NDT-001', title: 'NDT-plan en acceptatiecriteria bevestigen', group: 'NDT', norm_reference: 'NEN-EN 1090-2 / ISO 5817', required: true, default_status: 'conform', sort_order: 3 },
    { code: 'TRACE-001', title: 'Volledige traceerbaarheid vastleggen', group: 'Traceerbaarheid', norm_reference: 'ISO 3834', required: true, default_status: 'conform', sort_order: 4 },
  ],
};

function cloneChecks(items: TemplateCheck[]) {
  return items.map((item) => ({ ...item }));
}

function makeDefaultDraft(excClass: TemplateDraft['exc_class'] = 'EXC2'): TemplateDraft {
  return {
    name: `Inspectietemplate ${excClass}`,
    code: `TPL-${excClass}`,
    exc_class: excClass,
    version: 1,
    is_default: excClass === 'EXC2',
    norms: ['NEN-EN 1090', 'ISO 3834', 'ISO 5817'],
    items: cloneChecks(PRESET_LIBRARY[excClass]),
  };
}

function parseItems(raw: unknown): TemplateCheck[] {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      const row = (item || {}) as Record<string, unknown>;
      return {
        code: String(row.code || `CHECK-${index + 1}`),
        title: String(row.title || row.description || row.code || `Controlepunt ${index + 1}`),
        group: String(row.group || row.group_key || 'Algemeen'),
        norm_reference: String(row.norm_reference || row.norm || row.reference || 'NEN-EN 1090'),
        required: Boolean(row.required ?? true),
        default_status: (String(row.default_status || 'conform').toLowerCase() === 'defect'
          ? 'defect'
          : String(row.default_status || 'conform').toLowerCase() === 'gerepareerd'
            ? 'gerepareerd'
            : 'conform') as TemplateStatus,
        sort_order: Number(row.sort_order || index + 1),
      };
    });
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return parseItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

function rowToDraft(row?: TemplateRow | null): TemplateDraft {
  if (!row) return makeDefaultDraft();
  const excClass = (['EXC1', 'EXC2', 'EXC3', 'EXC4'].includes(String(row.exc_class || row.execution_class || ''))
    ? String(row.exc_class || row.execution_class)
    : 'EXC2') as TemplateDraft['exc_class'];
  const normSource = row.norms || row.standards || row.normering;
  const norms = Array.isArray(normSource)
    ? normSource.map((item) => String(item)).filter(Boolean)
    : typeof normSource === 'string'
      ? normSource.split(',').map((item) => item.trim()).filter(Boolean)
      : ['NEN-EN 1090', 'ISO 3834', 'ISO 5817'];
  const items = parseItems(row.items_json ?? row.items);
  return {
    name: String(row.name || row.title || row.code || 'Inspectietemplate'),
    code: String(row.code || row.name || 'TPL'),
    exc_class: excClass,
    version: Number(row.version || 1),
    is_default: Boolean(row.is_default),
    norms,
    items: items.length ? items : cloneChecks(PRESET_LIBRARY[excClass]),
  };
}

function draftToPayload(draft: TemplateDraft) {
  return {
    name: draft.name,
    code: draft.code,
    exc_class: draft.exc_class,
    execution_class: draft.exc_class,
    version: draft.version,
    is_default: draft.is_default,
    norms: draft.norms,
    standards: draft.norms,
    items_json: draft.items,
  } satisfies Record<string, unknown>;
}

function templateSubtitle(row: TemplateRow) {
  const draft = rowToDraft(row);
  return `${draft.exc_class} · v${draft.version} · ${draft.items.length} controlepunten`;
}

export function InspectionTemplatesManager() {
  const canWrite = useAccess('settings.write');
  const pushNotification = useUiStore((state) => state.pushNotification);
  const templatesQuery = useInspectionTemplates();
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const duplicateMutation = useDuplicateInspectionTemplate();
  const deleteMutation = useDeleteMasterData();

  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<TemplateRow | null>(null);
  const [editingRow, setEditingRow] = useState<TemplateRow | null>(null);
  const [draft, setDraft] = useState<TemplateDraft>(makeDefaultDraft());

  const rows = useMemo(() => (templatesQuery.data?.items || []) as TemplateRow[], [templatesQuery.data]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, search]);

  const startCreate = (excClass: TemplateDraft['exc_class'] = 'EXC2') => {
    setEditingRow(null);
    setDraft(makeDefaultDraft(excClass));
    setEditorOpen(true);
  };

  const startEdit = (row: TemplateRow) => {
    setEditingRow(row);
    setDraft(rowToDraft(row));
    setEditorOpen(true);
  };

  const saveTemplate = async () => {
    try {
      const payload = draftToPayload(draft);
      if (editingRow?.id) {
        await updateMutation.mutateAsync({ type: 'inspection-templates', id: editingRow.id as string | number, payload });
        setMessage('Inspectietemplate bijgewerkt.');
      } else {
        await createMutation.mutateAsync({ type: 'inspection-templates', payload });
        setMessage('Inspectietemplate aangemaakt.');
      }
      setEditorOpen(false);
      await templatesQuery.refetch();
      pushNotification({ title: 'Inspectietemplate opgeslagen', description: `${draft.name} is bijgewerkt.`, tone: 'success' });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Onbekende fout';
      setMessage(description);
      pushNotification({ title: 'Inspectietemplate opslaan mislukt', description, tone: 'error' });
    }
  };

  const duplicateTemplate = async (row: TemplateRow) => {
    try {
      if (row.id != null) {
        await duplicateMutation.mutateAsync(row.id as string | number);
      } else {
        const currentDraft = rowToDraft(row);
        await createMutation.mutateAsync({
          type: 'inspection-templates',
          payload: draftToPayload({
            ...currentDraft,
            name: `${currentDraft.name} kopie`,
            code: `${currentDraft.code}-KOPIE`,
          }),
        });
      }
      await templatesQuery.refetch();
      setMessage('Inspectietemplate gedupliceerd.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Dupliceren mislukt.');
    }
  };

  const removeTemplate = async () => {
    if (!deleteRow?.id) return;
    try {
      await deleteMutation.mutateAsync({ type: 'inspection-templates', id: deleteRow.id as string | number });
      setDeleteRow(null);
      setMessage('Inspectietemplate verwijderd.');
      await templatesQuery.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
    }
  };

  return (
    <Card>
      <div className="section-title-row">
        <h3>Inspectietemplates</h3>
        <div className="inline-end-cluster">
          <Badge tone={canWrite ? 'success' : 'warning'}>{canWrite ? 'CRUD actief' : 'Alleen lezen'}</Badge>
          <Button onClick={() => startCreate('EXC2')} disabled={!canWrite}><Plus size={16} /> Nieuwe template</Button>
        </div>
      </div>

      <div className="list-subtle" style={{ marginBottom: 12 }}>
        Templates sturen de controlepunten in de lascontrole-popup aan en zijn voorbereid op NEN-EN 1090, ISO 3834 en ISO 5817.
      </div>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <div className="toolbar-shell" style={{ marginBottom: 16 }}>
        <div className="search-shell inline-search-shell">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op naam, EXC, code of norm" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['EXC1', 'EXC2', 'EXC3', 'EXC4'] as const).map((exc) => (
          <Button key={exc} variant="secondary" onClick={() => startCreate(exc)} disabled={!canWrite}>
            Preset {exc}
          </Button>
        ))}
      </div>

      {templatesQuery.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templatesQuery.isError ? <ErrorState title="Inspectietemplates niet geladen" description="Controleer het settings-contract voor inspection-templates." /> : null}
      {!templatesQuery.isLoading && !templatesQuery.isError && filteredRows.length === 0 ? (
        <EmptyState title="Geen inspectietemplates" description="Maak een template aan per executieklasse of laad eerst backenddata." />
      ) : null}

      {!templatesQuery.isLoading && !templatesQuery.isError && filteredRows.length > 0 ? (
        <div className="list-stack compact-list">
          {filteredRows.map((row) => {
            const draftRow = rowToDraft(row);
            return (
              <div key={String(row.id || row.code || row.name)} className="list-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <strong>{draftRow.name}</strong>
                    <Badge tone="neutral">{draftRow.exc_class}</Badge>
                    {draftRow.is_default ? <Badge tone="success">Standaard</Badge> : null}
                  </div>
                  <div className="list-subtle">{templateSubtitle(row)}</div>
                  <div className="list-subtle">Normering: {draftRow.norms.join(' · ')}</div>
                </div>
                <div className="inline-end-cluster">
                  <Button variant="secondary" onClick={() => startEdit(row)} disabled={!canWrite}>Wijzigen</Button>
                  <Button variant="secondary" onClick={() => void duplicateTemplate(row)} disabled={!canWrite}><Copy size={16} /> Dupliceren</Button>
                  <Button variant="ghost" onClick={() => setDeleteRow(row)} disabled={!canWrite}><Trash2 size={16} /> Verwijderen</Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal open={editorOpen} title={editingRow ? 'Inspectietemplate wijzigen' : 'Inspectietemplate aanmaken'} onClose={() => setEditorOpen(false)}>
        <div className="page-stack">
          <div className="form-grid">
            <label>
              <span>Naam</span>
              <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Code</span>
              <Input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} />
            </label>
            <label>
              <span>Executieklasse</span>
              <select value={draft.exc_class} onChange={(event) => setDraft((current) => ({
                ...current,
                exc_class: event.target.value as TemplateDraft['exc_class'],
                items: cloneChecks(PRESET_LIBRARY[event.target.value as TemplateDraft['exc_class']]),
              }))}>
                <option value="EXC1">EXC1</option>
                <option value="EXC2">EXC2</option>
                <option value="EXC3">EXC3</option>
                <option value="EXC4">EXC4</option>
              </select>
            </label>
            <label>
              <span>Versie</span>
              <Input type="number" value={String(draft.version)} onChange={(event) => setDraft((current) => ({ ...current, version: Number(event.target.value || 1) }))} />
            </label>
            <label>
              <span>Normering (komma gescheiden)</span>
              <Input value={draft.norms.join(', ')} onChange={(event) => setDraft((current) => ({ ...current, norms: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} />
            </label>
            <label>
              <span>Standaardtemplate</span>
              <select value={String(draft.is_default)} onChange={(event) => setDraft((current) => ({ ...current, is_default: event.target.value === 'true' }))}>
                <option value="false">Nee</option>
                <option value="true">Ja</option>
              </select>
            </label>
          </div>

          <div className="section-title-row">
            <h4>Controlepunten</h4>
            <Button variant="secondary" onClick={() => setDraft((current) => ({
              ...current,
              items: [...current.items, {
                code: `CHECK-${current.items.length + 1}`,
                title: 'Nieuw controlepunt',
                group: 'Algemeen',
                norm_reference: 'NEN-EN 1090',
                required: true,
                default_status: 'conform',
                sort_order: current.items.length + 1,
              }],
            }))}>+ Punt</Button>
          </div>

          <div className="page-stack">
            {draft.items.map((item, index) => (
              <Card key={`${item.code}-${index}`}>
                <div className="form-grid">
                  <label><span>Code</span><Input value={item.code} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, code: event.target.value } : row) }))} /></label>
                  <label><span>Titel</span><Input value={item.title} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))} /></label>
                  <label><span>Groep</span><Input value={item.group} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, group: event.target.value } : row) }))} /></label>
                  <label><span>Normverwijzing</span><Input value={item.norm_reference} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, norm_reference: event.target.value } : row) }))} /></label>
                  <label>
                    <span>Default status</span>
                    <select value={item.default_status} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, default_status: event.target.value as TemplateStatus } : row) }))}>
                      <option value="conform">Conform</option>
                      <option value="defect">Defect</option>
                      <option value="gerepareerd">Gerepareerd</option>
                    </select>
                  </label>
                  <label>
                    <span>Verplicht</span>
                    <select value={String(item.required)} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, required: event.target.value === 'true' } : row) }))}>
                      <option value="true">Ja</option>
                      <option value="false">Nee</option>
                    </select>
                  </label>
                </div>
                <div className="form-actions" style={{ marginTop: 12, justifyContent: 'space-between' }}>
                  <div className="list-subtle">Sorteervolgorde: {item.sort_order}</div>
                  <Button variant="ghost" onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sort_order: rowIndex + 1 })) }))}>Verwijder punt</Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="stack-actions">
            <Button onClick={() => void saveTemplate()} disabled={!canWrite || createMutation.isPending || updateMutation.isPending}>Opslaan</Button>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Inspectietemplate verwijderen"
        description={`Weet je zeker dat je ${String(deleteRow?.name || deleteRow?.code || 'deze template')} wilt verwijderen?`}
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        onConfirm={() => void removeTemplate()}
        onClose={() => setDeleteRow(null)}
      />
    </Card>
  );
}

export default InspectionTemplatesManager;
