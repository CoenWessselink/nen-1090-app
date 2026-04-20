import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Code } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface TemplateItem {
  temp_id: string;
  code: string;
  title: string;
  group: string;
  norm_ref: string;
  required: boolean;
  order: number;
}

interface Template {
  id?: string;
  name: string;
  code: string;
  version: string;
  exc_class: string;
  is_default: boolean;
  items: TemplateItem[];
}

const EMPTY_TEMPLATE: Template = {
  name: '',
  code: '',
  version: '1.0',
  exc_class: 'EXC2',
  is_default: false,
  items: [],
};

const EMPTY_ITEM: Omit<TemplateItem, 'temp_id' | 'order'> = {
  code: '',
  title: '',
  group: '',
  norm_ref: '',
  required: true,
};

const EXC_CLASSES = ['EXC1', 'EXC2', 'EXC3', 'EXC4'];

const DEFAULT_ITEMS_BY_EXC: Record<string, TemplateItem[]> = {
  EXC1: [
    { temp_id: 'e1-1', code: 'EXC1_VT', title: 'Visuele controle lasnaad', group: 'Visueel', norm_ref: 'NEN-EN 1090-2 §12.4', required: true, order: 1 },
    { temp_id: 'e1-2', code: 'EXC1_DIM', title: 'Maatvoering en positie controleren', group: 'Maatvoering', norm_ref: 'NEN-EN 1090-2 §12.5', required: true, order: 2 },
  ],
  EXC2: [
    { temp_id: 'e2-1', code: 'EXC2_WPS', title: 'Juiste WPS toegepast', group: 'Documenten', norm_ref: 'NEN-EN 1090-2 §7', required: true, order: 1 },
    { temp_id: 'e2-2', code: 'EXC2_VT', title: 'Visuele inspectie uitgevoerd', group: 'Visueel', norm_ref: 'NEN-EN 1090-2 §12.4', required: true, order: 2 },
    { temp_id: 'e2-3', code: 'EXC2_CERT', title: 'Lassercertificaat geldig', group: 'Documenten', norm_ref: 'NEN-EN 1090-2 §6.2', required: true, order: 3 },
  ],
  EXC3: [
    { temp_id: 'e3-1', code: 'EXC3_WPS', title: 'WPS goedgekeurd door coördinator', group: 'Documenten', norm_ref: 'NEN-EN 1090-2 §7', required: true, order: 1 },
    { temp_id: 'e3-2', code: 'EXC3_VT', title: 'Visuele inspectie conform EXC3', group: 'Visueel', norm_ref: 'NEN-EN 1090-2 §12.4', required: true, order: 2 },
    { temp_id: 'e3-3', code: 'EXC3_NDT', title: 'NDT-resultaten gedocumenteerd', group: 'NDT', norm_ref: 'NEN-EN 1090-2 §12.4.2', required: true, order: 3 },
    { temp_id: 'e3-4', code: 'EXC3_WPQR', title: 'WPQR aanwezig en geldig', group: 'Documenten', norm_ref: 'NEN-EN 1090-2 §7.3', required: true, order: 4 },
  ],
  EXC4: [
    { temp_id: 'e4-1', code: 'EXC4_WPS', title: 'WPS door onafhankelijke instelling goedgekeurd', group: 'Documenten', norm_ref: 'NEN-EN 1090-2 §7', required: true, order: 1 },
    { temp_id: 'e4-2', code: 'EXC4_VT', title: 'Volledige visuele inspectie 100%', group: 'Visueel', norm_ref: 'NEN-EN 1090-2 §12.4', required: true, order: 2 },
    { temp_id: 'e4-3', code: 'EXC4_NDT', title: 'NDT 100% radiografisch of ultrasonisch', group: 'NDT', norm_ref: 'NEN-EN 1090-2 §12.4.3', required: true, order: 3 },
    { temp_id: 'e4-4', code: 'EXC4_CERT', title: 'Externe certificering gedocumenteerd', group: 'Documenten', norm_ref: 'NEN-EN 1090-2 §6.4', required: true, order: 4 },
    { temp_id: 'e4-5', code: 'EXC4_COORD', title: 'Lascoördinator niveau C of hoger', group: 'Personeel', norm_ref: 'NEN-EN 1090-2 §6.2', required: true, order: 5 },
  ],
};

export function InspectionTemplatesManager({
  templates = [],
  onSave,
  onDelete,
  saving = false,
}: {
  templates?: Template[];
  onSave?: (t: Template) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  saving?: boolean;
}) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startNew = (exc: string = 'EXC2') => {
    setSelected({
      ...EMPTY_TEMPLATE,
      exc_class: exc,
      name: `Inspectietemplate ${exc}`,
      code: `INSP_${exc}`,
      items: (DEFAULT_ITEMS_BY_EXC[exc] ?? []).map((i) => ({ ...i })),
    });
    setShowJson(false);
    setSaveError(null);
  };

  const addItem = () => {
    if (!selected) return;
    const newItem: TemplateItem = {
      temp_id: `item_${Date.now()}`,
      ...EMPTY_ITEM,
      order: (selected.items?.length ?? 0) + 1,
    };
    setSelected({ ...selected, items: [...(selected.items ?? []), newItem] });
  };

  const updateItem = (tempId: string, key: keyof TemplateItem, value: unknown) => {
    if (!selected) return;
    setSelected({
      ...selected,
      items: selected.items.map((i) => (i.temp_id === tempId ? { ...i, [key]: value } : i)),
    });
  };

  const removeItem = (tempId: string) => {
    if (!selected) return;
    setSelected({
      ...selected,
      items: selected.items.filter((i) => i.temp_id !== tempId),
    });
  };

  const moveItem = (tempId: string, dir: -1 | 1) => {
    if (!selected) return;
    const items = [...selected.items];
    const idx = items.findIndex((i) => i.temp_id === tempId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    setSelected({ ...selected, items: items.map((item, i) => ({ ...item, order: i + 1 })) });
  };

  const handleSave = async () => {
    if (!selected || !onSave) return;
    setSaveError(null);
    try {
      await onSave(selected);
      setSelected(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    }
  };

  if (selected) {
    return (
      <div style={{ maxWidth: 780 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {selected.id ? 'Template bewerken' : 'Nieuw template'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setShowJson(!showJson)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Code size={13} />
                {showJson ? 'Formulier' : 'JSON bekijken'}
              </span>
            </Button>
            <Button variant="secondary" onClick={() => setSelected(null)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Opslaan…' : 'Opslaan'}
            </Button>
          </div>
        </div>

        {saveError && (
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--color-background-danger)',
              color: 'var(--color-text-danger)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {saveError}
          </div>
        )}

        {showJson ? (
          <Card>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              JSON-weergave (alleen-lezen). Bewerk via het formulier hierboven.
            </p>
            <pre
              style={{
                fontSize: 11,
                overflowX: 'auto',
                background: 'var(--color-background-secondary)',
                padding: 12,
                borderRadius: 6,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {JSON.stringify(selected, null, 2)}
            </pre>
          </Card>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Naam</span>
                    <input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Code</span>
                    <input value={selected.code} onChange={(e) => setSelected({ ...selected, code: e.target.value })} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Versie</span>
                    <input value={selected.version} onChange={(e) => setSelected({ ...selected, version: e.target.value })} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>EXC-klasse</span>
                    <select value={selected.exc_class} onChange={(e) => setSelected({ ...selected, exc_class: e.target.value })}>
                      {EXC_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={selected.is_default} onChange={(e) => setSelected({ ...selected, is_default: e.target.checked })} />
                  <span style={{ fontSize: 13 }}>Standaard template voor {selected.exc_class}</span>
                </label>
              </Card>
            </div>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  Controlepunten ({selected.items?.length ?? 0})
                </div>
                <Button variant="secondary" onClick={addItem}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={13} /> Toevoegen
                  </span>
                </Button>
              </div>

              {(selected.items ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '12px 0' }}>
                  Nog geen controlepunten. Klik op "Toevoegen" om te beginnen.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.items.map((item, idx) => (
                    <div
                      key={item.temp_id}
                      style={{
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '10px 12px',
                        background: 'var(--color-background-secondary)',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, marginBottom: 6 }}>
                        <label>
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Code</span>
                          <input value={item.code} onChange={(e) => updateItem(item.temp_id, 'code', e.target.value)} style={{ fontSize: 12 }} />
                        </label>
                        <label>
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Titel</span>
                          <input value={item.title} onChange={(e) => updateItem(item.temp_id, 'title', e.target.value)} style={{ fontSize: 12 }} />
                        </label>
                        <label>
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Groep</span>
                          <input value={item.group} onChange={(e) => updateItem(item.temp_id, 'group', e.target.value)} style={{ fontSize: 12 }} />
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                        <label>
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Normreferentie</span>
                          <input
                            value={item.norm_ref}
                            onChange={(e) => updateItem(item.temp_id, 'norm_ref', e.target.value)}
                            placeholder="bijv. NEN-EN 1090-2 §12.4"
                            style={{ fontSize: 12 }}
                          />
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 16 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <input type="checkbox" checked={item.required} onChange={(e) => updateItem(item.temp_id, 'required', e.target.checked)} />
                            Verplicht
                          </label>
                          <button
                            type="button"
                            onClick={() => moveItem(item.temp_id, -1)}
                            disabled={idx === 0}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--color-text-secondary)' }}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(item.temp_id, 1)}
                            disabled={idx === selected.items.length - 1}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--color-text-secondary)' }}
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.temp_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--color-text-danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Inspectietemplates</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {EXC_CLASSES.map((exc) => (
            <Button key={exc} variant="secondary" onClick={() => startNew(exc)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Plus size={12} /> {exc}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            Nog geen inspectietemplates. Klik op een EXC-klasse om een nieuw template aan te maken.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map((t) => (
            <div
              key={t.id}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSelected(t);
                setShowJson(false);
                setSaveError(null);
              }}
            >
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {t.code} · v{t.version} · {t.items?.length ?? 0} controlepunten
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Badge tone="warning">{t.exc_class}</Badge>
                    {t.is_default && <Badge tone="success">Standaard</Badge>}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
