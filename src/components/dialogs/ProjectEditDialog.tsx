import { useEffect, useState } from 'react';
import { Modal } from '@/components/overlays/Modal';
import { Button } from '@/components/ui/Button';

export type ProjectEditValues = {
  id: string;
  projectnummer: string;
  name: string;
  client_name: string;
  execution_class: string;
  status: string;
};

export function ProjectEditDialog({
  open,
  initialValues,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialValues: ProjectEditValues | null;
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

  return (
    <Modal open={open} onClose={onClose} title="Project wijzigen" size="medium">
      <form
        className="form-grid"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError(null);
          try {
            await onSubmit(values);
            onClose();
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Project opslaan mislukt.');
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          <span>Projectnummer</span>
          <input value={values.projectnummer} onChange={(event) => setValues({ ...values, projectnummer: event.target.value })} />
        </label>
        <label>
          <span>Projectnaam</span>
          <input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        </label>
        <label>
          <span>Opdrachtgever</span>
          <input value={values.client_name} onChange={(event) => setValues({ ...values, client_name: event.target.value })} />
        </label>
        <label>
          <span>Executieklasse</span>
          <select value={values.execution_class} onChange={(event) => setValues({ ...values, execution_class: event.target.value })}>
            <option value="EXC1">EXC1</option>
            <option value="EXC2">EXC2</option>
            <option value="EXC3">EXC3</option>
            <option value="EXC4">EXC4</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value })}>
            <option value="concept">Concept</option>
            <option value="in_controle">In controle</option>
            <option value="in_uitvoering">In uitvoering</option>
            <option value="gereed">Gereed</option>
          </select>
        </label>
        {error ? <div className="inline-error">{error}</div> : null}
        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Annuleren</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
