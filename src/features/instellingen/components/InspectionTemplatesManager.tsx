import { useMemo, useState } from 'react';
import { Copy, Lock, Pencil, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
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

type TemplateItemDraft = {
  temp_id: string;
  code: string;
  title: string;
  group: string;
  section_code: string;
  norm_reference: string;
  required: boolean;
  allow_na: boolean;
  requires_photo: boolean;
  requires_document: boolean;
  blocks_release: boolean;
  default_status: string;
  severity_on_fail: string;
  input_type: string;
  result_type: string;
  sort_order: number;
  description: string;
};

type TemplateDraft = {
  id?: string;
  name: string;
  code: string;
  exc_class: string;
  norm: string;
  version: number;
  is_default: boolean;
  is_locked: boolean;
  items: TemplateItemDraft[];
};

const editorGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};

function excFromRow(row?: TemplateRow) {
  const raw = String(row?.exc_class || row?.execution_class || row?.profile_code || row?.code || '').toUpperCase();
  return raw.match(/EXC[1-4]/)?.[0] || 'EXC2';
}

function asBool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return Boolean(value);
}

function acceptanceRule(record: Record<string, unknown>) {
  const rule = record.acceptance_rule_json;
  if (rule && typeof rule === 'object') return rule as Record<string, unknown>;
  return {};
}

function normalizeItems(source: unknown): TemplateItemDraft[] {
  const items = Array.isArray(source) ? source : [];
  return items.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const rule = acceptanceRule(record);
    return {
      temp_id: String(record.temp_id || record.id || record.code || `item-${index + 1}`),
      code: String(record.code || record.item_code || `ITEM_${index + 1}`),
      title: String(record.title || record.label || `Controlepunt ${index + 1}`),
      group: String(record.group || record.section_name || record.category || 'Algemeen'),
      section_code: String(record.section_code || ''),
      norm_reference: String(record.norm_reference || record.norm || record.norm_code || 'EN 1090 / ISO 3834 / ISO 5817'),
      required: asBool(record.required, true),
      allow_na: asBool(record.allow_na, true),
      requires_photo: asBool(record.requires_photo || rule.requires_photo, false),
      requires_document: asBool(record.requires_document || rule.requires_document, false),
      blocks_release: asBool(record.blocks_release ?? rule.blocks_ce_release, true),
      default_status: String(record.default_status || record.default_value || record.status || 'conform'),
      severity_on_fail: String(record.severity_on_fail || record.severity || 'major'),
      input_type: String(record.input_type || 'status'),
      result_type: String(record.result_type || 'conformity'),
      sort_order: Number(record.sort_order || index + 1),
      description: String(record.description || record.help_text || record.comment || record.toelichting || ''),
    };
  });
}

function createItem(index = 1): TemplateItemDraft {
  return {
    temp_id: `new-${Date.now()}-${index}`,
    code: `ITEM_${index}`,
    title: '',
    group: 'Algemeen',
    section_code: 'custom',
    norm_reference: 'EN 1090 / ISO 3834 / ISO 5817',
    required: true,
    allow_na: true,
    requires_photo: false,
    requires_document: false,
    blocks_release: true,
    default_status: 'conform',
    severity_on_fail: 'major',
    input_type: 'status',
    result_type: 'conformity',
    sort_order: index,
    description: '',
  };
}

function createDraft(row?: TemplateRow): TemplateDraft {
  const excClass = excFromRow(row);
  return {
    id: row?.id ? String(row.id) : undefined,
    name: String(row?.name || `${excClass} inspectietemplate`),
    code: String(row?.code || `${excClass}-CUSTOM-TPL`),
    exc_class: excClass,
    norm: String(row?.norm || row?.profile_code || 'EN 1090 / ISO 3834 / ISO 5817'),
    version: Number(row?.version || 1),
    is_default: Boolean(row?.is_default ?? false),
    is_locked: Boolean(row?.is_locked ?? false),
    items: normalizeItems(row?.items_json || row?.items || []),
  };
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes('defect') || value.includes('non')) return 'error';
  if (value.includes('review') || value.includes('controle') || value.includes('checked')) return 'warning';
  return 'success';
}

function itemPayload(item: TemplateItemDraft, index: number) {
  return {
    code: item.code,
    title: item.title,
    label: item.title,
    group: item.group,
    section_name: item.group,
    section_code: item.section_code,
    norm_reference: item.norm_reference,
    required: item.required,
    allow_na: item.allow_na,
    requires_photo: item.requires_photo,
    requires_document: item.requires_document,
    blocks_release: item.blocks_release,
    default_status: item.default_status,
    severity_on_fail: item.severity_on_fail,
    input_type: item.input_type,
    result_type: item.result_type,
    sort_order: Number(item.sort_order || index + 1),
    description: item.description,
  };
}

export function InspectionTemplatesManager() {
  const templates = useInspectionTemplates();
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();
  const duplicateMutation = useDuplicateInspectionTemplate();

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<TemplateDraft>(() => createDraft());
  const [message, setMessage] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const rows = useMemo(() => ((templates.data?.items || []) as TemplateRow[]), [templates.data]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, search]);

  const summary = useMemo(() => {
    const byExc = rows.reduce<Record<string, number>>((acc, row) => {
      const key = excFromRow(row);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return {
      total: rows.length,
      standards: rows.filter((row) => Boolean(row.is_locked || row.is_default)).length,
      tenantCopies: rows.filter((row) => !row.is_locked).length,
      checks: rows.reduce((sum, row) => sum + normalizeItems(row.items_json || row.items).length, 0),
      blockers: rows.reduce((sum, row) => sum + normalizeItems(row.items_json || row.items).filter((item) => item.blocks_release).length, 0),
      byExc,
    };
  }, [rows]);

  function openCreate() {
    setDraft(createDraft());
    setEditorOpen(true);
  }

  function openEdit(row: TemplateRow) {
    if (row.is_locked) {
      setMessage('Standaardtemplates zijn vergrendeld. Dupliceer eerst om een tenant-copy te bewerken.');
      return;
    }
    setDraft(createDraft(row));
    setEditorOpen(true);
  }

  function updateItem(tempId: string, patch: Partial<TemplateItemDraft>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.temp_id === tempId ? { ...item, ...patch } : item)),
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

  async function saveDraft() {
    if (draft.is_locked) {
      setMessage('Deze standaardtemplate is vergrendeld. Dupliceer eerst om te bewerken.');
      return;
    }
    try {
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
      if (draft.id) {
        await updateMutation.mutateAsync({ type: 'inspection-templates', id: draft.id, payload });
        setMessage('Inspectietemplate bijgewerkt.');
      } else {
        await createMutation.mutateAsync({ type: 'inspection-templates', payload });
        setMessage('Inspectietemplate aangemaakt.');
      }
      await templates.refetch();
      setEditorOpen(false);
      setDraft(createDraft());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Opslaan mislukt.');
    }
  }

  async function removeTemplate(row: TemplateRow) {
    if (row.is_locked) {
      setMessage('Standaardtemplates kunnen niet worden verwijderd. Dupliceer eerst om een tenant-copy te beheren.');
      return;
    }
    try {
      await deleteMutation.mutateAsync({ type: 'inspection-templates', id: String(row.id) });
      setMessage('Inspectietemplate verwijderd.');
      await templates.refetch();
      if (draft.id === row.id) setDraft(createDraft());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
    }
  }

  async function duplicateTemplate(id: string) {
    try {
      await duplicateMutation.mutateAsync(id);
      setMessage('Tenant-copy aangemaakt. Deze kopie kan worden bewerkt zonder de standaardtemplate te wijzigen.');
      await templates.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Dupliceren mislukt.');
    }
  }

  return (
    <div className="mobile-list-stack">
      {message ? <InlineMessage tone="neutral">{message}</InlineMessage> : null}

      <div className="mobile-kpi-grid">
        <div className="mobile-kpi-card mobile-kpi-card-primary"><div className="mobile-kpi-top"><span>Templates totaal</span></div><strong>{summary.total}</strong></div>
        <div className="mobile-kpi-card mobile-kpi-card-success"><div className="mobile-kpi-top"><span>Backend standaard</span></div><strong>{summary.standards}</strong></div>
        <div className="mobile-kpi-card mobile-kpi-card-warning"><div className="mobile-kpi-top"><span>Controlepunten</span></div><strong>{summary.checks}</strong></div>
        <div className="mobile-kpi-card mobile-kpi-card-secondary"><div className="mobile-kpi-top"><span>CE blockers</span></div><strong>{summary.blockers}</strong></div>
      </div>

      <Card>
        <div className="section-title-row">
          <div>
            <h3>Inspectietemplates</h3>
            <p className="list-subtle" style={{ marginTop: 6 }}>Backend norm-engine is de bron. Standaardtemplates zijn read-only; dupliceren maakt een tenant-copy voor maatwerk.</p>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(summary.byExc).map(([key, val]) => <Badge key={key}>{`${key}: ${val}`}</Badge>)}
            </div>
          </div>
          <div className="toolbar-cluster">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op template, EXC, norm, controlepunt" style={{ minWidth: 280, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} />
            <Button onClick={openCreate}><Plus size={16} /> Tenant-template</Button>
          </div>
        </div>
      </Card>

      {templates.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templates.isError ? <ErrorState title="Templates niet geladen" description="Controleer /norms/templates en /norms/templates/{id}." /> : null}
      {!templates.isLoading && !templates.isError && !filteredRows.length ? <EmptyState title="Geen templates gevonden" description="Seed de backend normtemplates of pas de zoekterm aan." /> : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {filteredRows.map((row) => {
          const exc = excFromRow(row);
          const items = normalizeItems(row.items_json || row.items);
          const locked = Boolean(row.is_locked);
          return (
            <Card key={String(row.id)}>
              <div className="section-title-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: 8 }}>{String(row.name || row.code || row.id)}</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge>{exc}</Badge>
                    <Badge tone="neutral">{String(row.code || 'Geen code')}</Badge>
                    <Badge tone={locked ? 'warning' : 'success'}>{locked ? 'Read-only standaard' : 'Tenant-copy'}</Badge>
                    <Badge tone="neutral">v{String(row.version || 1)}</Badge>
                    <Badge tone="neutral">{items.length} checks</Badge>
                  </div>
                  <div className="list-subtle" style={{ marginTop: 10 }}>{String(row.norm || row.profile_code || 'EN 1090 / ISO 3834 / ISO 5817')}</div>
                </div>
                <div className="toolbar-cluster">
                  <Button variant="secondary" onClick={() => duplicateTemplate(String(row.id))}><Copy size={16} /> Dupliceren</Button>
                  <Button variant="secondary" onClick={() => openEdit(row)} disabled={locked}>{locked ? <Lock size={16} /> : <Pencil size={16} />} Bewerken</Button>
                  <Button variant="ghost" onClick={() => removeTemplate(row)} disabled={locked}><Trash2 size={16} /> Verwijderen</Button>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                {items.slice(0, 5).map((item) => (
                  <div key={item.temp_id} className="list-row" style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <strong>{item.title}</strong>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {item.required ? <Badge tone="warning">verplicht</Badge> : null}
                        {item.requires_photo ? <Badge tone="neutral">foto</Badge> : null}
                        {item.requires_document ? <Badge tone="neutral">document</Badge> : null}
                        {item.blocks_release ? <Badge tone="error"><ShieldCheck size={12} /> CE blocker</Badge> : null}
                        <Badge tone={statusTone(item.default_status) as any}>{item.default_status}</Badge>
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
              <div><h3>{draft.id ? 'Tenant-template editor' : 'Nieuwe tenant-template'}</h3><p className="list-subtle" style={{ marginTop: 6 }}>Standaardtemplates blijven vergrendeld. Deze editor beheert alleen tenant-copies.</p></div>
              <div className="toolbar-cluster"><Button variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button><Button onClick={() => void saveDraft()} disabled={createMutation.isPending || updateMutation.isPending}><Save size={16} /> Opslaan</Button></div>
            </div>
          </Card>

          <div style={editorGrid}>
            <Card><label><strong>Naam</strong><input value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label></Card>
            <Card><label><strong>Code</strong><input value={draft.code} onChange={(e) => setDraft((current) => ({ ...current, code: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label></Card>
            <Card><label><strong>Executieklasse</strong><select value={draft.exc_class} onChange={(e) => setDraft((current) => ({ ...current, exc_class: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select></label></Card>
            <Card><label><strong>Normkader</strong><input value={draft.norm} onChange={(e) => setDraft((current) => ({ ...current, norm: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label></Card>
            <Card><label><strong>Versie</strong><input type="number" min={1} value={draft.version} onChange={(e) => setDraft((current) => ({ ...current, version: Number(e.target.value || 1) }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label></Card>
            <Card><label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}><input type="checkbox" checked={draft.is_default} onChange={(e) => setDraft((current) => ({ ...current, is_default: e.target.checked }))} /> <strong>Default tenant-template</strong></label></Card>
          </div>

          <Card>
            <div className="section-title-row"><div><h3>Controlepunten</h3><p className="list-subtle" style={{ marginTop: 6 }}>Metadata stuurt bewijs, verplichte velden en CE-release blokkades.</p></div><Button variant="secondary" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, createItem(current.items.length + 1)] }))}><Plus size={16} /> Controlepunt toevoegen</Button></div>
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              {draft.items.map((item, index) => (
                <div key={item.temp_id} className="list-row" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><strong>{`Controlepunt ${index + 1}`}</strong><div className="toolbar-cluster"><Button variant="secondary" onClick={() => moveItem(item.temp_id, -1)} disabled={index === 0}>Omhoog</Button><Button variant="secondary" onClick={() => moveItem(item.temp_id, 1)} disabled={index === draft.items.length - 1}>Omlaag</Button><Button variant="ghost" onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((entry) => entry.temp_id !== item.temp_id).map((entry, idx) => ({ ...entry, sort_order: idx + 1 })) }))}><Trash2 size={16} /></Button></div></div>
                  <div style={editorGrid}>
                    <label><strong>Code</strong><input value={item.code} onChange={(e) => updateItem(item.temp_id, { code: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Titel</strong><input value={item.title} onChange={(e) => updateItem(item.temp_id, { title: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Sectie / groep</strong><input value={item.group} onChange={(e) => updateItem(item.temp_id, { group: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Normreferentie</strong><input value={item.norm_reference} onChange={(e) => updateItem(item.temp_id, { norm_reference: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Input type</strong><input value={item.input_type} onChange={(e) => updateItem(item.temp_id, { input_type: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Severity</strong><select value={item.severity_on_fail} onChange={(e) => updateItem(item.temp_id, { severity_on_fail: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }}><option value="minor">minor</option><option value="major">major</option><option value="critical">critical</option></select></label>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label><input type="checkbox" checked={item.required} onChange={(e) => updateItem(item.temp_id, { required: e.target.checked })} /> Verplicht</label>
                    <label><input type="checkbox" checked={item.allow_na} onChange={(e) => updateItem(item.temp_id, { allow_na: e.target.checked })} /> N.v.t. toegestaan</label>
                    <label><input type="checkbox" checked={item.requires_photo} onChange={(e) => updateItem(item.temp_id, { requires_photo: e.target.checked })} /> Foto vereist</label>
                    <label><input type="checkbox" checked={item.requires_document} onChange={(e) => updateItem(item.temp_id, { requires_document: e.target.checked })} /> Document vereist</label>
                    <label><input type="checkbox" checked={item.blocks_release} onChange={(e) => updateItem(item.temp_id, { blocks_release: e.target.checked })} /> Blokkeert CE-release</label>
                  </div>
                  <label><strong>Toelichting</strong><textarea value={item.description} onChange={(e) => updateItem(item.temp_id, { description: e.target.value })} rows={3} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
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
