import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import type { ProjectFormValues } from '@/types/forms';

const executionClasses = ['EXC1', 'EXC2', 'EXC3', 'EXC4'] as const;

function defaultForm(): ProjectFormValues {
  return {
    projectnummer: '',
    name: '',
    client_name: '',
    execution_class: 'EXC2',
    status: 'concept',
    start_date: '',
    end_date: '',
    assemblies: [],
    welds: [],
    apply_materials: false,
    apply_wps: false,
    apply_welders: false,
    inspection_template_id: '',
  };
}

export function MobileProjectCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProjectFormValues>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return Boolean(form.projectnummer.trim() && form.name.trim() && form.client_name.trim() && form.execution_class.trim());
  }, [form]);

  function patch<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!canSave) {
      setError('Vul projectnummer, naam, opdrachtgever en EXC-klasse in.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await createProject(form);
      setSuccess('Project is aangemaakt.');
      navigate(`/projecten/${created.id}/overzicht`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Project aanmaken mislukt.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title="Nieuw project" backTo="/projecten">
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {success ? <div className="mobile-state-card">{success}</div> : null}
      <div className="mobile-form-card" data-testid="mobile-project-create-form">
        <label className="mobile-form-field">
          <span>Projectnummer</span>
          <input value={form.projectnummer} onChange={(event) => patch('projectnummer', event.target.value)} placeholder="Bijv. P-2026-001" />
        </label>
        <label className="mobile-form-field">
          <span>Projectnaam</span>
          <input value={form.name} onChange={(event) => patch('name', event.target.value)} placeholder="Bijv. Nieuw magazijn" />
        </label>
        <label className="mobile-form-field">
          <span>Opdrachtgever</span>
          <input value={form.client_name} onChange={(event) => patch('client_name', event.target.value)} placeholder="Bijv. Demo Staalbouw BV" />
        </label>
        <div className="mobile-inline-actions">
          <label className="mobile-form-field" style={{ flex: 1 }}>
            <span>EXC-klasse</span>
            <select value={form.execution_class} onChange={(event) => patch('execution_class', event.target.value)}>
              {executionClasses.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="mobile-form-field" style={{ flex: 1 }}>
            <span>Status</span>
            <select value={form.status} onChange={(event) => patch('status', event.target.value)}>
              <option value="concept">Concept</option>
              <option value="in-uitvoering">In uitvoering</option>
              <option value="in-controle">In controle</option>
              <option value="gereed">Gereed</option>
            </select>
          </label>
        </div>
        <div className="mobile-inline-actions">
          <label className="mobile-form-field" style={{ flex: 1 }}>
            <span>Startdatum</span>
            <input type="date" value={form.start_date} onChange={(event) => patch('start_date', event.target.value)} />
          </label>
          <label className="mobile-form-field" style={{ flex: 1 }}>
            <span>Einddatum</span>
            <input type="date" value={form.end_date} onChange={(event) => patch('end_date', event.target.value)} />
          </label>
        </div>
        <div className="mobile-inline-actions">
          <button type="button" className="mobile-secondary-button" onClick={() => navigate('/projecten')}>Annuleren</button>
          <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Project opslaan…' : 'Project aanmaken'}
          </button>
        </div>
      </div>
    </MobilePageScaffold>
  );
}
