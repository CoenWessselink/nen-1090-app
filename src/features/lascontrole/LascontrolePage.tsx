import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectTabShell from '@/app/layout/ProjectTabShell';
import { useProjectWelds } from '@/hooks/useProjects';
import { useUpsertWeldInspection, useWeldInspection } from '@/hooks/useInspections';
import type { Inspection, Weld, WeldStatus } from '@/types/domain';

function normalizeStatus(value: unknown): WeldStatus {
  const raw = String(value || '').toLowerCase();
  if (raw === 'conform') return 'conform';
  if (raw === 'gerepareerd') return 'gerepareerd';
  return 'defect';
}

function toStatusLabel(status: WeldStatus) {
  if (status === 'gerepareerd') return 'Gerepareerd';
  if (status === 'defect') return 'Defect';
  return 'Conform';
}

function surfaceStyle(): React.CSSProperties {
  return {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
  };
}

function buttonStyle(primary = false): React.CSSProperties {
  return {
    borderRadius: 12,
    border: primary ? '1px solid #2563eb' : '1px solid #cbd5e1',
    background: primary ? '#2563eb' : '#ffffff',
    color: primary ? '#ffffff' : '#0f172a',
    fontWeight: 600,
    padding: '10px 14px',
    cursor: 'pointer',
  };
}

export function LascontrolePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const weldsQuery = useProjectWelds(projectId, { page: 1, limit: 50 });
  const welds = (weldsQuery.data?.items || []) as Weld[];

  const [selectedWeld, setSelectedWeld] = useState<Weld | null>(null);
  const inspectionQuery = useWeldInspection(projectId, selectedWeld?.id);
  const saveInspection = useUpsertWeldInspection(String(projectId || ''), String(selectedWeld?.id || ''));
  const inspection = inspectionQuery.data as Inspection | null;

  const stats = useMemo(() => {
    const total = welds.length;
    const conform = welds.filter((item) => normalizeStatus(item.status) === 'conform').length;
    const defect = welds.filter((item) => normalizeStatus(item.status) === 'defect').length;
    const gerepareerd = welds.filter((item) => normalizeStatus(item.status) === 'gerepareerd').length;
    return { total, conform, defect, gerepareerd };
  }, [welds]);

  async function applyStatus(weld: Weld, status: WeldStatus) {
    setSelectedWeld(weld);

    const checks = Array.isArray(inspection?.checks) && inspection.checks.length
      ? inspection.checks.map((check) => ({
          group_key: String(check.group_key || 'algemeen'),
          criterion_key: String(check.criterion_key || ''),
          approved: status !== 'defect',
          status,
          comment: check.comment ? String(check.comment) : '',
        }))
      : [
          { group_key: 'algemeen', criterion_key: 'VISUAL_BASE', approved: status !== 'defect', status, comment: '' },
          { group_key: 'maatvoering', criterion_key: 'DIMENSION_CHECK', approved: status !== 'defect', status, comment: '' },
        ];

    await saveInspection.mutateAsync({
      status,
      remarks: typeof inspection?.remarks === 'string' ? inspection.remarks : '',
      checks,
    });

    await inspectionQuery.refetch();
  }

  const filters = (
    <input
      placeholder="Zoek op las, locatie, lasser of status"
      style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}
    />
  );

  const kpis = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      <div style={surfaceStyle()}><div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Lassen</div><div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>{stats.total}</div><div style={{ color: '#64748b', marginTop: 8 }}>Direct bewerkbaar via dubbelklik.</div></div>
      <div style={surfaceStyle()}><div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Conform</div><div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>{stats.conform}</div><div style={{ color: '#64748b', marginTop: 8 }}>Groene eindstatus.</div></div>
      <div style={surfaceStyle()}><div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Defecten</div><div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>{stats.defect}</div><div style={{ color: '#64748b', marginTop: 8 }}>Rode eindstatus / defectflow.</div></div>
      <div style={surfaceStyle()}><div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Gerepareerd</div><div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>{stats.gerepareerd}</div><div style={{ color: '#64748b', marginTop: 8 }}>Herstelde lassen en inspecties.</div></div>
    </div>
  );

  return (
    <ProjectTabShell
      projectId={String(projectId || '')}
      currentTab="lascontrole"
      onBack={() => navigate('/projecten')}
      onCreateProject={() => navigate('/projecten', { state: { intent: 'create-project' } })}
      onEditProject={() => navigate('/projecten')}
      onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies`)}
      onCreateWeld={() => navigate(`/projecten/${projectId}/lassen`)}
      filters={filters}
      kpis={kpis}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ ...surfaceStyle(), display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Dubbelklik opent “Las wijzigen”</div>
          <span style={buttonStyle()}>{stats.conform} conform</span>
          <span style={buttonStyle()}>{stats.defect} defect</span>
          <span style={buttonStyle()}>{stats.gerepareerd} gerepareerd</span>
          <button type="button" style={buttonStyle()} onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Alles akkoord</button>
          <button type="button" style={buttonStyle(true)} onClick={() => navigate(`/projecten/${projectId}/lassen`)}>+ Nieuwe las</button>
        </div>

        {welds.map((weld) => (
          <div key={String(weld.id)} style={surfaceStyle()} onDoubleClick={() => setSelectedWeld(weld)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr auto auto auto auto auto', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>{weld.weld_number || weld.weld_no || `Las ${weld.id}`}</strong>
                <div style={{ marginTop: 8, color: '#64748b' }}>
                  {String(weld.location || 'Locatie onbekend')} · {String(weld.welder_name || 'Geen lasser')}
                </div>
              </div>
              <span style={buttonStyle()}>{toStatusLabel(normalizeStatus(weld.status))}</span>
              <button type="button" style={buttonStyle()} onClick={() => setSelectedWeld(weld)}>Wijzigen</button>
              <button type="button" style={buttonStyle()} onClick={() => setSelectedWeld(weld)}>Inspectie</button>
              <button type="button" style={buttonStyle()} onClick={() => void applyStatus(weld, 'conform')}>Conform</button>
              <button type="button" style={buttonStyle()} onClick={() => void applyStatus(weld, 'defect')}>Defect</button>
            </div>
          </div>
        ))}

        {selectedWeld ? (
          <div style={surfaceStyle()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Las wijzigen</h3>
              <button type="button" style={buttonStyle()} onClick={() => setSelectedWeld(null)}>Sluiten</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
              <div style={surfaceStyle()}><div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Las</div><div style={{ marginTop: 8, fontWeight: 700 }}>{selectedWeld.weld_number || selectedWeld.weld_no || selectedWeld.id}</div></div>
              <div style={surfaceStyle()}><div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Executieklasse</div><div style={{ marginTop: 8, fontWeight: 700 }}>{String(selectedWeld.execution_class || 'Van project')}</div></div>
              <div style={surfaceStyle()}><div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Template</div><div style={{ marginTop: 8, fontWeight: 700 }}>{String(inspection?.template_id || 'Automatisch')}</div></div>
              <div style={surfaceStyle()}><div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Status</div><div style={{ marginTop: 8, fontWeight: 700 }}>{toStatusLabel(normalizeStatus(inspection?.status || selectedWeld.status))}</div></div>
            </div>

            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {(inspection?.checks?.length ? inspection.checks : [
                { group_key: 'algemeen', criterion_key: 'VISUAL_BASE', status: 'conform' },
                { group_key: 'maatvoering', criterion_key: 'DIMENSION_CHECK', status: 'conform' },
              ]).map((check, index) => (
                <div key={`${check.criterion_key || index}`} style={{ ...surfaceStyle(), display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'center' }}>
                  <div>
                    <strong>{String(check.criterion_key || `Check ${index + 1}`)}</strong>
                    <div style={{ marginTop: 8, color: '#64748b' }}>{String(check.group_key || 'algemeen')}</div>
                  </div>
                  <span style={buttonStyle()}>{toStatusLabel(normalizeStatus(check.status))}</span>
                  <button type="button" style={buttonStyle()} onClick={() => void applyStatus(selectedWeld, 'conform')}>Conform</button>
                  <button type="button" style={buttonStyle()} onClick={() => void applyStatus(selectedWeld, 'defect')}>Defect</button>
                </div>
              ))}
            </div>

            {saveInspection.isError ? (
              <div style={{ marginTop: 16, color: '#dc2626' }}>
                Inspectie opslaan mislukt: {saveInspection.error instanceof Error ? saveInspection.error.message : 'Onbekende fout'}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </ProjectTabShell>
  );
}

export default LascontrolePage;
