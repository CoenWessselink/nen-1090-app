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

function summarizeItems(items: TemplateItemDraft[]) {
  return items.length;
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
      <Card>
        <div className="section-title-row">
          <h3>Inspectietemplates</h3>
          <div className="inline-end-cluster">
            <Badge tone="success">Normkader actief</Badge>
            <Button variant="secondary" type="button" onClick={openCreate}><Plus size={16} /> Nieuw template</Button>
          </div>
        </div>
        <div className="list-subtle" style={{ marginTop: 8 }}>
          Beheer de standaard inspectietemplates per executieklasse. De editor gebruikt normale velden en controlepunten in plaats van ruwe JSON.
        </div>
      </Card>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {templates.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templates.isError ? <ErrorState title="Inspectietemplates niet geladen" description="Controleer het /settings/inspection-templates contract." /> : null}

      <Card>
        <div className="section-title-row">
          <h3>Bestaande templates</h3>
          <input placeholder="Zoek template" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {!templates.isLoading && !templates.isError && filteredRows.length === 0 ? <EmptyState title="Geen templates gevonden" description="Maak een template aan of pas de zoekterm aan." /> : null}
        <div className="list-stack compact-list">
          {filteredRows.map((row) => {
            const id = String(row.id || '');
            const draftRow = createDraft(row);
            return (
              <div className="list-row" key={id}>
                <div>
                  <strong>{draftRow.name}</strong>
                  <div className="list-subtle">{draftRow.exc_class} · {draftRow.norm} · {summarizeItems(draftRow.items)} controlepunten</div>
                </div>
                <div className="inline-end-cluster">
                  <Badge tone={draftRow.is_default ? 'success' : 'neutral'}>{draftRow.is_default ? 'Standaard' : 'Aangepast'}</Badge>
                  <Button type="button" variant="secondary" onClick={() => openEdit(row)}><Pencil size={16} /> Wijzigen</Button>
                  <Button type="button" variant="secondary" onClick={() => void duplicateTemplate(id)}><Copy size={16} /> Dupliceren</Button>
                  <Button type="button" variant="ghost" onClick={() => void removeTemplate(id)}><Trash2 size={16} /> Verwijderen</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={draft.id ? 'Inspectietemplate wijzigen' : 'Inspectietemplate aanmaken'} size="large">
        <div className="detail-stack">
          <div className="form-grid">
            <label><span>Naam</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <div className="two-column-grid">
              <label><span>Code</span><input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label><span>Versie</span><input type="number" min={1} value={draft.version} onChange={(event) => setDraft((current) => ({ ...current, version: Number(event.target.value || 1) }))} /></label>
            </div>
            <div className="two-column-grid">
              <label>
                <span>Executieklasse</span>
                <select
                  value={draft.exc_class}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    exc_class: event.target.value,
                    items: current.id ? current.items : normalizeItems(presetItems[event.target.value] || presetItems.EXC2),
                  }))}
                >
                  <option value="EXC1">EXC1</option>
                  <option value="EXC2">EXC2</option>
                  <option value="EXC3">EXC3</option>
                  <option value="EXC4">EXC4</option>
                </select>
              </label>
              <label>
                <span>Standaard</span>
                <select value={String(draft.is_default)} onChange={(event) => setDraft((current) => ({ ...current, is_default: event.target.value === 'true' }))}>
                  <option value="true">Ja</option>
                  <option value="false">Nee</option>
                </select>
              </label>
            </div>
            <label><span>Normkader</span><input value={draft.norm} onChange={(event) => setDraft((current) => ({ ...current, norm: event.target.value }))} /></label>
          </div>

          <Card>
            <div className="section-title-row">
              <h3>Controlepunten</h3>
              <Button type="button" variant="secondary" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, createItem(current.items.length + 1)] }))}><Plus size={16} /> Controlepunt toevoegen</Button>
            </div>
            <div className="list-stack compact-list">
              {draft.items.map((item, index) => (
                <div key={item.temp_id} className="detail-stack" style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 12 }}>
                  <div className="section-title-row">
                    <strong>Controlepunt {index + 1}</strong>
                    <div className="inline-end-cluster">
                      <Button type="button" variant="secondary" onClick={() => moveItem(item.temp_id, -1)}>Omhoog</Button>
                      <Button type="button" variant="secondary" onClick={() => moveItem(item.temp_id, 1)}>Omlaag</Button>
                      <Button type="button" variant="ghost" onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((row) => row.temp_id !== item.temp_id).map((row, idx) => ({ ...row, sort_order: idx + 1 })) }))}><Trash2 size={16} /> Verwijderen</Button>
                    </div>
                  </div>
                  <div className="two-column-grid">
                    <label><span>Code</span><input value={item.code} onChange={(event) => updateItem(item.temp_id, { code: event.target.value })} /></label>
                    <label><span>Titel</span><input value={item.title} onChange={(event) => updateItem(item.temp_id, { title: event.target.value })} /></label>
                  </div>
                  <div className="two-column-grid">
                    <label><span>Groep / categorie</span><input value={item.group} onChange={(event) => updateItem(item.temp_id, { group: event.target.value })} /></label>
                    <label><span>Normreferentie</span><input value={item.norm_reference} onChange={(event) => updateItem(item.temp_id, { norm_reference: event.target.value })} /></label>
                  </div>
                  <div className="two-column-grid">
                    <label>
                      <span>Verplicht</span>
                      <select value={String(item.required)} onChange={(event) => updateItem(item.temp_id, { required: event.target.value === 'true' })}>
                        <option value="true">Ja</option>
                        <option value="false">Nee</option>
                      </select>
                    </label>
                    <label>
                      <span>Standaardstatus</span>
                      <select value={item.default_status} onChange={(event) => updateItem(item.temp_id, { default_status: event.target.value })}>
                        <option value="conform">Conform</option>
                        <option value="in_controle">In controle</option>
                        <option value="niet_conform">Niet conform</option>
                      </select>
                    </label>
                  </div>
                  <label><span>Toelichting / omschrijving</span><textarea style={{ minHeight: 90 }} value={item.description} onChange={(event) => updateItem(item.temp_id, { description: event.target.value })} /></label>
                </div>
              ))}
            </div>
          </Card>

          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <Button type="button" onClick={() => void saveDraft()} disabled={createMutation.isPending || updateMutation.isPending}><Save size={16} /> Opslaan</Button>
            <Button type="button" variant="secondary" onClick={() => setEditorOpen(false)}>Annuleren</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default InspectionTemplatesManager;
