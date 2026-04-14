import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInspectionForWeld, upsertInspectionForWeld } from '@/api/inspections';
import { getWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { normalizeApiError, weldNumber } from '@/features/mobile/mobile-utils';
import type { Weld } from '@/types/domain';

type UiStatus = 'Conform' | 'In controle' | 'Niet conform';
type CheckRow = { key: string; label: string; helper: string };

const inspectionFields: CheckRow[] = [
  { key: 'positie_1', label: 'Positie 1', helper: 'Visuele beoordeling van positie 1' },
  { key: 'positie_2', label: 'Positie 2', helper: 'Visuele beoordeling van positie 2' },
  { key: 'visuele_inspectie', label: 'Visuele inspectie', helper: 'Algemene visuele eindcontrole' },
];

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

function inferOverallStatus(values: UiStatus[]) {
  if (values.some((value) => value === 'Niet conform')) return 'defect';
  if (values.every((value) => value === 'Conform')) return 'conform';
  return 'gerepareerd';
}

export function MobileInspectionPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const [weldLabel, setWeldLabel] = useState('Lasinspectie');
  const [statusMap, setStatusMap] = useState<Record<string, UiStatus>>({
    positie_1: 'In controle',
    positie_2: 'In controle',
    visuele_inspectie: 'In controle',
  });
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getWeld(projectId, weldId).catch(() => null), getInspectionForWeld(projectId, weldId).catch(() => null)])
      .then(([weld, inspection]) => {
        if (!active) return;
        if (weld) setWeldLabel(weldNumber(weld as Weld));
        const inspectionRecord = inspection && typeof inspection === 'object' ? (inspection as Record<string, unknown>) : {};
        const checks = Array.isArray(inspectionRecord.checks) ? (inspectionRecord.checks as Array<Record<string, unknown>>) : [];
        const nextMap = { ...statusMap };
        inspectionFields.forEach((field) => {
          const found = checks.find((item) => {
            const key = String(item.group_key || item.label || item.criterion_key || '').toLowerCase().replace(/\s+/g, '_');
            return key === field.key || key === field.label.toLowerCase().replace(/\s+/g, '_');
          });
          if (found) nextMap[field.key] = toUiStatus(found.status);
        });
        setStatusMap(nextMap);
        setRemarks(String(inspectionRecord.remarks || inspectionRecord.notes || ''));
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(normalizeApiError(err, 'Inspectie kon niet worden geladen.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, weldId]);

  const checks = useMemo(
    () => inspectionFields.map((field) => ({ ...field, status: statusMap[field.key] || 'In controle' })),
    [statusMap],
  );

  const overallStatus = useMemo(() => inferOverallStatus(Object.values(statusMap)), [statusMap]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await upsertInspectionForWeld(projectId, weldId, {
        inspector: 'Mobiel',
        inspected_at: new Date().toISOString(),
        overall_status: overallStatus,
        remarks: remarks.trim() || null,
        checks: checks.map((item) => ({
          group_key: item.key,
          criterion_key: item.key,
          label: item.label,
          applicable: true,
          approved: item.status === 'Conform',
          status: toBackendStatus(item.status),
          comment: remarks.trim() || null,
        })),
      });
      setNotice('Inspectie is opgeslagen.');
      window.setTimeout(() => navigate(`/projecten/${projectId}/lassen`), 350);
    } catch (err) {
      setError(normalizeApiError(err, 'Inspectie opslaan mislukt.'));
    } finally {
      setSaving(false);
    }
  }

  const overallLabel = overallStatus === 'conform' ? 'Conform' : overallStatus === 'defect' ? 'Niet conform' : 'In controle';
  const overallTone = overallStatus === 'conform' ? 'success' : overallStatus === 'defect' ? 'danger' : 'info';

  return (
    <MobilePageScaffold title={weldLabel} subtitle="Inspectie" backTo={`/projecten/${projectId}/lassen`}>
      {loading ? <div className="mobile-state-card">Inspectie laden…</div> : null}
      {error ? <div className="mobile-inline-alert is-error"><AlertCircle size={16} /> {error}</div> : null}
      {notice ? <div className="mobile-inline-alert is-success"><CheckCircle2 size={16} /> {notice}</div> : null}
      {!loading ? (
        <div className="mobile-form-card" data-testid="mobile-inspection-form">
          <div className="mobile-form-toolbar">
            <div className={`mobile-pill mobile-pill-${overallTone}`}>{overallLabel}</div>
            <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>
              Annuleren
            </button>
          </div>

          {checks.map((item) => (
            <section key={item.key} className="mobile-status-card">
              <div className="mobile-status-copy">
                <strong>{item.label}</strong>
                <small>{item.helper}</small>
              </div>
              <div className="mobile-segmented is-three-up">
                {(['Conform', 'In controle', 'Niet conform'] as UiStatus[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`mobile-segment-button ${item.status === option ? 'is-active' : ''}`}
                    data-tone={option === 'Conform' ? 'success' : option === 'Niet conform' ? 'danger' : 'info'}
                    onClick={() => setStatusMap((current) => ({ ...current, [item.key]: option }))}
                  >
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}

          <label className="mobile-form-field is-textarea">
            <span>Opmerking</span>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} placeholder="Optionele opmerking voor deze inspectie" />
          </label>

          <button type="button" className="mobile-primary-button mobile-primary-button-block" onClick={handleSave} disabled={saving}>
            {saving ? <><LoaderCircle size={16} className="is-spinning" /> Opslaan…</> : 'Opslaan inspectie'}
          </button>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
