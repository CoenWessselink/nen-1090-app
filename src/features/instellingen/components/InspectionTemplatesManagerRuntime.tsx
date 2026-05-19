import { useMemo, useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronUp, Copy, Pencil, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
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

type TemplateItemDraft = {
  temp_id: string;
  id?: string;
  code: string;
  title: string;
  label: string;
  group: string;
  section_code: string;
  norm_reference: string;
  description: string;
  input_type: string;
  result_type: string;
  required: boolean;
  allow_na: boolean;
  requires_photo: boolean;
  requires_document: boolean;
  requires_comment_on_fail: boolean;
  blocks_release: boolean;
  default_status: string;
  severity_on_fail: string;
  sort_order: number;
};

type TemplateDraft = {
  id?: string;
  name: string;
  code: string;
  description: string;
  exc_class: string;
  norm: string;
  template_type: string;
  version: number;
  is_default: boolean;
  is_locked: boolean;
  items: TemplateItemDraft[];
};

type TemplateSummary = {
  total: number;
  standards: number;
  tenantCopies: number;
  checks: number;
  blockers: number;
  byExc: Record<string, number>;
};

const fieldStyle: CSSProperties = { width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' };
const editorGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const cardListStyle: CSSProperties = { display: 'grid', gap: 16 };
const badgeRowStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 };
const itemHeaderStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' };
const itemBadgeStyle: CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' };
const itemCardStyle: CSSProperties = { display: 'grid', gap: 12 };
const checkboxRowStyle: CSSProperties = { display: 'flex', gap: 16, flexWrap: 'wrap' };

function rowsFromPayload(payload: unknown): TemplateRow[] {
  if (Array.isArray(payload)) return payload as TemplateRow[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.items)) return record.items as TemplateRow[];
  if (Array.isArray(record.data)) return record.data as TemplateRow[];
  if (Array.isArray(record.results)) return record.results as TemplateRow[];
  return [];
}

function asBool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'ja', 'on'].includes(value.toLowerCase());
  return Boolean(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return value === undefined || value === null ? fallback : String(value);
}

function acceptanceRule(record: Record<string, unknown>): Record<string, unknown> {
  const rule = record.acceptance_rule_json;
  return rule && typeof rule === 'object' ? (rule as Record<string, unknown>) : {};
}

function excFromRow(row?: TemplateRow): string {
  const raw = asString(row?.exc_class || row?.execution_class || row?.profile_code || row?.code || '').toUpperCase();
  return raw.match(/EXC[1-4]/)?.[0] || 'EXC2';
}

function codeFromTitle(title: string, index: number): string {
  const clean = title.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 42);
  return clean || `ITEM_${index}`;
}

function sectionCodeFromGroup(group: string): string {
  return group.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'algemeen';
}

function normalizeItems(source: unknown): TemplateItemDraft[] {
  const items = Array.isArray(source) ? source : [];
  return items.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const rule = acceptanceRule(record);
    const title = asString(record.title || record.label || record.criterion_key || record.name || record.code || `Controlepunt ${index + 1}`);
    const group = asString(record.group || record.section_name || record.category || 'Algemeen');
    return {
      temp_id: asString(record.temp_id || record.id || record.code || `item-${index + 1}`),
      id: record.id ? asString(record.id) : undefined,
      code: asString(record.code || record.item_code || codeFromTitle(title, index + 1)),
      title,
      label: asString(record.label || title),
      group,
      section_code: asString(record.section_code || sectionCodeFromGroup(group)),
      norm_reference: asString(record.norm_reference || record.norm || record.norm_code || 'EN 1090 / ISO 3834 / ISO 5817'),
      description: asString(record.description || record.help_text || record.comment || record.toelichting || ''),
      input_type: asString(record.input_type || 'status'),
      result_type: asString(record.result_type || 'conformity'),
      required: asBool(record.required, true),
      allow_na: asBool(record.allow_na, true),
      requires_photo: asBool(record.requires_photo ?? rule.requires_photo, false),
      requires_document: asBool(record.requires_document ?? rule.requires_document, false),
      requires_comment_on_fail: asBool(record.requires_comment_on_fail ?? rule.requires_comment_on_fail, true),
      blocks_release: asBool(record.blocks_release ?? rule.blocks_ce_release, true),
      default_status: asString(record.default_status || record.default_value || record.status || 'conform'),
      severity_on_fail: asString(record.severity_on_fail || record.severity || 'major'),
      sort_order: asNumber(record.sort_order, index + 1),
    };
  }).sort((a, b) => a.sort_order - b.sort_order);
}

function createItem(index = 1): TemplateItemDraft {
  return {
    temp_id: `new-${Date.now()}-${index}`,
    code: `ITEM_${index}`,
    title: '',
    label: '',
    group: 'Algemeen',
    section_code: 'algemeen',
    norm_reference: 'EN 1090 / ISO 3834 / ISO 5817',
    description: '',
    input_type: 'status',
    result_type: 'conformity',
    required: true,
    allow_na: true,
    requires_photo: false,
    requires_document: false,
    requires_comment_on_fail: true,
    blocks_release: true,
    default_status: 'conform',
    severity_on_fail: 'major',
    sort_order: index,
  };
}

function draftFromRow(row?: TemplateRow): TemplateDraft {
  const exc = excFromRow(row);
  return {
    id: row?.id ? asString(row.id) : undefined,
    name: asString(row?.name || `${exc} inspectietemplate`),
    code: asString(row?.code || `${exc}_TENANT_TEMPLATE`),
    description: asString(row?.description || row?.norm || 'EN 1090 / ISO 3834 / ISO 5817'),
    exc_class: exc,
    norm: asString(row?.norm || row?.profile_code || 'EN 1090 / ISO 3834 / ISO 5817'),
    template_type: asString(row?.template_type || 'weld'),
    version: asNumber(row?.version, 1),
    is_default: asBool(row?.is_default, false),
    is_locked: asBool(row?.is_locked, false),
    items: normalizeItems(row?.items_json || row?.items || []),
  };
}

function itemPayload(item: TemplateItemDraft, index: number) {
  const title = item.title.trim() || item.label.trim() || `Controlepunt ${index + 1}`;
  const group = item.group.trim() || 'Algemeen';
  const code = item.code.trim() || codeFromTitle(title, index + 1);
  return {
    id: item.id,
    code,
    item_code: code,
    title,
    label: item.label.trim() || title,
    group,
    section_name: group,
    section_code: item.section_code.trim() || sectionCodeFromGroup(group),
    norm_reference: item.norm_reference.trim() || 'EN 1090 / ISO 3834 / ISO 5817',
    description: item.description,
    help_text: item.description,
    input_type: item.input_type,
    result_type: item.result_type,
    required: item.required,
    allow_na: item.allow_na,
    requires_photo: item.requires_photo,
    requires_document: item.requires_document,
    requires_comment_on_fail: item.requires_comment_on_fail,
    blocks_release: item.blocks_release,
    default_status: item.default_status,
    default_value: item.default_status,
    severity_on_fail: item.severity_on_fail,
    sort_order: index + 1,
    acceptance_rule_json: {
      requires_photo: item.requires_photo,
      requires_document: item.requires_document,
      requires_comment_on_fail: item.requires_comment_on_fail,
      blocks_ce_release: item.blocks_release,
      severity_on_fail: item.severity_on_fail,
    },
  };
}

function statusTone(status: string): BadgeTone {
  const value = status.toLowerCase();
  if (value.includes('defect') || value.includes('non') || value.includes('fail') || value.includes('afkeur')) return 'danger';
  if (value.includes('review') || value.includes('controle') || value.includes('pending')) return 'warning';
  return 'success';
}

function makeSummary(rows: TemplateRow[]): TemplateSummary {
  const summary: TemplateSummary = { total: 0, standards: 0, tenantCopies: 0, checks: 0, blockers: 0, byExc: {} };
  for (const row of rows) {
    const items = normalizeItems(row.items_json || row.items);
    summary.total = summary.total + 1;
    if (asBool(row.is_locked, false) || asBool(row.is_default, false)) summary.standards = summary.standards + 1;
    if (!asBool(row.is_locked, false)) summary.tenantCopies = summary.tenantCopies + 1;
    summary.checks = summary.checks + items.length;
    summary.blockers = summary.blockers + items.filter((item) => item.blocks_release).length;
    const exc = excFromRow(row);
    summary.byExc[exc] = (summary.byExc[exc] || 0) + 1;
  }
  return summary;
}

export function InspectionTemplatesManager() {
  const templates = useInspectionTemplates();
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();
  const duplicateMutation = useDuplicateInspectionTemplate();

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<TemplateDraft>(() => draftFromRow());
  const [editorOpen, setEditorOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo(() => rowsFromPayload(templates.data), [templates.data]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, search]);
  const summary = useMemo<TemplateSummary>(() => makeSummary(rows), [rows]);

  function openCreate() {
    setDraft(draftFromRow());
    setEditorOpen(true);
  }

  function openEdit(row: TemplateRow) {
    if (asBool(row.is_locked, false)) {
      setMessage('Standaardtemplates zijn read-only. Gebruik Dupliceer & bewerk om een tenant-copy te maken.');
      return;
    }
    setDraft(draftFromRow(row));
    setEditorOpen(true);
  }

  function patchItem(tempId: string, patch: Partial<TemplateItemDraft>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => item.temp_id === tempId ? { ...item, ...patch } : item),
    }));
  }

  function moveItem(tempId: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.items.findIndex((item) => item.temp_id === tempId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.items.length) return current;
      const items = [...current.items];
      const [item] = items.splice(index, 1);
      items.splice(nextIndex, 0, item);
      return { ...current, items: items.map((row, idx) => ({ ...row, sort_order: idx + 1 })) };
    });
  }

  async function duplicateTemplate(row: TemplateRow, openAfterDuplicate: boolean) {
    try {
      const result = (await duplicateMutation.mutateAsync(asString(row.id))) as TemplateRow;
      const refetched = await templates.refetch();
      const nextRows = rowsFromPayload(refetched.data);
      const newId = asString(result?.id || result?.template_id || '').trim();
      const newCode = asString(result?.code || '').trim();
      const copy = nextRows.find((entry) => newId && asString(entry.id) === newId)
        || nextRows.find((entry) => newCode && asString(entry.code) === newCode)
        || { ...result, is_locked: false, is_default: false };
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
    if (!draft.name.trim() || !draft.code.trim()) {
      setMessage('Naam en code zijn verplicht.');
      return;
    }
    const normalizedItems = draft.items.map(itemPayload);
    const payload = {
      name: draft.name.trim(),
      code: draft.code.trim(),
      description: draft.description,
      exc_class: draft.exc_class,
      execution_class: draft.exc_class,
      norm: draft.norm,
      template_type: draft.template_type || 'weld',
      version: Number(draft.version || 1),
      is_default: draft.is_default,
      is_locked: false,
      items_json: normalizedItems,
      items: normalizedItems,
      item_count: normalizedItems.length,
    };
    try {
      if (draft.id) {
        await updateMutation.mutateAsync({ type: 'inspection-templates', id: draft.id, payload });
        setMessage('Inspectietemplate bijgewerkt.');
      } else {
        await createMutation.mutateAsync({ type: 'inspection-templates', payload });
        setMessage('Inspectietemplate aangemaakt.');
      }
      await templates.refetch();
      setEditorOpen(false);
      setDraft(draftFromRow());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Opslaan mislukt.');
    }
  }

  async function removeTemplate(row: TemplateRow) {
    if (asBool(row.is_locked, false)) {
      setMessage('Standaardtemplates kunnen niet worden verwijderd.');
      return;
    }
    try {
      await deleteMutation.mutateAsync({ type: 'inspection-templates', id: asString(row.id) });
      await templates.refetch();
      setMessage('Inspectietemplate verwijderd.');
      if (draft.id && draft.id === row.id) setDraft(draftFromRow());
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
        <div className="mobile-kpi-card mobile-kpi-card-danger"><span>CE blockers</span><strong>{summary.blockers}</strong></div>
      </div>

      <Card>
        <div className="section-title-row">
          <div>
            <h3>Inspectietemplates</h3>
            <p className="list-subtle" style={{ marginTop: 6 }}>Backend norm-engine is de bron. Standaardtemplates zijn read-only; Dupliceer & bewerk maakt een tenant-copy voor maatwerk.</p>
            <div style={badgeRowStyle}>
              {Object.entries(summary.byExc).map(([key, value]) => <Badge key={key}>{`${key}: ${value}`}</Badge>)}
            </div>
          </div>
          <div className="toolbar-cluster">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op template, EXC, norm of controlepunt" style={fieldStyle} />
            <Button onClick={openCreate}><Plus size={16} /> Tenant-template</Button>
          </div>
        </div>
      </Card>

      {templates.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templates.isError ? <ErrorState title="Templates niet geladen" description="Controleer de backend norm-engine en settings endpoints." /> : null}
      {!templates.isLoading && !templates.isError && !filteredRows.length ? <EmptyState title="Geen templates gevonden" description="Geen templates gevonden voor deze zoekterm." /> : null}

      <div style={cardListStyle}>
        {filteredRows.map((row) => {
          const locked = asBool(row.is_locked, false);
          const items = normalizeItems(row.items_json || row.items);
          return (
            <Card key={asString(row.id || row.code)}>
              <div className="section-title-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h3>{asString(row.name || row.code || 'Inspectietemplate')}</h3>
                  <div style={badgeRowStyle}>
                    <Badge>{excFromRow(row)}</Badge>
                    <Badge tone="neutral">{asString(row.code || 'Geen code')}</Badge>
                    <Badge tone={locked ? 'warning' : 'success'}>{locked ? 'Read-only standaard' : 'Tenant-copy'}</Badge>
                    <Badge tone="neutral">v{asString(row.version || 1)}</Badge>
                    <Badge tone="neutral">{items.length} checks</Badge>
                  </div>
                  <p className="list-subtle" style={{ marginTop: 10 }}>{asString(row.norm || row.profile_code || 'EN 1090 / ISO 3834 / ISO 5817')}</p>
                </div>
                <div className="toolbar-cluster">
                  {locked ? <Button variant="secondary" onClick={() => void duplicateTemplate(row, true)} disabled={duplicateMutation.isPending}><Copy size={16} /> Dupliceer & bewerk</Button> : null}
                  {!locked ? <Button variant="secondary" onClick={() => void duplicateTemplate(row, false)} disabled={duplicateMutation.isPending}><Copy size={16} /> Dupliceren</Button> : null}
                  {!locked ? <Button variant="secondary" onClick={() => openEdit(row)}><Pencil size={16} /> Bewerken</Button> : null}
                  {!locked ? <Button variant="ghost" onClick={() => void removeTemplate(row)} disabled={deleteMutation.isPending}><Trash2 size={16} /> Verwijderen</Button> : null}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                {items.slice(0, 5).map((item) => (
                  <div key={item.temp_id} className="list-row" style={{ display: 'grid', gap: 6 }}>
                    <div style={itemHeaderStyle}>
                      <strong>{item.title}</strong>
                      <div style={itemBadgeStyle}>
                        {item.required ? <Badge tone="warning">verplicht</Badge> : null}
                        {item.requires_photo ? <Badge tone="neutral">foto</Badge> : null}
                        {item.requires_document ? <Badge tone="neutral">document</Badge> : null}
                        {item.blocks_release ? <Badge tone="danger"><ShieldCheck size={12} /> CE blocker</Badge> : null}
                        <Badge tone={statusTone(item.default_status)}>{item.default_status}</Badge>
                      </div>
                    </div>
                    <div className="list-subtle">{item.code} · {item.group} · {item.norm_reference} · {item.severity_on_fail}</div>
                  </div>
                ))}
                {items.length > 5 ? <div className="list-subtle">+ {items.length - 5} extra controlepunt(en)</div> : null}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={draft.id ? 'Tenant-template wijzigen' : 'Nieuwe tenant-template'} size="fullscreen">
        <div className="mobile-unified-body">
          <Card>
            <div className="section-title-row">
              <div><h3>Templategegevens</h3><p className="list-subtle" style={{ marginTop: 6 }}>Bewerk tenant-copy metadata en controlepunten. Standaardtemplates blijven vergrendeld.</p></div>
              <div className="toolbar-cluster"><Button variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button><Button onClick={() => void saveDraft()} disabled={createMutation.isPending || updateMutation.isPending}><Save size={16} /> Opslaan</Button></div>
            </div>
          </Card>

          <div style={editorGridStyle}>
            <Card><label><strong>Naam</strong><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} style={fieldStyle} /></label></Card>
            <Card><label><strong>Code</strong><input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} style={fieldStyle} /></label></Card>
            <Card><label><strong>Executieklasse</strong><select value={draft.exc_class} onChange={(event) => setDraft((current) => ({ ...current, exc_class: event.target.value }))} style={fieldStyle}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select></label></Card>
            <Card><label><strong>Normkader</strong><input value={draft.norm} onChange={(event) => setDraft((current) => ({ ...current, norm: event.target.value }))} style={fieldStyle} /></label></Card>
            <Card><label><strong>Template type</strong><input value={draft.template_type} onChange={(event) => setDraft((current) => ({ ...current, template_type: event.target.value }))} style={fieldStyle} /></label></Card>
            <Card><label><strong>Versie</strong><input type="number" min={1} value={draft.version} onChange={(event) => setDraft((current) => ({ ...current, version: asNumber(event.target.value, 1) }))} style={fieldStyle} /></label></Card>
            <Card><label><strong>Omschrijving</strong><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={4} style={fieldStyle} /></label></Card>
            <Card><label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}><input type="checkbox" checked={draft.is_default} onChange={(event) => setDraft((current) => ({ ...current, is_default: event.target.checked }))} /> <strong>Default tenant-template</strong></label></Card>
          </div>

          <Card>
            <div className="section-title-row"><div><h3>Controlepunten</h3><p className="list-subtle" style={{ marginTop: 6 }}>Metadata stuurt bewijs, verplichte velden en CE-release blokkades.</p></div><Button variant="secondary" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, createItem(current.items.length + 1)] }))}><Plus size={16} /> Controlepunt toevoegen</Button></div>
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              {draft.items.map((item, index) => (
                <div key={item.temp_id} className="list-row" style={itemCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{`Controlepunt ${index + 1}`}</strong>
                    <div className="toolbar-cluster"><Button variant="secondary" onClick={() => moveItem(item.temp_id, -1)} disabled={index === 0}><ChevronUp size={16} /> Omhoog</Button><Button variant="secondary" onClick={() => moveItem(item.temp_id, 1)} disabled={index === draft.items.length - 1}><ChevronDown size={16} /> Omlaag</Button><Button variant="ghost" onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((entry) => entry.temp_id !== item.temp_id).map((entry, idx) => ({ ...entry, sort_order: idx + 1 })) }))}><Trash2 size={16} /> Verwijderen</Button></div>
                  </div>
                  <div style={editorGridStyle}>
                    <label><strong>Code</strong><input value={item.code} onChange={(event) => patchItem(item.temp_id, { code: event.target.value })} style={fieldStyle} /></label>
                    <label><strong>Titel</strong><input value={item.title} onChange={(event) => patchItem(item.temp_id, { title: event.target.value, label: event.target.value })} style={fieldStyle} /></label>
                    <label><strong>Label</strong><input value={item.label} onChange={(event) => patchItem(item.temp_id, { label: event.target.value })} style={fieldStyle} /></label>
                    <label><strong>Sectie / groep</strong><input value={item.group} onChange={(event) => patchItem(item.temp_id, { group: event.target.value, section_code: sectionCodeFromGroup(event.target.value) })} style={fieldStyle} /></label>
                    <label><strong>Section code</strong><input value={item.section_code} onChange={(event) => patchItem(item.temp_id, { section_code: event.target.value })} style={fieldStyle} /></label>
                    <label><strong>Normreferentie</strong><input value={item.norm_reference} onChange={(event) => patchItem(item.temp_id, { norm_reference: event.target.value })} style={fieldStyle} /></label>
                    <label><strong>Input type</strong><select value={item.input_type} onChange={(event) => patchItem(item.temp_id, { input_type: event.target.value })} style={fieldStyle}><option value="status">status</option><option value="text">text</option><option value="number">number</option><option value="date">date</option><option value="select">select</option></select></label>
                    <label><strong>Result type</strong><select value={item.result_type} onChange={(event) => patchItem(item.temp_id, { result_type: event.target.value })} style={fieldStyle}><option value="conformity">conformity</option><option value="measurement">measurement</option><option value="document">document</option><option value="photo">photo</option></select></label>
                    <label><strong>Default status</strong><select value={item.default_status} onChange={(event) => patchItem(item.temp_id, { default_status: event.target.value })} style={fieldStyle}><option value="conform">conform</option><option value="in_control">in_control</option><option value="not_conform">not_conform</option><option value="not_applicable">not_applicable</option></select></label>
                    <label><strong>Severity bij afkeur</strong><select value={item.severity_on_fail} onChange={(event) => patchItem(item.temp_id, { severity_on_fail: event.target.value })} style={fieldStyle}><option value="minor">minor</option><option value="major">major</option><option value="critical">critical</option></select></label>
                  </div>
                  <div style={checkboxRowStyle}>
                    <label><input type="checkbox" checked={item.required} onChange={(event) => patchItem(item.temp_id, { required: event.target.checked })} /> Verplicht</label>
                    <label><input type="checkbox" checked={item.allow_na} onChange={(event) => patchItem(item.temp_id, { allow_na: event.target.checked })} /> N.v.t. toegestaan</label>
                    <label><input type="checkbox" checked={item.requires_photo} onChange={(event) => patchItem(item.temp_id, { requires_photo: event.target.checked })} /> Foto vereist</label>
                    <label><input type="checkbox" checked={item.requires_document} onChange={(event) => patchItem(item.temp_id, { requires_document: event.target.checked })} /> Document vereist</label>
                    <label><input type="checkbox" checked={item.requires_comment_on_fail} onChange={(event) => patchItem(item.temp_id, { requires_comment_on_fail: event.target.checked })} /> Commentaar bij afkeur</label>
                    <label><input type="checkbox" checked={item.blocks_release} onChange={(event) => patchItem(item.temp_id, { blocks_release: event.target.checked })} /> Blokkeert CE-release</label>
                  </div>
                  <label><strong>Toelichting / helptekst</strong><textarea value={item.description} onChange={(event) => patchItem(item.temp_id, { description: event.target.value })} rows={3} style={fieldStyle} /></label>
                </div>
              ))}
              {!draft.items.length ? <EmptyState title="Nog geen controlepunten" description="Voeg minimaal één controlepunt toe voor een bruikbare inspectietemplate." /> : null}
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
}

export default InspectionTemplatesManager;
