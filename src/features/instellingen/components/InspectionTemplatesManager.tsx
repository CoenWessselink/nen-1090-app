import { useMemo, useState } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/modal/Modal';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { useInspectionTemplates, useCreateMasterData, useDeleteMasterData, useDuplicateInspectionTemplate, useUpdateMasterData } from '@/hooks/useSettings';
import { useUiStore } from '@/app/store/ui-store';
import { useAccess } from '@/hooks/useAccess';

type TemplateItem = {
  code: string;
  title: string;
  group: string;
  required: boolean;
  default_status: 'conform' | 'defect' | 'gerepareerd';
  sort_order: number;
};

type TemplateDraft = {
  id?: string | number;
  name: string;
  code: string;
  execution_class: 'EXC1' | 'EXC2' | 'EXC3' | 'EXC4';
  version: number;
  is_active: boolean;
  description: string;
  items: TemplateItem[];
};

const EXECUTION_CLASSES = ['EXC1', 'EXC2', 'EXC3', 'EXC4'] as const;
const DEFAULT_ITEMS: Record<string, TemplateItem[]> = {
  EXC1: [
    { code: 'VISUAL_BASE', title: 'Visuele controle', group: 'algemeen', required: true, default_status: 'conform', sort_order: 1 },
    { code: 'DIMENSION_CHECK', title: 'Controle afmetingen', group: 'maatvoering', required: true, default_status: 'conform', sort_order: 2 },
  ],
  EXC2: [
    { code: 'VISUAL_BASE', title: 'Visuele controle', group: 'algemeen', required: true, default_status: 'conform', sort_order: 1 },
    { code: 'DIMENSION_CHECK', title: 'Controle afmetingen', group: 'maatvoering', required: true, default_status: 'conform', sort_order: 2 },
    { code: 'WPS_VERIFY', title: 'WPS koppeling gecontroleerd', group: 'documenten', required: true, default_status: 'conform', sort_order: 3 },
  ],
  EXC3: [
    { code: 'VISUAL_BASE', title: 'Visuele controle', group: 'algemeen', required: true, default_status: 'conform', sort_order: 1 },
    { code: 'DIMENSION_CHECK', title: 'Controle afmetingen', group: 'maatvoering', required: true, default_status: 'conform', sort_order: 2 },
    { code: 'HEAT_INPUT', title: 'Warmte-inbreng gecontroleerd', group: 'proces', required: true, default_status: 'conform', sort_order: 3 },
    { code: 'TRACEABILITY', title: 'Traceability compleet', group: 'documenten', required: true, default_status: 'conform', sort_order: 4 },
  ],
  EXC4: [
    { code: 'VISUAL_BASE', title: 'Visuele controle', group: 'algemeen', required: true, default_status: 'conform', sort_order: 1 },
    { code: 'DIMENSION_CHECK', title: 'Controle afmetingen', group: 'maatvoering', required: true, default_status: 'conform', sort_order: 2 },
    { code: 'HEAT_INPUT', title: 'Warmte-inbreng gecontroleerd', group: 'proces', required: true, default_status: 'conform', sort_order: 3 },
    { code: 'TRACEABILITY', title: 'Traceability compleet', group: 'documenten', required: true, default_status: 'conform', sort_order: 4 },
    { code: 'NDT_PLAN', title: 'NDT-plan bevestigd', group: 'onderzoek', required: true, default_status: 'conform', sort_order: 5 },
  ],
};

function emptyDraft(executionClass: TemplateDraft['execution_class'] = 'EXC2'): TemplateDraft {
  return {
    name: `${executionClass} inspectietemplate`,
    code: `${executionClass}-TPL`,
    execution_class: executionClass,
    version: 1,
    is_active: true,
    description: `Standaard inspectietemplate voor ${executionClass}.`,
    items: DEFAULT_ITEMS[executionClass].map((item) => ({ ...item })),
  };
}

function normalizeExecutionClass(value: unknown): TemplateDraft['execution_class'] {
  const text = String(value || '').trim().toUpperCase();
  return EXECUTION_CLASSES.includes(text as TemplateDraft['execution_class']) ? text as TemplateDraft['execution_class'] : 'EXC2';
}

function normalizeItems(value: unknown, executionClass: TemplateDraft['execution_class']): TemplateItem[] {
  const items = Array.isArray(value) ? value : DEFAULT_ITEMS[executionClass];
  return items.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      code: String(item.code || `ITEM_${index + 1}`),
      title: String(item.title || item.code || `Controlepunt ${index + 1}`),
      group: String(item.group || 'algemeen'),
      required: item.required !== false,
      default_status: String(item.default_status || 'conform') === 'defect' ? 'defect' : String(item.default_status || 'conform') === 'gerepareerd' ? 'gerepareerd' : 'conform',
      sort_order: Number(item.sort_order || index + 1),
    };
  });
}

function mapRowToDraft(row: Record<string, unknown>): TemplateDraft {
  const executionClass = normalizeExecutionClass(row.execution_class || row.exc_class);
  return {
    id: row.id as string | number | undefined,
    name: String(row.name || row.title || ''),
    code: String(row.code || ''),
    execution_class: executionClass,
    version: Number(row.version || 1),
    is_active: row.is_active !== false,
    description: String(row.description || ''),
    items: normalizeItems(row.items_json, executionClass),
  };
}

function mapDraftToPayload(draft: TemplateDraft) {
  return {
    name: draft.name,
    code: draft.code,
    execution_class: draft.execution_class,
    version: draft.version,
    is_active: draft.is_active,
    description: draft.description,
    items_json: draft.items.map((item, index) => ({
      code: item.code,
      title: item.title,
      group: item.group,
      required: item.required,
      default_status: item.default_status,
      sort_order: index + 1,
    })),
  };
}

function cloneDraft(draft: TemplateDraft): TemplateDraft {
  return {
    ...draft,
    items: draft.items.map((item) => ({ ...item })),
  };
}

export function InspectionTemplatesManager() {
  const templatesQuery = useInspectionTemplates();
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();
  const duplicateMutation = useDuplicateInspectionTemplate();
  const pushNotification = useUiStore((state) => state.pushNotification);
  const canWrite = useAccess('settings.write');

  const [filterExecutionClass, setFilterExecutionClass] = useState<'all' | TemplateDraft['execution_class']>('all');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft());
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo(() => (templatesQuery.data?.items || []) as Array<Record<string, unknown>>, [templatesQuery.data]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const haystack = JSON.stringify(row).toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const executionClass = normalizeExecutionClass(row.execution_class || row.exc_class);
    const matchesExecutionClass = filterExecutionClass === 'all' || executionClass === filterExecutionClass;
    return matchesSearch && matchesExecutionClass;
  }), [filterExecutionClass, rows, search]);

  const openCreate = (executionClass: TemplateDraft['execution_class'] = 'EXC2') => {
    setDraft(emptyDraft(executionClass));
    setEditorOpen(true);
  };

  const saveTemplate = async () => {
    if (!canWrite) return;
    try {
      if (draft.id) {
        await updateMutation.mutateAsync({ type: 'inspection-templates', id: draft.id, payload: mapDraftToPayload(draft) });
        setMessage('Inspectietemplate bijgewerkt.');
      } else {
        await createMutation.mutateAsync({ type: 'inspection-templates', payload: mapDraftToPayload(draft) });
        setMessage('Inspectietemplate aangemaakt.');
      }
      pushNotification({ title: 'Inspectietemplate opgeslagen', description: 'Template, executieklasse en checklist zijn bijgewerkt.', tone: 'success' });
      setEditorOpen(false);
      await templatesQuery.refetch();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Onbekende fout';
      setMessage(description);
      pushNotification({ title: 'Opslaan mislukt', description, tone: 'error' });
    }
  };

  const removeTemplate = async () => {
    if (!deleteRow?.id || !canWrite) return;
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
        <h3>Inspectietemplates per executieklasse</h3>
        <div className="inline-end-cluster">
          <Badge tone={canWrite ? 'success' : 'warning'}>{canWrite ? 'CRUD actief' : 'Alleen lezen'}</Badge>
          <Button disabled={!canWrite} onClick={() => openCreate() }><Plus size={16} /> Nieuwe template</Button>
        </div>
      </div>
      <p className="text-muted" style={{ marginTop: 0 }}>Projecten onthouden voortaan de gekozen template per executieklasse. Nieuwe lassen nemen deze standaard over, met per-las override in de popup.</p>
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      <div className="toolbar-shell" style={{ display: 'grid', gridTemplateColumns: '1.4fr 220px', gap: 12 }}>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op naam, code of controlepunt" />
        <select className="input" value={filterExecutionClass} onChange={(event) => setFilterExecutionClass(event.target.value as 'all' | TemplateDraft['execution_class'])}>
          <option value="all">Alle executieklassen</option>
          {EXECUTION_CLASSES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {templatesQuery.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templatesQuery.isError ? <ErrorState title="Inspectietemplates niet geladen" description="Controleer of /settings/inspection-templates bereikbaar is." /> : null}
      {!templatesQuery.isLoading && !templatesQuery.isError && !filteredRows.length ? <EmptyState title="Geen inspectietemplates" description="Maak een template aan per executieklasse of pas de filters aan." /> : null}

      {!templatesQuery.isLoading && !templatesQuery.isError && filteredRows.length ? (
        <div className="detail-stack" style={{ marginTop: 12 }}>
          {filteredRows.map((row) => {
            const template = mapRowToDraft(row);
            return (
              <div key={String(row.id || row.code)} style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 16, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong>{template.name}</strong>
                      <Badge tone={template.is_active ? 'success' : 'warning'}>{template.is_active ? 'Actief' : 'Inactief'}</Badge>
                      <Badge tone="neutral">{template.execution_class}</Badge>
                      <Badge tone="neutral">v{template.version}</Badge>
                    </div>
                    <div className="list-subtle" style={{ marginTop: 6 }}>{template.code} · {template.description || 'Geen omschrijving'}</div>
                  </div>
                  <div className="inline-end-cluster" style={{ gap: 8 }}>
                    <Button variant="secondary" disabled={!canWrite} onClick={() => { setDraft(cloneDraft(template)); setEditorOpen(true); }}><Pencil size={16} /> Wijzigen</Button>
                    <Button variant="secondary" disabled={!canWrite || duplicateMutation.isPending} onClick={async () => {
                      try {
                        await duplicateMutation.mutateAsync(row.id as string | number);
                        await templatesQuery.refetch();
                        setMessage('Inspectietemplate gedupliceerd.');
                      } catch (error) {
                        setMessage(error instanceof Error ? error.message : 'Dupliceren mislukt.');
                      }
                    }}><Copy size={16} /> Dupliceren</Button>
                    <Button variant="ghost" disabled={!canWrite} onClick={() => setDeleteRow(row)}><Trash2 size={16} /> Verwijderen</Button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {template.items.map((item) => (
                    <div key={`${template.code}-${item.code}`} className="list-row">
                      <div>
                        <strong>{item.title}</strong>
                        <div className="list-subtle">{item.code} · groep: {item.group} · standaard: {item.default_status}</div>
                      </div>
                      <Badge tone={item.required ? 'success' : 'neutral'}>{item.required ? 'Verplicht' : 'Optioneel'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal open={editorOpen} title={draft.id ? 'Inspectietemplate wijzigen' : 'Inspectietemplate aanmaken'} onClose={() => setEditorOpen(false)}>
        <div className="form-grid">
          <div className="two-column-grid">
            <label>
              <span>Naam</span>
              <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Code</span>
              <Input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
            </label>
          </div>
          <div className="two-column-grid">
            <label>
              <span>Executieklasse</span>
              <select className="input" value={draft.execution_class} onChange={(event) => {
                const executionClass = normalizeExecutionClass(event.target.value);
                setDraft((current) => ({
                  ...current,
                  execution_class: executionClass,
                  code: current.id ? current.code : `${executionClass}-TPL`,
                  items: current.id ? current.items : DEFAULT_ITEMS[executionClass].map((item) => ({ ...item })),
                }));
              }}>
                {EXECUTION_CLASSES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              <span>Versie</span>
              <Input type="number" min="1" value={draft.version} onChange={(event) => setDraft((current) => ({ ...current, version: Number(event.target.value || 1) }))} />
            </label>
          </div>
          <label>
            <span>Omschrijving</span>
            <textarea className="input" style={{ minHeight: 84 }} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="list-row">
            <div>
              <strong>Template actief</strong>
              <div className="list-subtle">Alleen actieve templates mogen als projectdefault gekozen worden.</div>
            </div>
            <input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))} />
          </label>
          <div className="detail-stack">
            <div className="section-title-row"><h4>Checklistitems</h4><Button type="button" variant="secondary" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, { code: `ITEM_${current.items.length + 1}`, title: `Controlepunt ${current.items.length + 1}`, group: 'algemeen', required: true, default_status: 'conform', sort_order: current.items.length + 1 }] }))}>Punt toevoegen</Button></div>
            {draft.items.map((item, index) => (
              <div key={`${item.code}-${index}`} style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 12, display: 'grid', gap: 10 }}>
                <div className="two-column-grid">
                  <label>
                    <span>Code</span>
                    <Input value={item.code} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, code: event.target.value.toUpperCase() } : row) }))} />
                  </label>
                  <label>
                    <span>Titel</span>
                    <Input value={item.title} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))} />
                  </label>
                </div>
                <div className="two-column-grid">
                  <label>
                    <span>Groep</span>
                    <Input value={item.group} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, group: event.target.value } : row) }))} />
                  </label>
                  <label>
                    <span>Standaardstatus</span>
                    <select className="input" value={item.default_status} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, default_status: event.target.value as TemplateItem['default_status'] } : row) }))}>
                      <option value="conform">Conform</option>
                      <option value="defect">Defect</option>
                      <option value="gerepareerd">Gerepareerd</option>
                    </select>
                  </label>
                </div>
                <div className="list-row">
                  <label className="list-row" style={{ margin: 0 }}>
                    <div><strong>Verplicht item</strong><div className="list-subtle">Wordt meegenomen in CE-ontbrekende onderdelen.</div></div>
                    <input type="checkbox" checked={item.required} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, required: event.target.checked } : row) }))} />
                  </label>
                  <Button type="button" variant="ghost" onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sort_order: rowIndex + 1 })) }))}><Trash2 size={16} /> Verwijderen</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="stack-actions">
            <Button onClick={saveTemplate} disabled={!canWrite || createMutation.isPending || updateMutation.isPending}>Opslaan</Button>
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
        onConfirm={removeTemplate}
        onClose={() => setDeleteRow(null)}
      />
    </Card>
  );
}
