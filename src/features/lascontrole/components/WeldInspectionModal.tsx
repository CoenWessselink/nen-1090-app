import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/overlays/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { useInspectionTemplates } from '@/hooks/useSettings';
import type { Inspection, Weld, WeldStatus } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

type ChecklistRow = {
  group_key: string;
  criterion_key: string;
  status: WeldStatus;
  comment: string;
};

const modalTabs = [
  { value: 'weld', label: 'Gegevens van de las' },
  { value: 'inspection', label: 'Gegevens van de lascontrole' },
];

function panelStyle(): React.CSSProperties {
  return {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
  };
}

function fieldGridStyle(): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  };
}

function labelStyle(): React.CSSProperties {
  return {
    display: 'grid',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    minHeight: 44,
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    padding: '10px 12px',
    fontSize: 14,
    color: '#0f172a',
    background: '#ffffff',
  };
}

function statusButtonStyle(active: boolean, status: WeldStatus): React.CSSProperties {
  const palette = status === 'defect'
    ? { background: '#fee2e2', border: '#ef4444', color: '#991b1b' }
    : { background: '#dcfce7', border: '#16a34a', color: '#166534' };

  return {
    minHeight: 40,
    borderRadius: 12,
    border: `1px solid ${active ? palette.border : '#cbd5e1'}`,
    background: active ? palette.background : '#ffffff',
    color: active ? palette.color : '#0f172a',
    fontWeight: 700,
    padding: '8px 12px',
    cursor: 'pointer',
  };
}

function normalizeStatus(value: unknown): WeldStatus {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'gerepareerd' || raw === 'resolved' || raw === 'repaired') return 'gerepareerd';
  if (raw === 'defect' || raw === 'rejected' || raw === 'nok' || raw === 'not_conform') return 'defect';
  return 'conform';
}

function normalizeExecutionClass(value: unknown) {
  const text = String(value || '').trim().toUpperCase();
  return ['EXC1', 'EXC2', 'EXC3', 'EXC4'].includes(text) ? text : '';
}

function createChecklistFromTemplate(template: Record<string, unknown> | undefined, existing: ChecklistRow[], force = false): ChecklistRow[] {
  if (existing.length && !force) return existing;

  const rawItems = Array.isArray(template?.items_json) ? template?.items_json : [];
  if (rawItems.length) {
    return rawItems.map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        group_key: String(row.group || row.groep || 'algemeen'),
        criterion_key: String(row.code || row.key || row.title || `ITEM_${index + 1}`),
        status: normalizeStatus(row.default_status || 'conform') as WeldStatus,
        comment: '',
      };
    });
  }

  return [
    { group_key: 'algemeen', criterion_key: 'VISUAL_BASE', status: 'conform', comment: '' },
    { group_key: 'maatvoering', criterion_key: 'DIMENSION_CHECK', status: 'conform', comment: '' },
  ];
}

export function WeldInspectionModal({
  open,
  weld,
  inspection,
  savingWeld = false,
  savingInspection = false,
  onClose,
  onSaveWeld,
  onSaveInspection,
  onQuickStatus,
}: {
  open: boolean;
  weld: Weld | null;
  inspection: Inspection | null;
  savingWeld?: boolean;
  savingInspection?: boolean;
  onClose: () => void;
  onSaveWeld: (payload: WeldFormValues) => Promise<void> | void;
  onSaveInspection: (payload: { status: WeldStatus; template_id?: string; remarks: string; checks: Array<{ group_key: string; criterion_key: string; status: WeldStatus; comment: string }> }) => Promise<void> | void;
  onQuickStatus?: (status: WeldStatus) => Promise<void> | void;
}) {
  const templatesQuery = useInspectionTemplates(open);
  const templateRows = useMemo(() => (templatesQuery.data?.items || []) as Array<Record<string, unknown>>, [templatesQuery.data]);
  const [activeTab, setActiveTab] = useState<'weld' | 'inspection'>('weld');
  const [weldForm, setWeldForm] = useState<WeldFormValues | null>(null);
  const [inspectionStatus, setInspectionStatus] = useState<WeldStatus>('conform');
  const [inspectionRemarks, setInspectionRemarks] = useState('');
  const [inspectionTemplateId, setInspectionTemplateId] = useState('');
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);

  const filteredTemplates = useMemo(() => {
    const executionClass = normalizeExecutionClass(weldForm?.execution_class || weld?.execution_class);
    if (!executionClass) return templateRows;
    return templateRows.filter((row) => normalizeExecutionClass(row.execution_class || row.exc_class) === executionClass);
  }, [templateRows, weld, weldForm?.execution_class]);

  const selectedTemplate = useMemo(() => {
    const templateId = String(inspectionTemplateId || weldForm?.template_id || weld?.template_id || '');
    return filteredTemplates.find((row) => String(row.id) === templateId) || filteredTemplates[0];
  }, [filteredTemplates, inspectionTemplateId, weld, weldForm?.template_id]);

  useEffect(() => {
    if (!weld) {
      setWeldForm(null);
      setInspectionStatus('conform');
      setInspectionRemarks('');
      setInspectionTemplateId('');
      setChecklist([]);
      setActiveTab('weld');
      return;
    }

    const nextWeldForm: WeldFormValues = {
      project_id: String(weld.project_id || ''),
      weld_number: String(weld.weld_number || weld.weld_no || ''),
      assembly_id: String(weld.assembly_id || ''),
      wps_id: String(weld.wps_id || ''),
      welder_name: String(weld.welder_name || ''),
      process: String(weld.process || '135'),
      location: String(weld.location || ''),
      status: normalizeStatus(weld.status),
      execution_class: (normalizeExecutionClass(weld.execution_class) || '') as WeldFormValues['execution_class'],
      template_id: String(weld.template_id || inspection?.template_id || ''),
    };

    const existingChecks: ChecklistRow[] = Array.isArray(inspection?.checks)
      ? inspection.checks.map((check) => ({
          group_key: String(check.group_key || 'algemeen'),
          criterion_key: String(check.criterion_key || ''),
          status: normalizeStatus(check.status),
          comment: String(check.comment || ''),
        }))
      : [];

    const initialTemplateId = String(inspection?.template_id || nextWeldForm.template_id || '');
    const matchingTemplate = templateRows.find((row) => String(row.id) === initialTemplateId) || templateRows.find((row) => normalizeExecutionClass(row.execution_class || row.exc_class) === normalizeExecutionClass(nextWeldForm.execution_class));

    setWeldForm(nextWeldForm);
    setInspectionStatus(normalizeStatus(inspection?.status || weld.status));
    setInspectionRemarks(String(inspection?.remarks || inspection?.notes || ''));
    setInspectionTemplateId(initialTemplateId || String(matchingTemplate?.id || ''));
    setChecklist(createChecklistFromTemplate(matchingTemplate, existingChecks));
    setActiveTab('weld');
  }, [inspection, templateRows, weld]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const templateId = String(selectedTemplate.id || '');
    const currentTemplateId = String(inspectionTemplateId || '');
    const shouldRefreshChecklist = templateId && templateId !== currentTemplateId;
    setChecklist((current) => createChecklistFromTemplate(selectedTemplate, current, shouldRefreshChecklist));
    if ((!inspectionTemplateId || shouldRefreshChecklist) && selectedTemplate.id) {
      setInspectionTemplateId(templateId);
    }
  }, [inspectionTemplateId, selectedTemplate]);

  if (!open || !weld || !weldForm) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Las wijzigen · ${weld.weld_number || weld.weld_no || weld.id}`} size="large">
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={panelStyle()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Projectinterne popup</div>
              <strong>Dubbelklik verlaat de projectcontext niet</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['conform', 'defect', 'gerepareerd'] as WeldStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  style={statusButtonStyle(normalizeStatus(weldForm.status) === status, status)}
                  onClick={() => {
                    setWeldForm((current) => (current ? { ...current, status } : current));
                    setInspectionStatus(status);
                    void onQuickStatus?.(status);
                  }}
                >
                  {status === 'conform' ? 'Conform' : status === 'defect' ? 'Defect' : 'Gerepareerd'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Tabs tabs={modalTabs} value={activeTab} onChange={(value) => setActiveTab(value as 'weld' | 'inspection')} />

        {activeTab === 'weld' ? (
          <div style={panelStyle()}>
            <div style={fieldGridStyle()}>
              <label style={labelStyle()}>
                Lasnummer
                <input style={inputStyle()} value={weldForm.weld_number} onChange={(event) => setWeldForm({ ...weldForm, weld_number: event.target.value })} />
              </label>
              <label style={labelStyle()}>
                Assembly
                <input style={inputStyle()} value={weldForm.assembly_id || ''} onChange={(event) => setWeldForm({ ...weldForm, assembly_id: event.target.value })} placeholder="Assembly ID" />
              </label>
              <label style={labelStyle()}>
                Executieklasse
                <select style={inputStyle()} value={weldForm.execution_class || ''} onChange={(event) => {
                  const nextExecutionClass = event.target.value as WeldFormValues['execution_class'];
                  const nextTemplate = templateRows.find((row) => normalizeExecutionClass(row.execution_class || row.exc_class) === normalizeExecutionClass(nextExecutionClass));
                  setWeldForm({ ...weldForm, execution_class: nextExecutionClass, template_id: String(nextTemplate?.id || '') });
                  setInspectionTemplateId(String(nextTemplate?.id || ''));
                  setChecklist(createChecklistFromTemplate(nextTemplate, [], true));
                }}>
                  <option value="">Overnemen van project</option>
                  <option value="EXC1">EXC1</option>
                  <option value="EXC2">EXC2</option>
                  <option value="EXC3">EXC3</option>
                  <option value="EXC4">EXC4</option>
                </select>
              </label>
              <label style={labelStyle()}>
                WPS
                <input style={inputStyle()} value={weldForm.wps_id || ''} onChange={(event) => setWeldForm({ ...weldForm, wps_id: event.target.value })} />
              </label>
              <label style={labelStyle()}>
                Lasser
                <input style={inputStyle()} value={weldForm.welder_name || ''} onChange={(event) => setWeldForm({ ...weldForm, welder_name: event.target.value })} />
              </label>
              <label style={labelStyle()}>
                Locatie
                <input style={inputStyle()} value={weldForm.location} onChange={(event) => setWeldForm({ ...weldForm, location: event.target.value })} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <Button variant="secondary" onClick={onClose}>Annuleren</Button>
              <Button onClick={() => void onSaveWeld(weldForm)} disabled={savingWeld}>{savingWeld ? 'Opslaan...' : 'Lasgegevens opslaan'}</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={panelStyle()}>
              <div style={fieldGridStyle()}>
                <label style={labelStyle()}>
                  Template
                  <select style={inputStyle()} value={inspectionTemplateId} onChange={(event) => setInspectionTemplateId(event.target.value)}>
                    <option value="">Automatisch kiezen</option>
                    {filteredTemplates.map((row) => (
                      <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.code || row.id)}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle()}>
                  Algemene status
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['conform', 'defect', 'gerepareerd'] as WeldStatus[]).map((status) => (
                      <button key={status} type="button" style={statusButtonStyle(inspectionStatus === status, status)} onClick={() => setInspectionStatus(status)}>
                        {status === 'conform' ? 'Conform' : status === 'defect' ? 'Defect' : 'Gerepareerd'}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <label style={{ ...labelStyle(), marginTop: 16 }}>
                Opmerkingen
                <textarea style={{ ...inputStyle(), minHeight: 96 }} value={inspectionRemarks} onChange={(event) => setInspectionRemarks(event.target.value)} />
              </label>
            </div>

            <div style={panelStyle()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <strong>Checklist volgens template</strong>
                <div style={{ color: '#64748b', fontSize: 13 }}>Standaard op conform. Per punt te wijzigen.</div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {checklist.map((row, index) => (
                  <div key={`${row.group_key}-${row.criterion_key}-${index}`} style={{ ...panelStyle(), padding: 12 }}>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <strong>{row.criterion_key || `Checklistpunt ${index + 1}`}</strong>
                          <div style={{ color: '#64748b', marginTop: 6 }}>{row.group_key}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(['conform', 'defect', 'gerepareerd'] as WeldStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              style={statusButtonStyle(row.status === status, status)}
                              onClick={() => setChecklist((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status } : item))}
                            >
                              {status === 'conform' ? 'Conform' : status === 'defect' ? 'Defect' : 'Gerepareerd'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        style={{ ...inputStyle(), minHeight: 72 }}
                        placeholder="Opmerking per controlepunt"
                        value={row.comment}
                        onChange={(event) => setChecklist((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, comment: event.target.value } : item))}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <Button variant="secondary" onClick={onClose}>Annuleren</Button>
                <Button
                  onClick={() => void onSaveInspection({
                    status: inspectionStatus,
                    template_id: inspectionTemplateId || undefined,
                    remarks: inspectionRemarks,
                    checks: checklist,
                  })}
                  disabled={savingInspection}
                >
                  {savingInspection ? 'Opslaan...' : 'Lascontrole opslaan'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
