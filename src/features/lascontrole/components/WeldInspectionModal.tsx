import React, { useEffect, useMemo, useState } from 'react';
import type { Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

type WeldStatus = 'conform' | 'defect' | 'gerepareerd';
type InspectionCheckStatus = 'conform' | 'niet-conform';

type CheckItem = {
  group_key: string;
  criterion_key: string;
  approved: boolean;
  status: InspectionCheckStatus;
  comment: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  open: boolean;
  weld: Weld | null;
  inspection: Inspection | null;
  savingWeld?: boolean;
  savingInspection?: boolean;
  assemblyOptions?: SelectOption[];
  wpsOptions?: SelectOption[];
  welderOptions?: SelectOption[];
  templateOptions?: SelectOption[];
  inspectionTemplateMap?: Record<string, Array<Record<string, unknown>>>;
  templateMetaMap?: Record<string, { exc_class?: string; name?: string }>;
  projectName?: string;
  projectNumber?: string;
  onClose: () => void;
  onQuickStatus: (status: WeldStatus) => Promise<void> | void;
  onSaveWeld: (payload: WeldFormValues) => Promise<void> | void;
  onSaveInspection: (payload: {
    overall_status: WeldStatus;
    template_id?: string;
    remarks?: string;
    checks: Array<{ group_key: string; criterion_key: string; approved: boolean; status: 'conform' | 'defect'; comment: string; applicable: boolean }>;
  }) => Promise<void> | void;
};

function normalizeStatus(value: unknown): WeldStatus {
  const raw = String(value || '').toLowerCase();
  if (raw === 'defect') return 'defect';
  if (raw === 'gerepareerd' || raw === 'repaired') return 'gerepareerd';
  return 'conform';
}

function statusPalette(status: WeldStatus | InspectionCheckStatus, active: boolean) {
  if (status === 'niet-conform' || status === 'defect') {
    return active
      ? { border: '#ef4444', background: '#fee2e2', color: '#991b1b' }
      : { border: '#cbd5e1', background: '#ffffff', color: '#0f172a' };
  }
  if (status === 'gerepareerd') {
    return active
      ? { border: '#f59e0b', background: '#fef3c7', color: '#92400e' }
      : { border: '#cbd5e1', background: '#ffffff', color: '#0f172a' };
  }
  return active
    ? { border: '#16a34a', background: '#dcfce7', color: '#166534' }
    : { border: '#cbd5e1', background: '#ffffff', color: '#0f172a' };
}

function buttonStyle(active: boolean, status: WeldStatus | InspectionCheckStatus): React.CSSProperties {
  const palette = statusPalette(status, active);
  return {
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    background: palette.background,
    color: palette.color,
    fontWeight: 600,
    padding: '10px 14px',
    cursor: 'pointer',
  };
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    border: `1px solid ${active ? '#3b82f6' : '#cbd5e1'}`,
    background: active ? '#dbeafe' : '#ffffff',
    color: active ? '#1d4ed8' : '#0f172a',
    fontWeight: 600,
    padding: '10px 14px',
    cursor: 'pointer',
  };
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: '1px solid #93c5fd',
    background: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: 700,
    padding: '12px 16px',
    cursor: 'pointer',
  };
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 600,
    padding: '12px 16px',
    cursor: 'pointer',
  };
}

function fieldLabelStyle(): React.CSSProperties {
  return { display: 'grid', gap: 6, fontSize: 14, color: '#0f172a' };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    padding: '10px 12px',
    fontSize: 14,
  };
}

function parseTemplateChecks(items: Array<Record<string, unknown>> | undefined): CheckItem[] {
  if (!items?.length) {
    return [
      {
        group_key: 'algemeen',
        criterion_key: 'VISUAL_BASE',
        approved: true,
        status: 'conform',
        comment: '',
      },
    ];
  }

  return items.map((item, index) => ({
    group_key: String(item.group || item.group_key || item.norm || 'algemeen'),
    criterion_key: String(item.code || item.criterion_key || item.title || `CHECK_${index + 1}`),
    approved: normalizeStatus(item.default_status || 'conform') === 'conform',
    status: normalizeStatus(item.default_status || 'conform') === 'conform' ? 'conform' : 'niet-conform',
    comment: '',
  }));
}

export function WeldInspectionModal({
  open,
  weld,
  inspection,
  savingWeld = false,
  savingInspection = false,
  assemblyOptions = [],
  wpsOptions = [],
  welderOptions = [],
  templateOptions = [],
  inspectionTemplateMap = {},
  templateMetaMap = {},
  projectName = '',
  projectNumber = '',
  onClose,
  onQuickStatus,
  onSaveWeld,
  onSaveInspection,
}: Props) {
  const [tab, setTab] = useState<'weld' | 'inspection'>('weld');
  const [weldForm, setWeldForm] = useState<WeldFormValues>({
    project_id: '',
    weld_number: '',
    assembly_id: '',
    wps_id: '',
    welder_name: '',
    coordinator_id: '',
    coordinator_name: '',
    process: '135',
    location: '',
    status: 'conform',
    execution_class: '',
    template_id: '',
  });
  const [inspectionStatus, setInspectionStatus] = useState<WeldStatus>('conform');
  const [remarks, setRemarks] = useState('');
  const [checks, setChecks] = useState<CheckItem[]>(parseTemplateChecks(undefined));

  const activeTemplateChecks = useMemo(
    () => parseTemplateChecks(inspectionTemplateMap[String(weldForm.template_id || '')]),
    [inspectionTemplateMap, weldForm.template_id],
  );

  const matchingTemplateId = useMemo(() => {
    const exc = String(weldForm.execution_class || '').trim().toUpperCase();
    if (!exc) return '';
    const found = Object.entries(templateMetaMap).find(([, meta]) => String(meta?.exc_class || '').trim().toUpperCase() === exc);
    return found?.[0] || '';
  }, [templateMetaMap, weldForm.execution_class]);

  useEffect(() => {
    if (!weld) return;
    setTab('weld');
    setWeldForm({
      project_id: String(weld.project_id || ''),
      weld_number: String(weld.weld_number || weld.weld_no || ''),
      assembly_id: String(weld.assembly_id || ''),
      wps_id: String(weld.wps_id || weld.wps || ''),
      welder_name: String(weld.welder_name || weld.welders || ''),
      coordinator_id: String(weld.coordinator_id || ''),
      coordinator_name: String(weld.coordinator_name || ''),
      process: String(weld.process || '135'),
      location: String(weld.location || ''),
      status: normalizeStatus(weld.status),
      execution_class: (['EXC1', 'EXC2', 'EXC3', 'EXC4'].includes(String(weld.execution_class || '')) ? String(weld.execution_class) : '') as WeldFormValues['execution_class'],
      template_id: String(weld.template_id || ''),
    });
  }, [weld]);

  useEffect(() => {
    if (!matchingTemplateId) return;
    setWeldForm((current) => current.template_id === matchingTemplateId ? current : { ...current, template_id: matchingTemplateId });
  }, [matchingTemplateId]);

  useEffect(() => {
    const source = (inspection || {}) as Record<string, unknown>;
    const nextStatus = normalizeStatus(source.overall_status || source.status || source.result);
    setInspectionStatus(nextStatus);
    setRemarks(String(source.remarks || source.notes || ''));
    const rawChecks = Array.isArray(source.checks) ? (source.checks as Array<Record<string, unknown>>) : [];
    if (rawChecks.length) {
      setChecks(
        rawChecks.map((item, index) => ({
          group_key: String(item.group_key || 'algemeen'),
          criterion_key: String(item.criterion_key || `CHECK_${index + 1}`),
          approved: Boolean(item.approved ?? normalizeStatus(item.status) === 'conform'),
          status: normalizeStatus(item.status) === 'conform' ? 'conform' : 'niet-conform',
          comment: String(item.comment || ''),
        })),
      );
      return;
    }
    setChecks(activeTemplateChecks);
  }, [inspection, activeTemplateChecks]);

  useEffect(() => {
    if (inspection) return;
    setChecks(activeTemplateChecks);
  }, [activeTemplateChecks, inspection]);

  if (!open || !weld) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
      data-testid="weld-inspection-overlay"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Las wijzigen · ${String(weld.weld_number || weld.id)}`}
        data-testid="weld-inspection-dialog"
        style={{ width: 'min(1120px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Las wijzigen</h2>
            <div style={{ color: '#64748b', marginTop: 6 }}>Projectnaam – Projectnummer – Lasnummer</div>
            <div style={{ color: '#0f172a', marginTop: 6, fontWeight: 600 }}>{[projectName || 'Project', projectNumber || 'Projectnummer', String(weld.weld_number || weld.id)].join(' – ')}</div>
          </div>
          <button type="button" onClick={onClose} style={secondaryButtonStyle()}>Sluiten</button>
        </div>

        <div role="tablist" aria-label="Las wijzigen tabs" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button role="tab" aria-selected={tab === 'weld'} type="button" onClick={() => setTab('weld')} style={tabStyle(tab === 'weld')}>
            Gegevens van de las
          </button>
          <button role="tab" aria-selected={tab === 'inspection'} type="button" onClick={() => setTab('inspection')} style={tabStyle(tab === 'inspection')}>
            Gegevens van de lascontrole
          </button>
        </div>

        {tab === 'weld' ? (
          <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))', gap: 16 }}>
              <label style={fieldLabelStyle()}>
                <span>Lasnummer</span>
                <input style={inputStyle()} value={weldForm.weld_number} onChange={(e) => setWeldForm((p) => ({ ...p, weld_number: e.target.value }))} />
              </label>
              <label style={fieldLabelStyle()}>
                <span>Locatie</span>
                <input style={inputStyle()} value={weldForm.location} onChange={(e) => setWeldForm((p) => ({ ...p, location: e.target.value }))} />
              </label>
              <label style={fieldLabelStyle()}>
                <span>Assembly</span>
                <select style={inputStyle()} value={weldForm.assembly_id || ''} onChange={(e) => setWeldForm((p) => ({ ...p, assembly_id: e.target.value }))}>
                  <option value="">Kies assembly</option>
                  {assemblyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label style={fieldLabelStyle()}>
                <span>WPS</span>
                <select style={inputStyle()} value={weldForm.wps_id || ''} onChange={(e) => setWeldForm((p) => ({ ...p, wps_id: e.target.value }))}>
                  <option value="">Kies WPS</option>
                  {wpsOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label style={fieldLabelStyle()}>
                <span>Lasser</span>
                <select style={inputStyle()} value={weldForm.welder_name || ''} onChange={(e) => setWeldForm((p) => ({ ...p, welder_name: e.target.value }))}>
                  <option value="">Kies lasser</option>
                  {welderOptions.map((option) => <option key={option.value} value={option.label}>{option.label}</option>)}
                </select>
              </label>
              <label style={fieldLabelStyle()}>
                <span>Proces</span>
                <input style={inputStyle()} value={weldForm.process || ''} onChange={(e) => setWeldForm((p) => ({ ...p, process: e.target.value }))} />
              </label>
              <label style={fieldLabelStyle()}>
                <span>Executieklasse</span>
                <select style={inputStyle()} value={weldForm.execution_class || ''} onChange={(e) => setWeldForm((p) => ({ ...p, execution_class: e.target.value as WeldFormValues['execution_class'] }))}>
                  <option value="">Kies EXC</option>
                  <option value="EXC1">EXC1</option>
                  <option value="EXC2">EXC2</option>
                  <option value="EXC3">EXC3</option>
                  <option value="EXC4">EXC4</option>
                </select>
              </label>
              <label style={fieldLabelStyle()}>
                <span>Inspectietemplate</span>
                <select style={inputStyle()} value={weldForm.template_id || ''} onChange={(e) => setWeldForm((p) => ({ ...p, template_id: e.target.value }))}>
                  <option value="">Kies template</option>
                  {templateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" style={buttonStyle(weldForm.status === 'conform', 'conform')} onClick={() => setWeldForm((p) => ({ ...p, status: 'conform' }))}>Conform</button>
              <button type="button" style={buttonStyle(weldForm.status === 'defect', 'defect')} onClick={() => setWeldForm((p) => ({ ...p, status: 'defect' }))}>Defect</button>
              <button type="button" style={buttonStyle(weldForm.status === 'gerepareerd', 'gerepareerd')} onClick={() => setWeldForm((p) => ({ ...p, status: 'gerepareerd' }))}>Gerepareerd</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={onClose} style={secondaryButtonStyle()}>Annuleren</button>
              <button
                type="button"
                style={primaryButtonStyle()}
                disabled={savingWeld}
                onClick={() => void onSaveWeld(weldForm)}
              >
                {savingWeld ? 'Opslaan...' : 'Las opslaan'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ color: '#0f172a', fontWeight: 600 }}>Controle volgens standaard tabel / inspectietemplate</div>
              <div style={{ color: '#64748b' }}>Kies per controlepunt Conform of Niet conform. Nieuwe controlepunten staan standaard op Conform. De checks komen uit de geselecteerde inspectietemplate.</div>
            </div>
            <label style={fieldLabelStyle()}>
              <span>Opmerking</span>
              <textarea style={{ ...inputStyle(), minHeight: 92 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </label>
            <div style={{ display: 'grid', gap: 12 }}>
              {checks.map((check, index) => (
                <div key={`${check.group_key}-${check.criterion_key}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{check.criterion_key}</strong>
                      <div style={{ color: '#64748b', marginTop: 4 }}>{check.group_key}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" style={buttonStyle(check.status === 'conform', 'conform')} onClick={() => setChecks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'conform', approved: true } : item))}>Conform</button>
                      <button type="button" style={buttonStyle(check.status === 'niet-conform', 'niet-conform')} onClick={() => setChecks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'niet-conform', approved: false } : item))}>Niet conform</button>
                    </div>
                  </div>
                  <label style={fieldLabelStyle()}>
                    <span>Commentaar</span>
                    <textarea style={{ ...inputStyle(), minHeight: 70 }} value={check.comment} onChange={(e) => setChecks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, comment: e.target.value } : item))} />
                  </label>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={onClose} style={secondaryButtonStyle()}>Annuleren</button>
              <button
                type="button"
                style={primaryButtonStyle()}
                disabled={savingInspection}
                onClick={() => void onSaveInspection({
                  overall_status: checks.some((item) => item.status === 'niet-conform') ? 'defect' : 'conform',
                  template_id: weldForm.template_id || undefined,
                  remarks: remarks || undefined,
                  checks: checks.map((item) => ({ ...item, applicable: true, status: item.status === 'niet-conform' ? 'defect' : 'conform' as const })),
                })}
              >
                {savingInspection ? 'Opslaan...' : 'Lascontrole opslaan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeldInspectionModal;
