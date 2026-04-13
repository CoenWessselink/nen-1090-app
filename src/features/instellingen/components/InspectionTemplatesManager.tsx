import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Modal } from '@/components/modal/Modal';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { useCreateMasterData, useDeleteMasterData, useDuplicateInspectionTemplate, useInspectionTemplates, useUpdateMasterData } from '@/hooks/useSettings';

type TemplateRow = Record<string, unknown>;

type TemplateItemDraft = {
  code: string;
  title: string;
  group: string;
  norm: string;
  default_status: 'conform' | 'defect' | 'gerepareerd';
  required: boolean;
  sort_order: number;
};

type TemplateDraft = {
  id?: string;
  name: string;
  code: string;
  exc_class: 'EXC1' | 'EXC2' | 'EXC3' | 'EXC4';
  version: number;
  is_default: boolean;
  norm_basis: string;
  items: TemplateItemDraft[];
};

const presetLibrary: Record<TemplateDraft['exc_class'], TemplateItemDraft[]> = {
  EXC1: [
    { code: 'VISUAL_GEOMETRY', title: 'Visuele controle geometrie', group: 'Algemeen', norm: 'NEN-EN 1090', default_status: 'conform', required: true, sort_order: 1 },
    { code: 'WPS_CHECK', title: 'WPS beschikbaar en passend', group: 'Documenten', norm: 'ISO 3834', default_status: 'conform', required: true, sort_order: 2 },
  ],
  EXC2: [
    { code: 'VISUAL_GEOMETRY', title: 'Visuele controle geometrie', group: 'Algemeen', norm: 'NEN-EN 1090', default_status: 'conform', required: true, sort_order: 1 },
    { code: 'WPS_CHECK', title: 'WPS beschikbaar en passend', group: 'Documenten', norm: 'ISO 3834', default_status: 'conform', required: true, sort_order: 2 },
    { code: 'SURFACE_DEFECTS', title: 'Oppervlaktefouten volgens acceptatieklasse', group: 'Visueel', norm: 'ISO 5817', default_status: 'conform', required: true, sort_order: 3 },
  ],
  EXC3: [
    { code: 'VISUAL_GEOMETRY', title: 'Visuele controle geometrie', group: 'Algemeen', norm: 'NEN-EN 1090', default_status: 'conform', required: true, sort_order: 1 },
    { code: 'WPS_CHECK', title: 'WPS beschikbaar en passend', group: 'Documenten', norm: 'ISO 3834', default_status: 'conform', required: true, sort_order: 2 },
    { code: 'SURFACE_DEFECTS', title: 'Oppervlaktefouten volgens acceptatieklasse', group: 'Visueel', norm: 'ISO 5817', default_status: 'conform', required: true, sort_order: 3 },
    { code: 'TRACEABILITY', title: 'Traceerbaarheid lassers en materialen', group: 'Traceability', norm: 'ISO 3834', default_status: 'conform', required: true, sort_order: 4 },
  ],
  EXC4: [
    { code: 'VISUAL_GEOMETRY', title: 'Visuele controle geometrie', group: 'Algemeen', norm: 'NEN-EN 1090', default_status: 'conform', required: true, sort_order: 1 },
    { code: 'WPS_CHECK', title: 'WPS beschikbaar en passend', group: 'Documenten', norm: 'ISO 3834', default_status: 'conform', required: true, sort_order: 2 },
    { code: 'SURFACE_DEFECTS', title: 'Oppervlaktefouten volgens acceptatieklasse', group: 'Visueel', norm: 'ISO 5817', default_status: 'conform', required: true, sort_order: 3 },
    { code: 'TRACEABILITY', title: 'Traceerbaarheid lassers en materialen', group: 'Traceability', norm: 'ISO 3834', default_status: 'conform', required: true, sort_order: 4 },
    { code: 'FINAL_RELEASE', title: 'Vrijgave eindcontrole', group: 'Vrijgave', norm: 'NEN-EN 1090', default_status: 'conform', required: true, sort_order: 5 },
  ],
};

function parseItems(value: unknown): TemplateItemDraft[] {
  if (Array.isArray(value)) return value as TemplateItemDraft[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as TemplateItemDraft[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function createDefaultDraft(excClass: TemplateDraft['exc_class'] = 'EXC2'): TemplateDraft {
  return {
    name: '',
    code: '',
    exc_class: excClass,
    version: 1,
    is_default: false,
    norm_basis: 'NEN-EN 1090 / ISO 3834 / ISO 5817',
    items: presetLibrary[excClass].map((item) => ({ ...item })),
  };
}

function normalizeRowToDraft(row: TemplateRow): TemplateDraft {
  const excClass = (String(row.exc_class || 'EXC2').toUpperCase() as TemplateDraft['exc_class']);
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    code: String(row.code || row.id || ''),
    exc_class: ['EXC1', 'EXC2', 'EXC3', 'EXC4'].includes(excClass) ? excClass : 'EXC2',
    version: Number(row.version || 1),
    is_default: Boolean(row.is_default),
    norm_basis: String(row.norm_basis || 'NEN-EN 1090 / ISO 3834 / ISO 5817'),
    items: parseItems(row.items_json || row.items || []),
  };
}

function buildPayload(draft: TemplateDraft) {
  return {
    name: draft.name,
    code: draft.code,
    exc_class: draft.exc_class,
    version: draft.version,
    is_default: draft.is_default,
    norm_basis: draft.norm_basis,
    items_json: draft.items.map((item, index) => ({
      ...item,
      sort_order: Number(item.sort_order || index + 1),
      required: Boolean(item.required),
    })),
  };
}

export function InspectionTemplatesManager() {
  const templatesQuery = useInspectionTemplates();
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();
  const duplicateMutation = useDuplicateInspectionTemplate();

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateDraft>(createDefaultDraft());
  const [deleteCandidate, setDeleteCandidate] = useState<TemplateRow | null>(null);

  const rows = useMemo(() => {
    const items = (templatesQuery.data?.items || []) as TemplateRow[];
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }, [search, templatesQuery.data?.items]);

  function resetEditor(next = createDefaultDraft()) {
    setDraft(next);
    setEditorOpen(false);
  }

  async function saveDraft() {
    const payload = buildPayload(draft);
    if (draft.id) {
      await updateMutation.mutateAsync({ type: 'inspection-templates', id: draft.id, payload });
      setMessage(`Inspectietemplate ${draft.name} bijgewerkt.`);
    } else {
      await createMutation.mutateAsync({ type: 'inspection-templates', payload });
      setMessage(`Inspectietemplate ${draft.name} aangemaakt.`);
    }
    await templatesQuery.refetch();
    resetEditor();
  }

  async function duplicateTemplate(id: string | number) {
    await duplicateMutation.mutateAsync(id);
    await templatesQuery.refetch();
    setMessage('Inspectietemplate gedupliceerd.');
  }

  async function deleteTemplate() {
    if (!deleteCandidate?.id) return;
    await deleteMutation.mutateAsync({ type: 'inspection-templates', id: String(deleteCandidate.id) });
    await templatesQuery.refetch();
    setDeleteCandidate(null);
    setMessage('Inspectietemplate verwijderd.');
  }

  function applyPreset(excClass: TemplateDraft['exc_class']) {
    setDraft((current) => ({
      ...current,
      exc_class: excClass,
      items: presetLibrary[excClass].map((item) => ({ ...item })),
    }));
  }

  return (
    <div className="page-stack" data-testid="inspection-templates-manager">
      <Card>
        <div className="toolbar-cluster" style={{ justifyContent: 'space-between', gap: 12 }}>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op naam, EXC of norm" />
          <Button onClick={() => { setDraft(createDefaultDraft()); setEditorOpen(true); }}>Nieuwe inspectietemplate</Button>
        </div>
      </Card>

      <Card>
        <div className="page-stack" style={{ gap: 12 }}>
          <strong>Normbasis</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">NEN-EN 1090</Badge>
            <Badge tone="warning">ISO 3834</Badge>
            <Badge tone="neutral">ISO 5817</Badge>
          </div>
          <div className="list-subtle">Templates worden gebruikt in “Gegevens van de lascontrole” en leveren direct de controlepunten voor de inspectiepopup.</div>
        </div>
      </Card>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {templatesQuery.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templatesQuery.isError ? <ErrorState title="Inspectietemplates niet geladen" description="Controleer het settings-contract voor inspection-templates." /> : null}
      {!templatesQuery.isLoading && !templatesQuery.isError && rows.length === 0 ? <EmptyState title="Geen inspectietemplates" description="Maak hier EXC templates aan en koppel ze aan lassen." /> : null}

      {!templatesQuery.isLoading && !templatesQuery.isError && rows.length > 0 ? (
        <div className="page-stack">
          {rows.map((row) => {
            const items = parseItems(row.items_json || row.items || []);
            return (
              <Card key={String(row.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="page-stack" style={{ gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong>{String(row.name || row.code || row.id)}</strong>
                      <Badge tone="success">{String(row.exc_class || 'EXC2')}</Badge>
                      <Badge tone="neutral">v{String(row.version || 1)}</Badge>
                      {row.is_default ? <Badge tone="warning">Standaard</Badge> : null}
                    </div>
                    <div className="list-subtle">{String(row.norm_basis || 'NEN-EN 1090 / ISO 3834 / ISO 5817')}</div>
                    <div className="list-subtle">{items.length} controlepunten in deze template</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button variant="secondary" onClick={() => { setDraft(normalizeRowToDraft(row)); setEditorOpen(true); }}>Wijzigen</Button>
                    <Button variant="secondary" onClick={() => void duplicateTemplate(String(row.id))}>Dupliceren</Button>
                    <Button variant="danger" onClick={() => setDeleteCandidate(row)}>Verwijderen</Button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                  {items.slice(0, 6).map((item, index) => (
                    <div key={`${item.code}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <strong>{item.title}</strong>
                        <Badge tone="neutral">{item.code}</Badge>
                        <Badge tone="warning">{item.norm}</Badge>
                      </div>
                      <div className="list-subtle" style={{ marginTop: 6 }}>{item.group} · default {item.default_status}</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Modal open={editorOpen} title={draft.id ? 'Inspectietemplate wijzigen' : 'Inspectietemplate aanmaken'} onClose={() => resetEditor(draft.id ? normalizeRowToDraft({}) : createDefaultDraft())}>
        <div className="page-stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 12 }}>
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
              <select value={draft.exc_class} onChange={(event) => applyPreset(event.target.value as TemplateDraft['exc_class'])}>
                <option value="EXC1">EXC1</option>
                <option value="EXC2">EXC2</option>
                <option value="EXC3">EXC3</option>
                <option value="EXC4">EXC4</option>
              </select>
            </label>
            <label>
              <span>Versie</span>
              <Input type="number" value={draft.version} onChange={(event) => setDraft((current) => ({ ...current, version: Number(event.target.value || 1) }))} />
            </label>
            <label>
              <span>Normbasis</span>
              <Input value={draft.norm_basis} onChange={(event) => setDraft((current) => ({ ...current, norm_basis: event.target.value }))} />
            </label>
            <label>
              <span>Standaardtemplate</span>
              <select value={String(draft.is_default)} onChange={(event) => setDraft((current) => ({ ...current, is_default: event.target.value === 'true' }))}>
                <option value="false">Nee</option>
                <option value="true">Ja</option>
              </select>
            </label>
          </div>

          <div className="page-stack" style={{ gap: 10 }}>
            <strong>Controlepunten</strong>
            {draft.items.map((item, index) => (
              <Card key={`${item.code}-${index}`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 12 }}>
                  <label>
                    <span>Code</span>
                    <Input value={item.code} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, code: event.target.value } : entry) }))} />
                  </label>
                  <label>
                    <span>Titel</span>
                    <Input value={item.title} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry) }))} />
                  </label>
                  <label>
                    <span>Groep</span>
                    <Input value={item.group} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, group: event.target.value } : entry) }))} />
                  </label>
                  <label>
                    <span>Norm</span>
                    <Input value={item.norm} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, norm: event.target.value } : entry) }))} />
                  </label>
                  <label>
                    <span>Default status</span>
                    <select value={item.default_status} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, default_status: event.target.value as TemplateItemDraft['default_status'] } : entry) }))}>
                      <option value="conform">Conform</option>
                      <option value="defect">Defect</option>
                      <option value="gerepareerd">Gerepareerd</option>
                    </select>
                  </label>
                  <label>
                    <span>Verplicht</span>
                    <select value={String(item.required)} onChange={(event) => setDraft((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, required: event.target.value === 'true' } : entry) }))}>
                      <option value="true">Ja</option>
                      <option value="false">Nee</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button variant="danger" onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>Punt verwijderen</Button>
                </div>
              </Card>
            ))}
            <Button variant="secondary" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, { code: '', title: '', group: 'Algemeen', norm: 'NEN-EN 1090', default_status: 'conform', required: true, sort_order: current.items.length + 1 }] }))}>Controlepunt toevoegen</Button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button variant="secondary" onClick={() => resetEditor()}>Annuleren</Button>
            <Button onClick={() => void saveDraft()} disabled={createMutation.isPending || updateMutation.isPending || !draft.name.trim()}>Opslaan</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Inspectietemplate verwijderen"
        description={`Weet je zeker dat je ${String(deleteCandidate?.name || deleteCandidate?.code || 'deze template')} wilt verwijderen?`}
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        onConfirm={() => void deleteTemplate()}
        onClose={() => setDeleteCandidate(null)}
      />
    </div>
  );
}

export default InspectionTemplatesManager;
