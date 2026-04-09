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

type Props = {
  open: boolean;
  weld: Weld | null;
  inspection: Inspection | null;
  savingWeld?: boolean;
  savingInspection?: boolean;
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

export function WeldInspectionModal({
  open,
  weld,
  inspection,
  savingWeld = false,
  savingInspection = false,
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
    });
  }, [weld]);

  useEffect(() => {
    const source = (inspection || {}) as Record<string, unknown>;
    setInspectionStatus(normalizeStatus(source.status));
    setRemarks(String(source.remarks || ''));
  }, [inspection]);

  if (!open || !weld) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
      <div style={{ width: 'min(960px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Las wijzigen · {String(weld.weld_number || weld.id)}</h2>
          </div>
          <button type="button" onClick={onClose}>Sluiten</button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button type="button" onClick={() => setTab('weld')}>Las</button>
          <button type="button" onClick={() => setTab('inspection')}>Controle</button>
        </div>

        {tab === 'weld' ? (
          <div style={{ marginTop: 20 }}>
            <input value={weldForm.weld_number} onChange={(e) => setWeldForm((p) => ({ ...p, weld_number: e.target.value }))} />
            <button onClick={() => void onSaveWeld(weldForm)}>Opslaan</button>
          </div>
        ) : (
          <div style={{ marginTop: 20 }}>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            <button onClick={() => void onSaveInspection({ status: inspectionStatus, remarks, checks })}>Opslaan</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeldInspectionModal;
