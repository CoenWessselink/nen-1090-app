import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInspectionForWeld, upsertInspectionForWeld } from '@/api/inspections';
import { getWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { weldNumber } from '@/features/mobile/mobile-utils';
import type { Weld } from '@/types/domain';

type UiStatus = 'Conform' | 'In controle' | 'Niet conform';
const inspectionFields = ['Positie 1', 'Positie 2', 'Visuele Inspectie'];

function toBackendStatus(value: UiStatus) {
  if (value === 'Conform') return 'conform';
  if (value === 'Niet conform') return 'defect';
  return 'gerepareerd';
}

function toUiStatus(value: unknown): UiStatus {
  const raw = String(value || '').toLowerCase();
  if (['conform', 'approved', 'ok'].includes(raw)) return 'Conform';
  if (['defect', 'rejected', 'niet conform', 'non_conform'].includes(raw)) return 'Niet conform';
  return 'In controle';
}

export function MobileInspectionPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const [weldLabel, setWeldLabel] = useState('Las');
  const [statusMap, setStatusMap] = useState<Record<string, UiStatus>>({
    'Positie 1': 'Niet conform',
    'Positie 2': 'Niet conform',
    'Visuele Inspectie': 'Niet conform',
  });
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getWeld(projectId, weldId).catch(() => null), getInspectionForWeld(projectId, weldId).catch(() => null)])
      .then(([weld, inspection]) => {
        if (!active) return;
        if (weld) setWeldLabel(weldNumber(weld as Weld));
        const inspectionRecord = inspection && typeof inspection === 'object' ? (inspection as Record<string, unknown>) : {};
        const checks = Array.isArray(inspectionRecord.checks) ? (inspectionRecord.checks as Array<Record<string, unknown>>) : [];
        const nextMap = { ...statusMap };
        inspectionFields.forEach((label) => {
          const found = checks.find((item) => String(item.group_key || item.label || item.criterion_key || '').toLowerCase() === label.toLowerCase());
          if (found) nextMap[label] = toUiStatus(found.status);
        });
        setStatusMap(nextMap);
        setRemarks(String(inspectionRecord.remarks || inspectionRecord.notes || ''));
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Inspectie kon niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectId, weldId]);

  const checks = useMemo(
    () => inspectionFields.map((label) => ({ label, status: statusMap[label] || 'Niet conform' })),
    [statusMap],
  );

  const overallStatus = useMemo(() => {
    const values = Object.values(statusMap);
    if (values.some((value) => value === 'Niet conform')) return 'defect';
    if (values.every((value) => value === 'Conform')) return 'conform';
    return 'gerepareerd';
  }, [statusMap]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await upsertInspectionForWeld(projectId, weldId, {
        inspector: 'Mobiel',
        inspected_at: new Date().toISOString(),
        overall_status: overallStatus,
        remarks,
        checks: checks.map((item, index) => ({
          group_key: `groep-${index + 1}`,
          criterion_key: item.label,
          applicable: true,
          approved: item.status === 'Conform',
          status: toBackendStatus(item.status),
          comment: remarks || null,
        })),
      });
      navigate(`/projecten/${projectId}/lassen`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inspectie opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title={weldLabel} backTo={`/projecten/${projectId}/lassen`}>
      {loading ? <div className="mobile-state-card">Inspectie laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading ? (
        <div className="mobile-form-card" data-testid="mobile-inspection-form">
          <div className="mobile-inline-actions">
            <div className="mobile-pill mobile-pill-info">{overallStatus === 'conform' ? 'Conform' : overallStatus === 'defect' ? 'Niet conform' : 'In controle'}</div>
            <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Annuleren</button>
          </div>
          {checks.map((item) => (
            <div key={item.label} className="mobile-status-row">
              <div>
                <strong>{item.label}</strong>
                <small>{item.status}</small>
              </div>
              <div className="mobile-segmented">
                {(['Conform', 'In controle', 'Niet conform'] as UiStatus[]).map((option) => (
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
          <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan inspectie'}</button>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
