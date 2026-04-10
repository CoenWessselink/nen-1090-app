
import React, { useEffect, useState } from 'react';
import type { Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

type WeldStatus = 'conform' | 'defect' | 'gerepareerd';

type CheckItem = {
  group_key: string;
  criterion_key: string;
  approved: boolean;
  status: WeldStatus;
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
  onClose: () => void;
  onQuickStatus: (status: WeldStatus) => Promise<void> | void;
  onSaveWeld: (payload: WeldFormValues) => Promise<void> | void;
  onSaveInspection: (payload: {
    status: WeldStatus;
    template_id?: string;
    remarks?: string;
    checks: CheckItem[];
  }) => Promise<void> | void;
};

function normalizeStatus(value: unknown): WeldStatus {
  const raw = String(value || '').toLowerCase();
  if (raw === 'defect') return 'defect';
  if (raw === 'gerepareerd') return 'gerepareerd';
  return 'conform';
}

function buttonStyle(active: boolean, status: WeldStatus): React.CSSProperties {
  const isDefect = status === 'defect';
  return {
    borderRadius: 12,
    border: `1px solid ${active ? (isDefect ? '#ef4444' : '#16a34a') : '#cbd5e1'}`,
    background: active ? (isDefect ? '#fee2e2' : '#dcfce7') : '#ffffff',
    color: active ? (isDefect ? '#991b1b' : '#166534') : '#0f172a',
    fontWeight: 600,
    padding: '10px 14px',
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
    process: '135',
    location: '',
    status: 'conform',
    execution_class: '',
    template_id: '',
  });
  const [inspectionStatus, setInspectionStatus] = useState<WeldStatus>('conform');
  const [remarks, setRemarks] = useState('');
  const [checks, setChecks] = useState<CheckItem[]>([
    {
      group_key: 'algemeen',
      criterion_key: 'VISUAL_BASE',
      approved: true,
      status: 'conform',
      comment: '',
    },
  ]);

  useEffect(() => {
    if (!weld) return;
    setWeldForm({
      project_id: String(weld.project_id || ''),
      weld_number: String(weld.weld_number || weld.weld_no || ''),
      assembly_id: String(weld.assembly_id || ''),
      wps_id: String(weld.wps_id || ''),
      welder_name: String(weld.welder_name || ''),
      process: String(weld.process || '135'),
      location: String(weld.location || ''),
      status: normalizeStatus(weld.status),
      execution_class: (['EXC1', 'EXC2', 'EXC3', 'EXC4'].includes(String(weld.execution_class || '')) ? String(weld.execution_class) : '') as WeldFormValues['execution_class'],
      template_id: String(weld.template_id || ''),
    });
  }, [weld]);

  useEffect(() => {
    const source = (inspection || {}) as Record<string, unknown>;
    setInspectionStatus(normalizeStatus(source.status));
    setRemarks(String(source.remarks || source.notes || ''));
    const rawChecks = Array.isArray(source.checks) ? (source.checks as Array<Record<string, unknown>>) : [];
    if (rawChecks.length) {
      setChecks(
        rawChecks.map((item, index) => ({
          group_key: String(item.group_key || 'algemeen'),
          criterion_key: String(item.criterion_key || `CHECK_${index + 1}`),
          approved: Boolean(item.approved ?? normalizeStatus(item.status) === 'conform'),
          status: normalizeStatus(item.status),
          comment: String(item.comment || ''),
        })),
      );
    }
  }, [inspection]);

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
            <h2 style={{ margin: 0 }}>Las wijzigen · {String(weld.weld_number || weld.id)}</h2>
            <div style={{ color: '#64748b', marginTop: 6 }}>Volledige lasgegevens met dropdowns vanuit masterdata en aparte inspectietab.</div>
          </div>
          <button type="button" onClick={onClose}>Sluiten</button>
        </div>

        <div role="tablist" aria-label="Las wijzigen tabs" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            role="tab"
            aria-selected={tab === 'weld'}
            type="button"
            onClick={() => setTab('weld')}
            style={buttonStyle(tab === 'weld', 'conform')}
          >
            Gegevens van de las
          </button>
          <button
            role="tab"
            aria-selected={tab === 'inspection'}
            type="button"
            onClick={() => setTab('inspection')}
            style={buttonStyle(tab === 'inspection', 'conform')}
          >
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

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={buttonStyle(weldForm.status === 'conform', 'conform')} onClick={() => setWeldForm((p) => ({ ...p, status: 'conform' }))}>Conform</button>
              <button type="button" style={buttonStyle(weldForm.status === 'defect', 'defect')} onClick={() => setWeldForm((p) => ({ ...p, status: 'defect' }))}>Defect</button>
              <button type="button" style={buttonStyle(weldForm.status === 'gerepareerd', 'gerepareerd')} onClick={() => setWeldForm((p) => ({ ...p, status: 'gerepareerd' }))}>Gerepareerd</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" style={buttonStyle(false, 'conform')} onClick={() => void onQuickStatus('conform')}>Snel Conform</button>
                <button type="button" style={buttonStyle(false, 'defect')} onClick={() => void onQuickStatus('defect')}>Snel Defect</button>
                <button type="button" style={buttonStyle(false, 'gerepareerd')} onClick={() => void onQuickStatus('gerepareerd')}>Snel Gerepareerd</button>
              </div>
              <button type="button" style={buttonStyle(false, 'conform')} disabled={savingWeld} onClick={() => void onSaveWeld(weldForm)}>
                {savingWeld ? 'Opslaan...' : 'Las opslaan'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={buttonStyle(inspectionStatus === 'conform', 'conform')} onClick={() => setInspectionStatus('conform')}>Conform</button>
              <button type="button" style={buttonStyle(inspectionStatus === 'defect', 'defect')} onClick={() => setInspectionStatus('defect')}>Defect</button>
              <button type="button" style={buttonStyle(inspectionStatus === 'gerepareerd', 'gerepareerd')} onClick={() => setInspectionStatus('gerepareerd')}>Gerepareerd</button>
            </div>

            {checks.map((check, index) => (
              <div key={`${check.group_key}-${check.criterion_key}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 700 }}>{check.criterion_key}</div>
                <div style={{ color: '#64748b', marginTop: 6 }}>{check.group_key}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                  {(['conform', 'defect', 'gerepareerd'] as WeldStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      style={buttonStyle(check.status === status, status)}
                      onClick={() => setChecks((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, status, approved: status !== 'defect' } : row))}
                    >
                      {status === 'conform' ? 'Conform' : status === 'defect' ? 'Defect' : 'Gerepareerd'}
                    </button>
                  ))}
                </div>
                <textarea
                  style={{ ...inputStyle(), minHeight: 88, marginTop: 12 }}
                  value={check.comment}
                  onChange={(event) => setChecks((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, comment: event.target.value } : row))}
                />
              </div>
            ))}

            <label style={fieldLabelStyle()}>
              <span>Algemene opmerkingen</span>
              <textarea style={{ ...inputStyle(), minHeight: 120 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={buttonStyle(false, 'conform')}
                disabled={savingInspection}
                onClick={() => void onSaveInspection({ status: inspectionStatus, template_id: weldForm.template_id || undefined, remarks, checks })}
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
