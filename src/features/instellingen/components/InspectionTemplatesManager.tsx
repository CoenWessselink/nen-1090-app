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

type TemplateItemDraft = {
  temp_id: string;
  code: string;
  title: string;
  group: string;
  norm_reference: string;
  required: boolean;
  default_status: string;
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
  items: TemplateItemDraft[];
};

const presetItems: Record<string, TemplateItemDraft[]> = {
  EXC1: [
    { temp_id: 'exc1-1', code: 'EXC1_VISUAL', title: 'Visuele controle lasnaad', group: 'Visueel', norm_reference: 'NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 1, description: 'Controle op zichtbare onvolkomenheden.' },
    { temp_id: 'exc1-2', code: 'EXC1_DIM', title: 'Maatvoering en positie controleren', group: 'Maatvoering', norm_reference: 'Werktekening', required: true, default_status: 'conform', sort_order: 2, description: 'Controleer ligging, maatvoering en aansluiting.' },
  ],
  EXC2: [
    { temp_id: 'exc2-1', code: 'EXC2_WPS', title: 'Juiste WPS toegepast', group: 'Documenten', norm_reference: 'ISO 3834', required: true, default_status: 'conform', sort_order: 1, description: 'WPS moet aantoonbaar gekoppeld zijn.' },
    { temp_id: 'exc2-2', code: 'EXC2_VISUAL', title: 'Visuele inspectie uitgevoerd', group: 'Visueel', norm_reference: 'ISO 5817', required: true, default_status: 'conform', sort_order: 2, description: 'Visuele vrijgave volgens gekozen acceptatieniveau.' },
    { temp_id: 'exc2-3', code: 'EXC2_TRACE', title: 'Materiaal- en lassertraceerbaarheid', group: 'Traceability', norm_reference: 'NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 3, description: 'Koppeling met materiaal, WPS en lasser aanwezig.' },
  ],
  EXC3: [
    { temp_id: 'exc3-1', code: 'EXC3_DOC', title: 'Volledige documentcontrole', group: 'Documenten', norm_reference: 'ISO 3834', required: true, default_status: 'conform', sort_order: 1, description: 'Controle op WPS, WPQR en kwalificaties.' },
    { temp_id: 'exc3-2', code: 'EXC3_NDT', title: 'Aanvullende NDO/NDT-controle', group: 'NDT', norm_reference: 'Projectspecifiek / ISO 17635', required: true, default_status: 'conform', sort_order: 2, description: 'Aanvullende onderzoeksmethode volgens projecteis.' },
    { temp_id: 'exc3-3', code: 'EXC3_ACCEPT', title: 'Acceptatie volgens ISO 5817', group: 'Acceptatie', norm_reference: 'ISO 5817', required: true, default_status: 'conform', sort_order: 3, description: 'Vrijgave op basis van acceptatieniveau.' },
  ],
  EXC4: [
    { temp_id: 'exc4-1', code: 'EXC4_CRITICAL', title: 'Kritische visuele vrijgave', group: 'Visueel', norm_reference: 'NEN-EN 1090-2', required: true, default_status: 'conform', sort_order: 1, description: 'Verzwaarde eindcontrole en vrijgave.' },
    { temp_id: 'exc4-2', code: 'EXC4_DOC_REVIEW', title: 'Volledige documentreview', group: 'Documenten', norm_reference: 'ISO 3834', required: true, default_status: 'conform', sort_order: 2, description: 'Verifieer complete documentdekking.' },
    { temp_id: 'exc4-3', code: 'EXC4_NDT', title: 'Verplichte aanvullende NDT', group: 'NDT', norm_reference: 'Projectspecifiek / ISO 17635', required: true, default_status: 'conform', sort_order: 3, description: 'Aanvullende NDT-verificatie en vastlegging.' },
  ],
};

const editorGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};

function normalizeItems(source: unknown): TemplateItemDraft[] {
  const items = Array.isArray(source) ? source : [];
  return items.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      temp_id: String(record.temp_id || record.id || record.code || `item-${index + 1}`),
      code: String(record.code || `ITEM_${index + 1}`),
      title: String(record.title || record.label || `Controlepunt ${index + 1}`),
      group: String(record.group || record.category || 'Algemeen'),
      norm_reference: String(record.norm_reference || record.norm || 'NEN-EN 1090 / ISO 3834 / ISO 5817'),
      required: Boolean(record.required ?? true),
      default_status: String(record.default_status || record.status || 'conform'),
      sort_order: Number(record.sort_order || index + 1),
      description: String(record.description || record.comment || record.toelichting || ''),
    };
  });
}

function createItem(index = 1): TemplateItemDraft {
  return {
    temp_id: `new-${Date.now()}-${index}`,
    code: `ITEM_${index}`,
    title: '',
    group: 'Algemeen',
    norm_reference: 'NEN-EN 1090 / ISO 3834 / ISO 5817',
    required: true,
    default_status: 'conform',
    sort_order: index,
    description: '',
  };
}

function createDraft(row?: TemplateRow): TemplateDraft {
  const excClass = String(row?.exc_class || row?.execution_class || 'EXC2');
  return {
    id: row?.id ? String(row.id) : undefined,
    name: String(row?.name || `${excClass} inspectietemplate`),
    code: String(row?.code || `${excClass}-TPL`),
    exc_class: excClass,
    norm: String(row?.norm || 'NEN-EN 1090 / ISO 3834 / ISO 5817'),
    version: Number(row?.version || 1),
    is_default: Boolean(row?.is_default ?? true),
    items: normalizeItems(row?.items_json || row?.items || presetItems[excClass] || presetItems.EXC2),
  };
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes('defect') || value.includes('non')) return 'error';
  if (value.includes('review') || value.includes('controle')) return 'warning';
  return 'success';
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
      const key = String(row.exc_class || row.execution_class || 'Overig').toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return {
      total: rows.length,
      defaults: rows.filter((row) => Boolean(row.is_default)).length,
      checks: rows.reduce((sum, row) => sum + normalizeItems(row.items_json || row.items).length, 0),
      byExc,
    };
  }, [rows]);

  function openCreate() {
    setDraft(createDraft());
    setEditorOpen(true);
  }

  function openEdit(row: TemplateRow) {
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
      return {
        ...current,
        items: items.map((row, idx) => ({ ...row, sort_order: idx + 1 })),
      };
    });
  }

  async function saveDraft() {
    try {
      const payload = {
        name: draft.name,
        code: draft.code,
        exc_class: draft.exc_class,
        execution_class: draft.exc_class,
        norm: draft.norm,
        version: Number(draft.version || 1),
        is_default: draft.is_default,
        items_json: draft.items.map((item, index) => ({
          code: item.code,
          title: item.title,
          group: item.group,
          norm_reference: item.norm_reference,
          required: item.required,
          default_status: item.default_status,
          sort_order: Number(item.sort_order || index + 1),
          description: item.description,
        })),
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

  async function removeTemplate(id: string) {
    try {
      await deleteMutation.mutateAsync({ type: 'inspection-templates', id });
      setMessage('Inspectietemplate verwijderd.');
      await templates.refetch();
      if (draft.id === id) setDraft(createDraft());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verwijderen mislukt.');
    }
  }

  async function duplicateTemplate(id: string) {
    try {
      await duplicateMutation.mutateAsync(id);
      setMessage('Inspectietemplate gedupliceerd.');
      await templates.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Dupliceren mislukt.');
    }
  }

  return (
    <div className="page-stack">
      {message ? <InlineMessage tone="neutral">{message}</InlineMessage> : null}

      <div className="project-tab-kpi-grid">
        <Card><strong>Templates totaal</strong><div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{summary.total}</div></Card>
        <Card><strong>Standaardtemplates</strong><div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{summary.defaults}</div></Card>
        <Card><strong>Controlepunten totaal</strong><div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{summary.checks}</div></Card>
        <Card><strong>EXC verdeling</strong><div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(summary.byExc).map(([key, value]) => <Badge key={key}>{`${key}: ${value}`}</Badge>)}</div></Card>
      </div>

      <Card>
        <div className="section-title-row">
          <div>
            <h3>Inspectietemplates</h3>
            <p className="list-subtle" style={{ marginTop: 6 }}>Gebruik dezelfde enterprise-editor als bij projectgegevens: duidelijke velden, nette controlepuntregels en geen JSON-hoofdflow.</p>
          </div>
          <div className="toolbar-cluster">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Zoek op template, code, norm of controlepunt"
              style={{ minWidth: 280, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }}
            />
            <Button onClick={openCreate}><Plus size={16} /> Nieuwe template</Button>
          </div>
        </div>
      </Card>

      {templates.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templates.isError ? <ErrorState title="Templates niet geladen" description="Controleer de instellingen-endpoints voor inspectietemplates." /> : null}
      {!templates.isLoading && !templates.isError && !filteredRows.length ? (
        <EmptyState title="Geen templates gevonden" description="Pas de zoekterm aan of maak direct een nieuwe inspectietemplate aan." />
      ) : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {filteredRows.map((row) => {
          const exc = String(row.exc_class || row.execution_class || 'EXC?');
          const items = normalizeItems(row.items_json || row.items);
          return (
            <Card key={String(row.id)}>
              <div className="section-title-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: 8 }}>{String(row.name || row.code || row.id)}</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge>{exc}</Badge>
                    <Badge tone="neutral">{String(row.code || 'Geen code')}</Badge>
                    <Badge tone={row.is_default ? 'success' : 'neutral'}>{row.is_default ? 'Standaard' : 'Optioneel'}</Badge>
                    <Badge tone="neutral">v{String(row.version || 1)}</Badge>
                  </div>
                  <div className="list-subtle" style={{ marginTop: 10 }}>{String(row.norm || 'NEN-EN 1090 / ISO 3834 / ISO 5817')}</div>
                </div>
                <div className="toolbar-cluster">
                  <Button variant="secondary" onClick={() => duplicateTemplate(String(row.id))}><Copy size={16} /> Dupliceren</Button>
                  <Button variant="secondary" onClick={() => openEdit(row)}><Pencil size={16} /> Wijzigen</Button>
                  <Button variant="ghost" onClick={() => removeTemplate(String(row.id))}><Trash2 size={16} /> Verwijderen</Button>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                {items.slice(0, 4).map((item) => (
                  <div key={item.temp_id} className="list-row" style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <strong>{item.title}</strong>
                      <Badge tone={statusTone(item.default_status) as any}>{item.default_status}</Badge>
                    </div>
                    <div className="list-subtle">{item.code} · {item.group} · {item.norm_reference}</div>
                  </div>
                ))}
                {items.length > 4 ? <div className="list-subtle">+ {items.length - 4} extra controlepunt(en)</div> : null}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={draft.id ? 'Inspectietemplate wijzigen' : 'Nieuwe inspectietemplate'} size="fullscreen">
        <div className="page-stack">
          <Card>
            <div className="section-title-row">
              <div>
                <h3>{draft.id ? 'Template-editor' : 'Nieuwe template'}</h3>
                <p className="list-subtle" style={{ marginTop: 6 }}>Bewerk alle templatevelden en controlepunten in één duidelijke beheerflow.</p>
              </div>
              <div className="toolbar-cluster">
                <Button variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button>
                <Button onClick={() => void saveDraft()} disabled={createMutation.isPending || updateMutation.isPending}><Save size={16} /> Opslaan</Button>
              </div>
            </div>
          </Card>

          <div style={editorGrid}>
            <Card><label><strong>Naam</strong><input value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label></Card>
            <Card><label><strong>Code</strong><input value={draft.code} onChange={(e) => setDraft((current) => ({ ...current, code: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label></Card>
            <Card><label><strong>Executieklasse</strong><select value={draft.exc_class} onChange={(e) => setDraft((current) => ({ ...current, exc_class: e.target.value, items: current.id ? current.items : normalizeItems(presetItems[e.target.value] || presetItems.EXC2) }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }}><option value="EXC1">EXC1</option><option value="EXC2">EXC2</option><option value="EXC3">EXC3</option><option value="EXC4">EXC4</option></select></label></Card>
            <Card><label><strong>Normkader</strong><input value={draft.norm} onChange={(e) => setDraft((current) => ({ ...current, norm: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label></Card>
            <Card><label><strong>Versie</strong><input type="number" min={1} value={draft.version} onChange={(e) => setDraft((current) => ({ ...current, version: Number(e.target.value || 1) }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label></Card>
            <Card><label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}><input type="checkbox" checked={draft.is_default} onChange={(e) => setDraft((current) => ({ ...current, is_default: e.target.checked }))} /> <strong>Standaardtemplate voor nieuwe projecten/lassen</strong></label></Card>
          </div>

          <Card>
            <div className="section-title-row">
              <div>
                <h3>Controlepunten</h3>
                <p className="list-subtle" style={{ marginTop: 6 }}>Volgorde, normverwijzingen en standaardstatus direct beheren per controlepunt.</p>
              </div>
              <Button variant="secondary" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, createItem(current.items.length + 1)] }))}><Plus size={16} /> Controlepunt toevoegen</Button>
            </div>
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              {draft.items.map((item, index) => (
                <div key={item.temp_id} className="list-row" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{`Controlepunt ${index + 1}`}</strong>
                    <div className="toolbar-cluster">
                      <Button variant="secondary" onClick={() => moveItem(item.temp_id, -1)} disabled={index === 0}>Omhoog</Button>
                      <Button variant="secondary" onClick={() => moveItem(item.temp_id, 1)} disabled={index === draft.items.length - 1}>Omlaag</Button>
                      <Button variant="ghost" onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((entry) => entry.temp_id !== item.temp_id).map((entry, idx) => ({ ...entry, sort_order: idx + 1 })) }))}><Trash2 size={16} /></Button>
                    </div>
                  </div>
                  <div style={editorGrid}>
                    <label><strong>Code</strong><input value={item.code} onChange={(e) => updateItem(item.temp_id, { code: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Titel</strong><input value={item.title} onChange={(e) => updateItem(item.temp_id, { title: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Groep / categorie</strong><input value={item.group} onChange={(e) => updateItem(item.temp_id, { group: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Normreferentie</strong><input value={item.norm_reference} onChange={(e) => updateItem(item.temp_id, { norm_reference: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                    <label><strong>Standaardstatus</strong><select value={item.default_status} onChange={(e) => updateItem(item.temp_id, { default_status: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }}><option value="conform">Conform</option><option value="in_review">In controle</option><option value="non_conform">Niet conform</option></select></label>
                    <label><strong>Sortering</strong><input type="number" min={1} value={item.sort_order} onChange={(e) => updateItem(item.temp_id, { sort_order: Number(e.target.value || index + 1) })} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} /></label>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={item.required} onChange={(e) => updateItem(item.temp_id, { required: e.target.checked })} /> Verplicht controlepunt</label>
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
