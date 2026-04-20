import { useEffect, useState } from 'react';
import { Modal } from '@/components/overlays/Modal';
import { Button } from '@/components/ui/Button';

export type ProjectEditValues = {
  id: string;
  projectnummer: string;
  name: string;
  client_name: string;
  execution_class: string;
  acceptance_class: string;
  status: string;
  start_date: string;
  end_date: string;
  inspection_template_id: string;
  description: string;
};

const EXC_CLASSES = ['EXC1', 'EXC2', 'EXC3', 'EXC4'];
const ACC_CLASSES = ['A', 'B', 'C', 'D'];
const STATUSES = [
  { value: 'concept', label: 'Concept' },
  { value: 'in_controle', label: 'In controle' },
  { value: 'in_uitvoering', label: 'In uitvoering' },
  { value: 'gereed', label: 'Gereed' },
  { value: 'gearchiveerd', label: 'Gearchiveerd' },
];

export function ProjectEditDialog({
  open,
  initialValues,
  templates = [],
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialValues: ProjectEditValues | null;
  templates?: Array<{ id: string; name: string; exc_class: string }>;
  onClose: () => void;
  onSubmit: (values: ProjectEditValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ProjectEditValues | null>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
    setError(null);
  }, [initialValues, open]);

  if (!open || !values) return null;

  const set = (key: keyof ProjectEditValues, val: string) =>
    setValues((v) => v ? { ...v, [key]: val } : v);

  // Filter templates op geselecteerde EXC-klasse
  const filteredTemplates = templates.filter(
    (t) => !values.execution_class || t.exc_class === values.execution_class
  );

  return (
    <Modal open={open} onClose={onClose} title="Project wijzigen" size="medium">
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError(null);
          try {
            await onSubmit(values);
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
          } finally {
            setSaving(false);
          }
        }}
      >
        {/* Rij 1: Projectnummer + Naam */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
          <label>
            <span>Projectnummer</span>
            <input
              value={values.projectnummer}
              onChange={(e) => set('projectnummer', e.target.value)}
              placeholder="bijv. 2026-001"
            />
          </label>
          <label>
            <span>Projectnaam</span>
            <input
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </label>
        </div>

        {/* Opdrachtgever */}
        <label>
          <span>Opdrachtgever</span>
          <input
            value={values.client_name}
            onChange={(e) => set('client_name', e.target.value)}
          />
        </label>

        {/* Rij 2: EXC + Acceptatieklasse + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <label>
            <span>Executieklasse</span>
            <select
              value={values.execution_class}
              onChange={(e) => {
                set('execution_class', e.target.value);
                // Reset template bij EXC-wijziging
                set('inspection_template_id', '');
              }}
            >
              <option value="">— kies —</option>
              {EXC_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Acceptatieklasse</span>
            <select
              value={values.acceptance_class}
              onChange={(e) => set('acceptance_class', e.target.value)}
            >
              <option value="">— kies —</option>
              {ACC_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Status</span>
            <select
              value={values.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Rij 3: Startdatum + Einddatum */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label>
            <span>Startdatum</span>
            <input
              type="date"
              value={values.start_date ? values.start_date.substring(0, 10) : ''}
              onChange={(e) => set('start_date', e.target.value)}
            />
          </label>
          <label>
            <span>Einddatum</span>
            <input
              type="date"
              value={values.end_date ? values.end_date.substring(0, 10) : ''}
              onChange={(e) => set('end_date', e.target.value)}
            />
          </label>
        </div>

        {/* Inspectietemplate */}
        {filteredTemplates.length > 0 && (
          <label>
            <span>
              Inspectietemplate
              {values.execution_class && (
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: 6 }}>
                  (gefilterd op {values.execution_class})
                </span>
              )}
            </span>
            <select
              value={values.inspection_template_id}
              onChange={(e) => set('inspection_template_id', e.target.value)}
            >
              <option value="">— standaard template —</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.exc_class})
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Omschrijving */}
        <label>
          <span>Omschrijving <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optioneel)</span></span>
          <textarea
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </label>

        {error && (
          <div className="inline-error" style={{ color: 'var(--color-text-danger)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="dialog-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuleren
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
