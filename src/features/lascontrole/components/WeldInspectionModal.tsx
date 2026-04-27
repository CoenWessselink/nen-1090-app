import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Download, Trash2, X } from 'lucide-react';
import { deleteAttachment } from '@/api/documents';
import { downloadInspectionAttachment, getInspectionAttachments, uploadInspectionAttachment } from '@/api/inspections';
import { getWeldAttachments, uploadWeldAttachment } from '@/api/welds';
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

type AttachmentCard = {
  id: string;
  title: string;
  filename?: string;
  uploaded_at?: string;
  size_bytes?: number;
};

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
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

function mutedTextStyle(): React.CSSProperties {
  return { color: '#64748b', fontSize: 13 };
}

function inlineAlertStyle(kind: 'error' | 'success' | 'info'): React.CSSProperties {
  if (kind === 'error') return { borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', padding: '12px 14px' };
  if (kind === 'success') return { borderRadius: 12, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', padding: '12px 14px' };
  return { borderRadius: 12, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', padding: '12px 14px' };
}

function attachmentGridStyle(): React.CSSProperties {
  return { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' };
}

function attachmentCardStyle(): React.CSSProperties {
  return { border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, display: 'grid', gap: 10, background: '#fff' };
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

function mapAttachmentRows(input: unknown): AttachmentCard[] {
  const rows = Array.isArray(input)
    ? input
    : Array.isArray((input as { items?: unknown[] } | undefined)?.items)
      ? ((input as { items?: unknown[] }).items || [])
      : [];

  return rows.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id || ''),
      title: String(row.title || row.filename || 'Foto'),
      filename: String(row.filename || row.title || ''),
      uploaded_at: String(row.uploaded_at || ''),
      size_bytes: Number(row.size_bytes || 0),
    };
  }).filter((item) => item.id);
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
  const [weldAttachments, setWeldAttachments] = useState<AttachmentCard[]>([]);
  const [inspectionAttachments, setInspectionAttachments] = useState<AttachmentCard[]>([]);
  const [pendingWeldPhotos, setPendingWeldPhotos] = useState<PendingPhoto[]>([]);
  const [pendingInspectionPhotos, setPendingInspectionPhotos] = useState<PendingPhoto[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [attachmentBusy, setAttachmentBusy] = useState(false);

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

  useEffect(() => () => {
    pendingWeldPhotos.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    pendingInspectionPhotos.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, [pendingInspectionPhotos, pendingWeldPhotos]);

  useEffect(() => {
    if (!weld) return;
    setTab('weld');
    setAttachmentError(null);
    setAttachmentNotice(null);
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
    if (!open || !weld?.id || !weld.project_id) return;
    let active = true;
    getWeldAttachments(String(weld.project_id), String(weld.id))
      .then((response) => {
        if (!active) return;
        setWeldAttachments(mapAttachmentRows(response));
      })
      .catch(() => {
        if (!active) return;
        setWeldAttachments([]);
      });
    return () => { active = false; };
  }, [open, weld?.id, weld?.project_id]);

  useEffect(() => {
    const inspectionId = String((inspection as Record<string, unknown> | null)?.id || '');
    if (!open || !inspectionId) {
      setInspectionAttachments([]);
      return;
    }
    let active = true;
    getInspectionAttachments(inspectionId)
      .then((response) => {
        if (!active) return;
        setInspectionAttachments(mapAttachmentRows(response));
      })
      .catch(() => {
        if (!active) return;
        setInspectionAttachments([]);
      });
    return () => { active = false; };
  }, [inspection, open]);

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

  function appendPendingPhotos(files: FileList | File[], target: 'weld' | 'inspection') {
    const list = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    if (!list.length) return;
    const mapped = list.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    if (target === 'weld') {
      setPendingWeldPhotos((current) => [...current, ...mapped]);
      return;
    }
    setPendingInspectionPhotos((current) => [...current, ...mapped]);
  }

  function removePendingPhoto(target: 'weld' | 'inspection', photoId: string) {
    if (target === 'weld') {
      setPendingWeldPhotos((current) => {
        const found = current.find((item) => item.id === photoId);
        if (found) URL.revokeObjectURL(found.previewUrl);
        return current.filter((item) => item.id !== photoId);
      });
      return;
    }
    setPendingInspectionPhotos((current) => {
      const found = current.find((item) => item.id === photoId);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return current.filter((item) => item.id !== photoId);
    });
  }

  async function handleDeleteAttachment(attachmentId: string, target: 'weld' | 'inspection') {
    try {
      setAttachmentError(null);
      setAttachmentNotice(null);
      await deleteAttachment(attachmentId);
      if (target === 'weld') setWeldAttachments((current) => current.filter((item) => item.id !== attachmentId));
      else setInspectionAttachments((current) => current.filter((item) => item.id !== attachmentId));
      setAttachmentNotice('Foto verwijderd.');
    } catch {
      setAttachmentError('Foto verwijderen mislukt.');
    }
  }

  async function handleDownloadInspectionAttachment(attachmentId: string) {
    const inspectionId = String((inspection as Record<string, unknown> | null)?.id || '');
    if (!inspectionId) return;
    try {
      await downloadInspectionAttachment(inspectionId, attachmentId);
    } catch {
      setAttachmentError('Foto openen mislukt.');
    }
  }

  async function persistPendingWeldPhotos() {
    if (!weld?.id || !weld.project_id || !pendingWeldPhotos.length) return;
    for (const photo of pendingWeldPhotos) {
      const formData = new FormData();
      formData.append('file', photo.file);
      formData.append('files', photo.file);
      await uploadWeldAttachment(String(weld.project_id), String(weld.id), formData);
      URL.revokeObjectURL(photo.previewUrl);
    }
    setPendingWeldPhotos([]);
    const refreshed = await getWeldAttachments(String(weld.project_id), String(weld.id));
    setWeldAttachments(mapAttachmentRows(refreshed));
  }

  async function persistPendingInspectionPhotos() {
    const inspectionId = String((inspection as Record<string, unknown> | null)?.id || '');
    if (!inspectionId || !pendingInspectionPhotos.length) return;
    for (const photo of pendingInspectionPhotos) {
      const formData = new FormData();
      formData.append('file', photo.file);
      formData.append('files', photo.file);
      await uploadInspectionAttachment(inspectionId, formData);
      URL.revokeObjectURL(photo.previewUrl);
    }
    setPendingInspectionPhotos([]);
    const refreshed = await getInspectionAttachments(inspectionId);
    setInspectionAttachments(mapAttachmentRows(refreshed));
  }

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

        {attachmentError ? <div style={{ ...inlineAlertStyle('error'), marginTop: 16 }}>{attachmentError}</div> : null}
        {attachmentNotice ? <div style={{ ...inlineAlertStyle('success'), marginTop: 16 }}>{attachmentNotice}</div> : null}

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

            <div style={{ display: 'grid', gap: 12 }}>
              <label style={fieldLabelStyle()}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Camera size={16} /> Foto’s van de las</span>
                <input type="file" accept="image/*" multiple onChange={(e) => appendPendingPhotos(e.target.files || [], 'weld')} />
                <span style={mutedTextStyle()}>Voeg meerdere foto’s toe, controleer de previews en sla daarna de las op.</span>
              </label>

              {pendingWeldPhotos.length ? (
                <div style={attachmentGridStyle()}>
                  {pendingWeldPhotos.map((photo) => (
                    <div key={photo.id} style={attachmentCardStyle()}>
                      <img src={photo.previewUrl} alt={photo.file.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
                      <div>
                        <strong>{photo.file.name}</strong>
                        <div style={mutedTextStyle()}>{Math.round(photo.file.size / 1024)} KB</div>
                      </div>
                      <button type="button" style={secondaryButtonStyle()} onClick={() => removePendingPhoto('weld', photo.id)}>
                        <X size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Verwijderen
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {weldAttachments.length ? (
                <div style={attachmentGridStyle()}>
                  {weldAttachments.map((item) => (
                    <div key={item.id} style={attachmentCardStyle()}>
                      <div>
                        <strong>{item.title}</strong>
                        {item.filename ? <div style={mutedTextStyle()}>{item.filename}</div> : null}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" style={secondaryButtonStyle()} onClick={() => handleDeleteAttachment(item.id, 'weld')}>
                          <Trash2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Verwijderen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={mutedTextStyle()}>Nog geen lasfoto’s gekoppeld.</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={onClose} style={secondaryButtonStyle()}>Annuleren</button>
              <button
                type="button"
                style={primaryButtonStyle()}
                disabled={savingWeld || attachmentBusy}
                onClick={async () => {
                  try {
                    setAttachmentBusy(true);
                    setAttachmentError(null);
                    setAttachmentNotice(null);
                    await onSaveWeld(weldForm);
                    await persistPendingWeldPhotos();
                    setAttachmentNotice('Las en foto’s opgeslagen.');
                  } catch {
                    setAttachmentError('Las opslaan mislukt.');
                  } finally {
                    setAttachmentBusy(false);
                  }
                }}
              >
                {savingWeld || attachmentBusy ? 'Opslaan...' : 'Las opslaan'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ color: '#0f172a', fontWeight: 600 }}>Controle volgens standaard tabel / inspectietemplate</div>
              <div style={{ color: '#64748b' }}>Kies per controlepunt Conform of Niet conform. Nieuwe controlepunten staan standaard op Conform. De checks komen uit de geselecteerde inspectietemplate.</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" style={buttonStyle(inspectionStatus === 'conform', 'conform')} onClick={() => setInspectionStatus('conform')}>Conform</button>
              <button type="button" style={buttonStyle(inspectionStatus === 'defect', 'defect')} onClick={() => setInspectionStatus('defect')}>Niet conform</button>
              <button type="button" style={buttonStyle(inspectionStatus === 'gerepareerd', 'gerepareerd')} onClick={() => setInspectionStatus('gerepareerd')}>In controle / herstel</button>
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

            <div style={{ display: 'grid', gap: 12 }}>
              <label style={fieldLabelStyle()}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Camera size={16} /> Inspectiefoto’s</span>
                <input type="file" accept="image/*" multiple onChange={(e) => appendPendingPhotos(e.target.files || [], 'inspection')} />
                <span style={mutedTextStyle()}>Voeg bewijsfoto’s toe aan deze inspectie en controleer de previews vóór opslaan.</span>
              </label>

              {pendingInspectionPhotos.length ? (
                <div style={attachmentGridStyle()}>
                  {pendingInspectionPhotos.map((photo) => (
                    <div key={photo.id} style={attachmentCardStyle()}>
                      <img src={photo.previewUrl} alt={photo.file.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
                      <div>
                        <strong>{photo.file.name}</strong>
                        <div style={mutedTextStyle()}>{Math.round(photo.file.size / 1024)} KB</div>
                      </div>
                      <button type="button" style={secondaryButtonStyle()} onClick={() => removePendingPhoto('inspection', photo.id)}>
                        <X size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Verwijderen
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {inspectionAttachments.length ? (
                <div style={attachmentGridStyle()}>
                  {inspectionAttachments.map((item) => (
                    <div key={item.id} style={attachmentCardStyle()}>
                      <div>
                        <strong>{item.title}</strong>
                        {item.filename ? <div style={mutedTextStyle()}>{item.filename}</div> : null}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" style={secondaryButtonStyle()} onClick={() => void handleDownloadInspectionAttachment(item.id)}>
                          <Download size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Openen
                        </button>
                        <button type="button" style={secondaryButtonStyle()} onClick={() => handleDeleteAttachment(item.id, 'inspection')}>
                          <Trash2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Verwijderen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={mutedTextStyle()}>Nog geen inspectiefoto’s gekoppeld.</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={onClose} style={secondaryButtonStyle()}>Annuleren</button>
              <button
                type="button"
                style={primaryButtonStyle()}
                disabled={savingInspection || attachmentBusy}
                onClick={async () => {
                  try {
                    setAttachmentBusy(true);
                    setAttachmentError(null);
                    setAttachmentNotice(null);
                    await onSaveInspection({
                      overall_status: inspectionStatus,
                      template_id: weldForm.template_id || undefined,
                      remarks: remarks || undefined,
                      checks: checks.map((item) => ({
                        ...item,
                        applicable: true,
                        status: item.status === 'niet-conform' ? 'defect' : 'conform' as const,
                      })),
                    });
                    await persistPendingInspectionPhotos();
                    setAttachmentNotice('Lascontrole en foto’s opgeslagen.');
                  } catch {
                    setAttachmentError('Lascontrole opslaan mislukt.');
                  } finally {
                    setAttachmentBusy(false);
                  }
                }}
              >
                {savingInspection || attachmentBusy ? 'Opslaan...' : 'Lascontrole opslaan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeldInspectionModal;
