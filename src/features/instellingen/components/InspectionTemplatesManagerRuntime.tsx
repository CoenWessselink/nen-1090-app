import { useMemo, useState } from 'react';
import { Copy, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Modal } from '@/components/overlays/Modal';
import {
  useCreateMasterData,
  useDeleteMasterData,
  useDuplicateInspectionTemplate,
  useInspectionTemplates,
  useUpdateMasterData,
} from '@/hooks/useSettings';

type TemplateRow = Record<string, unknown>;

type TemplateItem = {
  temp_id: string;
  code: string;
  title: string;
  group: string;
  norm_reference: string;
  required: boolean;
  allow_na: boolean;
  requires_photo: boolean;
  requires_document: boolean;
  blocks_release: boolean;
  default_status: string;
  severity_on_fail: string;
  sort_order: number;
};

type Draft = {
  id?: string;
  name: string;
  code: string;
  exc_class: string;
  norm: string;
  version: number;
  is_default: boolean;
  is_locked: boolean;
  items: TemplateItem[];
};

function rowsFromPayload(payload: unknown): TemplateRow[] {
  if (Array.isArray(payload)) return payload as TemplateRow[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.items)) return record.items as TemplateRow[];
  if (Array.isArray(record.data)) return record.data as TemplateRow[];
  if (Array.isArray(record.results)) return record.results as TemplateRow[];
  return [];
}

function bool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return Boolean(value);
}

function excFromRow(row?: TemplateRow) {
  const raw = String(row?.exc_class || row?.execution_class || row?.profile_code || row?.code || '').toUpperCase();
  return raw.match(/EXC[1-4]/)?.[0] || 'EXC2';
}

function rowItems(row?: TemplateRow): TemplateItem[] {
  const source = row?.items_json || row?.items || [];
  const items = Array.isArray(source) ? source : [];
  return items.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const rule = record.acceptance_rule_json && typeof record.acceptance_rule_json === 'object' ? (record.acceptance_rule_json as Record<string, unknown>) : {};
    return {
      temp_id: String(record.temp_id || record.id || record.code || `item-${index + 1}`),
      code: String(record.code || record.item_code || `ITEM_${index + 1}`),
      title: String(record.title || record.label || `Controlepunt ${index + 1}`),
      group: String(record.group || record.section_name || record.category || 'Algemeen'),
      norm_reference: String(record.norm_reference || record.norm || record.norm_code || 'EN 1090 / ISO 3834 / ISO 5817'),
      required: bool(record.required, true),
      allow_na: bool(record.allow_na, true),
      requires_photo: bool(record.requires_photo || rule.requires_photo, false),
      requires_document: bool(record.requires_document || rule.requires_document, false),
      blocks_release: bool(record.blocks_release ?? rule.blocks_ce_release, true),
      default_status: String(record.default_status || record.default_value || record.status || 'conform'),
      severity_on_fail: String(record.severity_on_fail || record.severity || 'major'),
      sort_order: Number(record.sort_order || index + 1),
    };
  });
}

function newItem(index: number): TemplateItem {
  return {
    temp_id: `new-${Date.now()}-${index}`,
    code: `ITEM_${index}`,
    title: '',
    group: 'Algemeen',
    norm_reference: 'EN 1090 / ISO 3834 / ISO 5817',
    required: true,
    allow_na: true,
    requires_photo: false,
    requires_document: false,
    blocks_release: true,
    default_status: 'conform',
    severity_on_fail: 'major',
    sort_order: index,
  };
}

function draftFromRow(row?: TemplateRow): Draft {
  const exc = excFromRow(row);
  return {
    id: row?.id ? String(row.id) : undefined,
    name: String(row?.name || `${exc} inspectietemplate`),
    code: String(row?.code || `${exc}_TENANT_TEMPLATE`),
    exc_class: exc,
    norm: String(row?.norm || row?.profile_code || 'EN 1090 / ISO 3834 / ISO 5817'),
    version: Number(row?.version || 1),
    is_default: Boolean(row?.is_default ?? false),
    is_locked: Boolean(row?.is_locked ?? false),
    items: rowItems(row),
  };
}

function itemPayload(item: TemplateItem, index: number) {
  return {
    code: item.code,
    title: item.title,
    label: item.title,
    group: item.group,
    section_name: item.group,
    section_code: item.group.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    norm_reference: item.norm_reference,
    required: item.required,
    allow_na: item.allow_na,
    requires_photo: item.requires_photo,
    requires_document: item.requires_document,
    blocks_release: item.blocks_release,
    default_status: item.default_status,
    default_value: item.default_status,
    severity_on_fail: item.severity_on_fail,
    input_type: 'status',
    result_type: 'conformity',
    sort_order: index + 1,
  };
}

export function InspectionTemplatesManager() {
  const templates = useInspectionTemplates();
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();
  const duplicateMutation = useDuplicateInspectionTemplate();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft>(() => draftFromRow());
  const [editorOpen, setEditorOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo(() => rowsFromPayload(templates.data), [templates.data]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const summary = useMemo(() => rows.reduce((acc, row) => {
    acc.total += 1;
    if (row.is_locked || row.is_default) acc.standards += 1;
    if (!row.is_locked) acc.tenantCopies += 1;
    acc.checks += rowItems(row).length;
    return acc;
  }, { total: 0, standards: 0, tenantCopies: 0, checks: 0 }), [rows]);

  function patchItem(tempId: string, patch: Partial<TemplateItem>) {
    setDraft((current) => ({ ...current, items: current.items.map((item) => item.temp_id === tempId ? { ...item, ...patch } : item) }));
  }

  function openCreate() {
    setDraft(draftFromRow());
    setEditorOpen(true);
  }

  function openEdit(row: TemplateRow) {
    if (row.is_locked) {
      setMessage('Standaardtemplates zijn read-only. Gebruik Dupliceer & bewerk.');
      return;
    }
    setDraft(draftFromRow(row));
    setEditorOpen(true);
  }

  async function duplicateTemplate(row: TemplateRow, openAfterDuplicate: boolean) {
    try {
      const result = (await duplicateMutation.mutateAsync(String(row.id))) as TemplateRow;
      const refetched = await templates.refetch();
      const nextRows = rowsFromPayload(refetched.data);
      const newId = String(result?.id || result?.template_id || '').trim();
      const newCode = String(result?.code || '').trim();
      const copy = nextRows.find((entry) => newId && String(entry.id) === newId) || nextRows.find((entry) => newCode && String(entry.code) === newCode) || { ...result, is_locked: false, is_default: false };
      if (openAfterDuplicate) {
        setDraft(draftFromRow({ ...copy, is_locked: false, is_default: false }));
        setEditorOpen(true);
        setMessage('Tenant-copy aangemaakt en geopend voor bewerken.');
      } else {
        setMessage('Tenant-copy aangemaakt.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Dupliceren mislukt.');
    }
  }

  async function saveDraft() {
    if (draft.is_locked) {
      setMessage('Deze template is read-only. Dupliceer eerst.');
      return;
    }
    const payload = {
      name: draft.name,
      code: draft.code,
      exc_class: draft.exc_class,
      execution_class: draft.exc_class,
      norm: draft.norm,
      description: draft.norm,
      template_type: 'weld',
      version: Number(draft.version || 1),
      is_default: draft.is_default,
      is_locked: false,
      items_json: draft.items.map(itemPayload),
    };
    try {
      if (draft.id) await updateMutation.mutateAsync({ type: 'inspection-templates', id: draft.id, payload });
      else await createMutation.mutateAsync({ type: 'inspection-templates', payload });
      await templates.refetch();
      setEditorOpen(false);
      setMessage('Inspectietemplate opgeslagen.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Opslaan mislukt.');
    }
  }

  async function removeTemplate(row: TemplateRow) {
    if (row.is_locked) {
      setMessage('Standaardtemplates kunnen niet worden verwijderd.');
      return;
    }
    try {
      await deleteMutation.mutateAsync({ type: 'inspection-templates', id: String(row.id) });
      await templates.refetch();
      setMessage('Inspectietemplate verwijderd.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
    }
  }

  return (
    <div className="mobile-list-stack">
      {message ? <InlineMessage tone="neutral">{message}</InlineMessage> : null}
      <div className="mobile-kpi-grid">
        <div className="mobile-kpi-card mobile-kpi-card-primary"><span>Templates totaal</span><strong>{summary.total}</strong></div>
        <div className="mobile-kpi-card mobile-kpi-card-success"><span>Backend standaard</span><strong>{summary.standards}</strong></div>
        <div className="mobile-kpi-card mobile-kpi-card-secondary"><span>Tenant-copies</span><strong>{summary.tenantCopies}</strong></div>
        <div className="mobile-kpi-card mobile-kpi-card-warning"><span>Controlepunten</span><strong>{summary.checks}</strong></div>
      </div>

      <Card>
        <div className="section-title-row">
          <div>
            <h3>Inspectietemplates</h3>
            <p className="list-subtle" style={{ marginTop: 6 }}>Standaardtemplates zijn read-only. Gebruik Dupliceer & bewerk voor maatwerk.</p>
          </div>
          <div className="toolbar-cluster">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op template, EXC of norm" style={{ minWidth: 260, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} />
            <Button onClick={openCreate}><Plus size={16} /> Tenant-template</Button>
          </div>
        </div>
      </Card>

      {templates.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templates.isError ? <ErrorState title="Templates niet geladen" description="Controleer de backend norm-engine en settings endpoints." /> : null}
      {!templates.isLoading && !templates.isError && !filteredRows.length ? <EmptyState title="Geen templates gevonden" description="Geen templates gevonden voor deze zoekterm." /> : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {filteredRows.map((row) => {
          const locked = Boolean(row.is_locked);
          const items = rowItems(row);
          return (
            <Card key={String(row.id || row.code)}>
              <div className="section-title-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h3>{String(row.name || row.code || 'Inspectietemplate')}</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <Badge>{excFromRow(row)}</Badge>
                    <Badge tone="neutral">{String(row.code || 'Geen code')}</Badge>
                    <Badge tone={locked ? 'warning' : 'success'}>{locked ? 'Read-only standaard' : 'Tenant-copy'}</Badge>
                    <Badge tone="neutral">{items.length} checks</Badge>
                  </div>
                  <p className="list-subtle" style={{ marginTop: 10 }}>{String(row.norm || row.profile_code || 'EN 1090 / ISO 3834 / ISO 5817')}</p>
                </div>
                <div className="toolbar-cluster">
                  {locked ? <Button variant="secondary" onClick={() => void duplicateTemplate(row, true)} disabled={duplicateMutation.isPending}><Copy size={16} /> Dupliceer & bewerk</Button> : null}
                  {!locked ? <Button variant="secondary" onClick={() => void duplicateTemplate(row, false)} disabled={duplicateMutation.isPending}><Copy size={16} /> Dupliceren</Button> : null}
                  {!locked ? <Button variant="secondary" onClick={() => openEdit(row)}><Pencil size={16} /> Bewerken</Button> : null}
                  {!locked ? <Button variant="ghost" onClick={() => void removeTemplate(row)} disabled={deleteMutation.isPending}><Trash2 size={16} /> Verwijderen</Button> : null}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                {items.slice(0, 4).map((item) => <div key={item.temp_id} className="list-row"><strong>{item.title}</strong><div className="list-subtle">{item.code} · {item.group} · {item.norm_reference}</div></div>)}
                {items.length > 4 ? <div className="list-subtle">+ {items.length - 4} extra controlepunt(en)</div> : null}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={draft.id ? 'Tenant-template wijzigen' : 'Nieuwe tenant-template'} size="fullscreen">
        <div className="mobile-unified-body">
          <Card>
            <div className="section-title-row">
              <div><h3>Templategegevens</h3><p className="list-subtle">Bewerk tenant-copy metadata en controlepunten.</p></div>
              <div className="toolbar-cluster"><Button variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button><Button onClick={() => void saveDraft()} disabled={createMutation.isPending || updateMutation.isPending}><Save size={16} /> Opslaan</Button></div>
            </div>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <Card><label><strong>Naam</strong><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label></Card>
            <Card><label><strong>Code</strong><input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} /></label></Card>
            <Card><label><strong>EXC</strong><select value={draft.exc_class} onChange={(event) => setDraft((current) => ({ ...current, exc_class: event.target.value }))}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select></label></Card>
            <Card><label><strong>Norm</strong><input value={draft.norm} onChange={(event) => setDraft((current) => ({ ...current, norm: event.target.value }))} /></label></Card>
          </div>
          <Card>
            <div className="section-title-row"><h3>Controlepunten</h3><Button variant="secondary" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, newItem(current.items.length + 1)] }))}><Plus size={16} /> Controlepunt</Button></div>
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {draft.items.map((item) => (
                <div className="list-row" key={item.temp_id} style={{ display: 'grid', gap: 8 }}>
                  <input value={item.title} onChange={(event) => patchItem(item.temp_id, { title: event.target.value })} placeholder="Controlepunt" />
                  <input value={item.code} onChange={(event) => patchItem(item.temp_id, { code: event.target.value })} placeholder="Code" />
                  <input value={item.group} onChange={(event) => patchItem(item.temp_id, { group: event.target.value })} placeholder="Groep" />
                  <input value={item.norm_reference} onChange={(event) => patchItem(item.temp_id, { norm_reference: event.target.value })} placeholder="Normreferentie" />
                  <label><input type="checkbox" checked={item.required} onChange={(event) => patchItem(item.temp_id, { required: event.target.checked })} /> Verplicht</label>
                  <label><input type="checkbox" checked={item.requires_photo} onChange={(event) => patchItem(item.temp_id, { requires_photo: event.target.checked })} /> Foto vereist</label>
                  <label><input type="checkbox" checked={item.requires_document} onChange={(event) => patchItem(item.temp_id, { requires_document: event.target.checked })} /> Document vereist</label>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
}

export default InspectionTemplatesManager;
