import { useMemo, useState } from 'react';
import { Copy, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useCreateMasterData, useDeleteMasterData, useDuplicateInspectionTemplate, useInspectionTemplates, useUpdateMasterData } from '@/hooks/useSettings';

type TemplateRow = Record<string, unknown>;
type TemplateDraft = {
  id?: string;
  name: string;
  code: string;
  exc_class: string;
  norm: string;
  version: number;
  is_default: boolean;
  items_json: string;
};

const presetItems: Record<string, Array<Record<string, unknown>>> = {
  EXC1: [
    { code: 'VISUAL_BASE', title: 'Visuele controle basisklasse', group: 'NEN-EN 1090', required: true, default_status: 'conform' },
    { code: 'DIMENSIONS', title: 'Maatvoering controleren', group: 'ISO 3834', required: true, default_status: 'conform' },
  ],
  EXC2: [
    { code: 'VISUAL_PLUS', title: 'Visuele controle uitgebreid', group: 'NEN-EN 1090', required: true, default_status: 'conform' },
    { code: 'WPS_MATCH', title: 'WPS / lasproces controleren', group: 'ISO 3834', required: true, default_status: 'conform' },
    { code: 'ACCEPTANCE_5817', title: 'Acceptatie volgens ISO 5817', group: 'ISO 5817', required: true, default_status: 'conform' },
  ],
  EXC3: [
    { code: 'TRACEABILITY', title: 'Traceerbaarheid materialen en lassers', group: 'NEN-EN 1090', required: true, default_status: 'conform' },
    { code: 'WPS_APPROVAL', title: 'WPS en kwalificaties valideren', group: 'ISO 3834', required: true, default_status: 'conform' },
    { code: 'QUALITY_5817', title: 'Kwaliteitsniveau volgens ISO 5817', group: 'ISO 5817', required: true, default_status: 'conform' },
  ],
  EXC4: [
    { code: 'CRITICAL_VISUAL', title: 'Verzwaarde visuele eindcontrole', group: 'NEN-EN 1090', required: true, default_status: 'conform' },
    { code: 'PROCEDURE_AUDIT', title: 'Procedure-audit en documentcontrole', group: 'ISO 3834', required: true, default_status: 'conform' },
    { code: 'ACCEPTANCE_CRITICAL', title: 'Acceptatie niveau kritisch', group: 'ISO 5817', required: true, default_status: 'conform' },
  ],
};

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[]';
  }
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
    items_json: prettyJson(row?.items_json || presetItems[excClass] || presetItems.EXC2),
  };
}

function summarizeItems(itemsJson: string) {
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
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

  const rows = useMemo(() => ((templates.data?.items || []) as TemplateRow[]), [templates.data]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, search]);

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
        items_json: JSON.parse(draft.items_json || '[]'),
      };
      if (draft.id) {
        await updateMutation.mutateAsync({ type: 'inspection-templates', id: draft.id, payload });
        setMessage('Inspectietemplate bijgewerkt.');
      } else {
        await createMutation.mutateAsync({ type: 'inspection-templates', payload });
        setMessage('Inspectietemplate aangemaakt.');
      }
      await templates.refetch();
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
          <Badge tone="success">Normkader actief</Badge>
        </div>
        <div className="list-subtle" style={{ marginTop: 8 }}>
          Beheer de standaard inspectietemplates per executieklasse. Deze templates sturen de controlepunten in de lascontrole aan en gebruiken een basisstructuur voor NEN-EN 1090, ISO 3834 en ISO 5817.
        </div>
      </Card>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {templates.isLoading ? <LoadingState label="Inspectietemplates laden..." /> : null}
      {templates.isError ? <ErrorState title="Inspectietemplates niet geladen" description="Controleer het /settings/inspection-templates contract." /> : null}

      <div className="content-grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <div className="section-title-row">
            <h3>{draft.id ? 'Inspectietemplate wijzigen' : 'Inspectietemplate aanmaken'}</h3>
            <Button variant="secondary" type="button" onClick={() => setDraft(createDraft())}><Plus size={16} /> Nieuw</Button>
          </div>
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
                    items_json: prettyJson(presetItems[event.target.value] || presetItems.EXC2),
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
            <label>
              <span>Controlepunten JSON</span>
              <textarea style={{ minHeight: 280 }} value={draft.items_json} onChange={(event) => setDraft((current) => ({ ...current, items_json: event.target.value }))} />
            </label>
            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
              <Button type="button" onClick={() => void saveDraft()} disabled={createMutation.isPending || updateMutation.isPending}><Save size={16} /> Opslaan</Button>
              <Button type="button" variant="secondary" onClick={() => setDraft(createDraft())}>Reset</Button>
            </div>
          </div>
        </Card>

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
                    <div className="list-subtle">{draftRow.exc_class} · {draftRow.norm} · {summarizeItems(draftRow.items_json)} controlepunten</div>
                  </div>
                  <div className="inline-end-cluster">
                    <Button type="button" variant="secondary" onClick={() => setDraft(draftRow)}><Pencil size={16} /> Wijzigen</Button>
                    <Button type="button" variant="secondary" onClick={() => void duplicateTemplate(id)}><Copy size={16} /> Dupliceren</Button>
                    <Button type="button" variant="ghost" onClick={() => void removeTemplate(id)}><Trash2 size={16} /> Verwijderen</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default InspectionTemplatesManager;
