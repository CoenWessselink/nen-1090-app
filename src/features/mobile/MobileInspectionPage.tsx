import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInspectionForWeld, upsertInspectionForWeld } from '@/api/inspections';
import { getWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { projectWeldsPath, weldNumber } from '@/features/mobile/mobile-utils';
import type { Weld } from '@/types/domain';

const inspectionFields = ['Positie 1', 'Positie 2', 'Visuele Inspectie'];

export function MobileInspectionPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const [weldLabel, setWeldLabel] = useState('Las');
  const [statusMap, setStatusMap] = useState<Record<string, string>>({
    'Positie 1': 'Niet conform',
    'Positie 2': 'Niet conform',
    'Visuele Inspectie': 'Niet conform',
  });
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadInspection() {
    setLoading(true);
    try {
      const [weld, inspection] = await Promise.all([
        getWeld(projectId, weldId).catch(() => null),
        getInspectionForWeld(projectId, weldId).catch(() => null),
      ]);
      if (weld) setWeldLabel(weldNumber(weld as Weld));
      const inspectionRecord = inspection && typeof inspection === 'object' ? (inspection as Record<string, unknown>) : {};
      const checks = Array.isArray(inspectionRecord.checks) ? (inspectionRecord.checks as Array<Record<string, unknown>>) : [];
      const nextMap: Record<string, string> = {
        'Positie 1': 'Niet conform',
        'Positie 2': 'Niet conform',
        'Visuele Inspectie': 'Niet conform',
      };
      inspectionFields.forEach((label) => {
        const found = checks.find((item) => String(item.group_key || item.label || item.criterion_key || '').toLowerCase() === label.toLowerCase());
        if (found?.status) nextMap[label] = String(found.status);
      });
      setStatusMap(nextMap);
      setRemarks(String(inspectionRecord.remarks || inspectionRecord.notes || ''));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inspectie kon niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInspection();
  }, [projectId, weldId]);

  const checks = useMemo(
    () => inspectionFields.map((label) => ({ label, status: statusMap[label] || 'Niet conform' })),
    [statusMap],
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await upsertInspectionForWeld(projectId, weldId, {
        overall_status: 'in controle',
        remarks,
        checks: checks.map((item) => ({ group_key: item.label, label: item.label, status: item.status })),
      });
      navigate(projectWeldsPath(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inspectie opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title={weldLabel} backTo={projectWeldsPath(projectId)} testId="mobile-inspection-page">
      {loading ? <div className="mobile-state-card" data-testid="mobile-inspection-loading">Inspectie laden…</div> : null}
      {error ? (
        <div className="mobile-state-card mobile-state-card-error" data-testid="mobile-inspection-error">
          <strong>Inspectie niet beschikbaar</strong>
          <span>{error}</span>
          {!saving ? <button type="button" className="mobile-secondary-button" onClick={() => void loadInspection()}>Opnieuw proberen</button> : null}
        </div>
      ) : null}
      {!loading ? (
        <div className="mobile-form-card">
          <div className="mobile-inline-actions">
            <div className="mobile-pill mobile-pill-info">In controle</div>
            <button type="button" className="mobile-secondary-button" onClick={() => navigate(projectWeldsPath(projectId))}>Annuleren</button>
          </div>
          {checks.map((item) => (
            <div key={item.label} className="mobile-status-row" data-testid={`mobile-inspection-row-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              <div>
                <strong>{item.label}</strong>
                <small>{item.status}</small>
              </div>
              <div className="mobile-segmented">
                {['Conform', 'In controle', 'Niet conform'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`mobile-segment-button ${item.status === option ? 'is-active' : ''}`}
                    data-tone={option === 'Conform' ? 'success' : option === 'Niet conform' ? 'danger' : 'info'}
                    onClick={() => setStatusMap((current) => ({ ...current, [item.label]: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <label className="mobile-form-field"><span>Opmerking</span><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} /></label>
          <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving} data-testid="mobile-inspection-save-button">{saving ? 'Opslaan…' : 'Opslaan inspectie'}</button>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
