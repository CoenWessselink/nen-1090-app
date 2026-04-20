import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInspectionForWeld, upsertInspectionForWeld } from '@/api/inspections';
import { getInspectionTemplates } from '@/api/settings';
import { getWeld } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError, weldNumber } from '@/features/mobile/mobile-utils';
import type { Weld } from '@/types/domain';

type UiStatus = 'Conform' | 'In controle' | 'Niet conform';
type TemplateRow = Record<string, unknown>;
type CheckRow = { key: string; label: string; helper: string };

const fallbackFields: CheckRow[] = [
  { key: 'tekeningen_plan', label: 'Tekeningen / lasplan aanwezig', helper: 'Inspectiecontrole' },
  { key: 'materiaal_trace', label: 'Materiaaltraceerbaarheid vastgelegd', helper: 'Inspectiecontrole' },
  { key: 'wps_wpqr', label: 'Juiste WPS / WPQR toegepast', helper: 'Inspectiecontrole' },
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

function normalizeCheckKey(input: unknown, index: number) {
  const raw = String(input || `check_${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const compact = raw || `check_${index + 1}`;
  return compact.slice(0, 20);
}

function toCheckRows(template: TemplateRow | undefined): CheckRow[] {
  const source = template?.items_json ?? template?.items ?? [];
  const items = Array.isArray(source) ? source : [];
  const mapped = items.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const label = String(record.title || record.label || record.code || `Controlepunt ${index + 1}`);
    return {
      key: normalizeCheckKey(record.code || record.group_key || record.criterion_key || label, index),
      label,
      helper: String(record.group || record.helper || 'Inspectiecontrole'),
    } satisfies CheckRow;
  });
  return mapped.length ? mapped : fallbackFields;
}

export function MobileInspectionPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const [weldLabel, setWeldLabel] = useState('Lasinspectie');
  const [weldExecutionClass, setWeldExecutionClass] = useState('EXC2');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, UiStatus>>({});
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getWeld(projectId, weldId).catch(() => null),
      getInspectionForWeld(projectId, weldId).catch(() => null),
      getInspectionTemplates().catch(() => []),
    ])
      .then(([weld, inspection, templateRows]) => {
        if (!active) return;
        if (weld) {
          const weldRecord = weld as Record<string, unknown>;
          setWeldLabel(weldNumber(weld as Weld));
          setWeldExecutionClass(String(weldRecord.execution_class || 'EXC2'));
          setSelectedTemplateId(String(weldRecord.template_id || ''));
        }
        setTemplates(Array.isArray(templateRows) ? (templateRows as TemplateRow[]) : []);
        const inspectionRecord = inspection && typeof inspection === 'object' ? (inspection as Record<string, unknown>) : {};
        if (inspectionRecord.execution_class) setWeldExecutionClass(String(inspectionRecord.execution_class));
        if (inspectionRecord.template_id) setSelectedTemplateId(String(inspectionRecord.template_id));
        setRemarks(String(inspectionRecord.remarks || inspectionRecord.notes || ''));
        const checks = Array.isArray(inspectionRecord.checks) ? (inspectionRecord.checks as Array<Record<string, unknown>>) : [];
        const map: Record<string, UiStatus> = {};
        checks.forEach((item, index) => {
          const key = normalizeCheckKey(item.group_key || item.criterion_key || item.code || item.label, index);
          if (key) map[key] = toUiStatus(item.status);
        });
        setStatusMap(map);
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
  }, [projectId, weldId]);

  const templateOptions = useMemo(() => {
    const exc = String(weldExecutionClass || '').toUpperCase();
    return templates.filter((item) => {
      const rowExc = String(item.exc_class || item.execution_class || '').toUpperCase();
      return !exc || !rowExc || rowExc === exc;
    });
  }, [templates, weldExecutionClass]);

  useEffect(() => {
    if (selectedTemplateId) return;
    const preferred = templateOptions.find((item) => Boolean(item.is_default)) || templateOptions[0];
    if (preferred?.id) setSelectedTemplateId(String(preferred.id));
  }, [templateOptions, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => templateOptions.find((item) => String(item.id || '') === String(selectedTemplateId || '')),
    [templateOptions, selectedTemplateId],
  );

  const checks = useMemo(() => {
    const rows = toCheckRows(selectedTemplate);
    return rows.map((field) => ({ ...field, status: statusMap[field.key] || 'Conform' as UiStatus }));
  }, [selectedTemplate, statusMap]);

  const overallStatus = useMemo(() => inferOverallStatus(checks.map((item) => item.status)), [checks]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await upsertInspectionForWeld(projectId, weldId, {
        inspector: 'Mobiel',
        inspected_at: new Date().toISOString(),
        execution_class: weldExecutionClass,
        template_id: selectedTemplateId || null,
        overall_status: overallStatus,
        remarks: remarks.trim() || null,
        checks: checks.map((item) => ({
          group_key: item.key,
          criterion_key: item.key,
          code: item.key,
          label: item.label,
          applicable: true,
          approved: item.status === 'Conform',
          status: toBackendStatus(item.status),
          comment: remarks.trim() || null,
        })),
      });
      dispatchAppRefresh({ scope: 'inspection', projectId, weldId, reason: 'inspection-saved' });
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

          <label className="mobile-form-field mobile-select-field">
            <span>Executieklasse</span>
            <select value={weldExecutionClass} onChange={(event) => { setWeldExecutionClass(event.target.value); setSelectedTemplateId(''); setStatusMap({}); }}>
              <option value="EXC1">EXC1</option>
              <option value="EXC2">EXC2</option>
              <option value="EXC3">EXC3</option>
              <option value="EXC4">EXC4</option>
            </select>
          </label>

          <label className="mobile-form-field mobile-select-field">
            <span>Inspectietemplate</span>
            <select value={selectedTemplateId} onChange={(event) => { setSelectedTemplateId(event.target.value); setStatusMap({}); }}>
              <option value="">Selecteer template</option>
              {templateOptions.map((item) => <option key={String(item.id || item.code)} value={String(item.id || '')}>{String(item.name || item.code || item.id || '')}</option>)}
            </select>
          </label>

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
