import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProjectTabShell from '@/app/layout/ProjectTabShell';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import { useProjectWelds } from '@/hooks/useProjects';
import { useUpsertWeldInspection, useWeldInspection } from '@/hooks/useInspections';
import { usePatchWeldStatus, useUpdateWeld } from '@/hooks/useWelds';
import { WeldInspectionModal } from '@/features/lascontrole/components/WeldInspectionModal';
import type { Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

type LegacyWeldStatus = 'conform' | 'defect' | 'gerepareerd';

function normalizeStatus(value: unknown): LegacyWeldStatus {
  const raw = String(value || '').toLowerCase();
  if (raw === 'gerepareerd') return 'gerepareerd';
  if (raw === 'defect') return 'defect';
  return 'conform';
}

function toStatusLabel(status: LegacyWeldStatus) {
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

function buttonStyle(activeStatus?: LegacyWeldStatus, status?: LegacyWeldStatus): React.CSSProperties {
  const isActive = activeStatus === status;
  const isDefect = status === 'defect';
  return {
    borderRadius: 12,
    border: `1px solid ${isActive ? (isDefect ? '#ef4444' : '#16a34a') : '#cbd5e1'}`,
    background: isActive ? (isDefect ? '#fee2e2' : '#dcfce7') : '#ffffff',
    color: isActive ? (isDefect ? '#991b1b' : '#166534') : '#0f172a',
    fontWeight: 600,
    padding: '10px 14px',
    cursor: 'pointer',
  };
}

export function LascontrolePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const statusFilter = new URLSearchParams(location.search).get('status');
  const weldsQuery = useProjectWelds(projectId, { page: 1, limit: 200 });
  const welds = (weldsQuery.data?.items || []) as Weld[];

  const [selectedWeld, setSelectedWeld] = useState<Weld | null>(null);
  const inspectionQuery = useWeldInspection(projectId, selectedWeld?.id);
  const saveInspection = useUpsertWeldInspection(String(projectId || ''), String(selectedWeld?.id || ''));
  const updateWeld = useUpdateWeld(String(projectId || ''));
  const patchWeldStatus = usePatchWeldStatus(String(projectId || ''));
  const inspection = inspectionQuery.data as Inspection | null;

  const visibleWelds = useMemo(() => {
    const normalizedFilter = normalizeStatus(statusFilter || 'conform');
    if (!statusFilter) return welds;
    return welds.filter((item) => normalizeStatus(item.status) === normalizedFilter);
  }, [statusFilter, welds]);

  const stats = useMemo(() => {
    const total = welds.length;
    const conform = welds.filter((item) => normalizeStatus(item.status) === 'conform').length;
    const defect = welds.filter((item) => normalizeStatus(item.status) === 'defect').length;
    const gerepareerd = welds.filter((item) => normalizeStatus(item.status) === 'gerepareerd').length;
    return { total, conform, defect, gerepareerd };
  }, [welds]);

  async function applyStatus(weld: Weld, status: LegacyWeldStatus) {
    setSelectedWeld(weld);
    await patchWeldStatus.mutateAsync({ weldId: weld.id, status });

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
      template_id: inspection?.template_id ? String(inspection.template_id) : undefined,
      remarks: typeof inspection?.remarks === 'string' ? inspection.remarks : '',
      checks,
    });

    await weldsQuery.refetch();
    await inspectionQuery.refetch();
  }

  const filters = (
    <div style={{ display: 'grid', gap: 12 }}>
      <input
        placeholder="Zoek op las, locatie, lasser of status"
        style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}
      />
      {statusFilter ? <div style={{ color: '#64748b' }}>Actief statusfilter: <strong>{toStatusLabel(normalizeStatus(statusFilter))}</strong></div> : null}
    </div>
  );

  const kpis = [
    <ProjectKpiActionCard
      key="welds"
      label="Lassen"
      value={stats.total}
      meta="Klik om de lassenlijst te openen"
      onClick={() => navigate(`/projecten/${projectId}/lassen`)}
      testId="lascontrole-kpi-welds"
    />,
    <ProjectKpiActionCard
      key="conform"
      label="Conform"
      value={stats.conform}
      meta="Klik om conforme lassen in de lascontrole te bekijken"
      onClick={() => navigate(`/projecten/${projectId}/lascontrole?status=conform`)}
      testId="lascontrole-kpi-conform"
    />,
    <ProjectKpiActionCard
      key="defect"
      label="Defecten"
      value={stats.defect}
      meta="Klik om defecten in de lascontrole te bekijken"
      onClick={() => navigate(`/projecten/${projectId}/lascontrole?status=defect`)}
      testId="lascontrole-kpi-defect"
    />,
    <ProjectKpiActionCard
      key="gerepareerd"
      label="Gerepareerd"
      value={stats.gerepareerd}
      meta="Klik om gerepareerde lassen in de lascontrole te bekijken"
      onClick={() => navigate(`/projecten/${projectId}/lascontrole?status=gerepareerd`)}
      testId="lascontrole-kpi-gerepareerd"
    />,
  ];

  return (
    <>
      <ProjectTabShell
        projectId={String(projectId || '')}
        currentTab="lascontrole"
        onBack={() => navigate('/projecten')}
        onCreateProject={() => navigate('/projecten', { state: { intent: 'create-project' } })}
        onEditProject={() => navigate('/projecten', { state: { intent: 'edit-project', projectId } })}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies`)}
        onCreateWeld={() => navigate(`/projecten/${projectId}/lassen`)}
        exportSelectionLabel="PDF export bij selectie"
        exportSelectionDisabled
        filters={filters}
        kpis={kpis}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ ...surfaceStyle(), display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Dubbelklik opent “Las wijzigen”</div>
            <span style={buttonStyle('conform', 'conform')}>{stats.conform} conform</span>
            <span style={buttonStyle('defect', 'defect')}>{stats.defect} defect</span>
            <span style={buttonStyle('gerepareerd', 'gerepareerd')}>{stats.gerepareerd} gerepareerd</span>
          </div>

          {visibleWelds.map((weld) => {
            const weldStatus = normalizeStatus(weld.status);
            return (
              <div key={String(weld.id)} style={surfaceStyle()} onDoubleClick={() => setSelectedWeld(weld)}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.5fr) repeat(5, auto)', gap: 12, alignItems: 'center' }}>
                  <div>
                    <strong>{weld.weld_number || weld.weld_no || `Las ${weld.id}`}</strong>
                    <div style={{ marginTop: 8, color: '#64748b' }}>
                      {String(weld.location || 'Locatie onbekend')} · {String(weld.welder_name || 'Geen lasser')} · {String(weld.execution_class || 'Geen EXC')}
                    </div>
                  </div>
                  <span style={buttonStyle(weldStatus, weldStatus)}>{toStatusLabel(weldStatus)}</span>
                  <button type="button" style={buttonStyle()} onClick={() => setSelectedWeld(weld)}>Wijzigen</button>
                  <button type="button" style={buttonStyle()} onClick={() => setSelectedWeld(weld)}>Inspectie</button>
                  <button type="button" style={buttonStyle(weldStatus, 'conform')} onClick={() => void applyStatus(weld, 'conform')}>Conform</button>
                  <button type="button" style={buttonStyle(weldStatus, 'defect')} onClick={() => void applyStatus(weld, 'defect')}>Defect</button>
                  <button type="button" style={buttonStyle(weldStatus, 'gerepareerd')} onClick={() => void applyStatus(weld, 'gerepareerd')}>Gerepareerd</button>
                </div>
              </div>
            );
          })}

          {!visibleWelds.length ? <div style={surfaceStyle()}>Geen lassen gevonden voor dit filter.</div> : null}
        </div>
      </ProjectTabShell>

      <WeldInspectionModal
        open={Boolean(selectedWeld)}
        weld={selectedWeld}
        inspection={inspection}
        savingWeld={updateWeld.isPending}
        savingInspection={saveInspection.isPending}
        onClose={() => setSelectedWeld(null)}
        onQuickStatus={async (status) => {
          if (!selectedWeld) return;
          await patchWeldStatus.mutateAsync({ weldId: selectedWeld.id, status });
        }}
        onSaveWeld={async (payload: WeldFormValues) => {
          if (!selectedWeld) return;
          await updateWeld.mutateAsync({ weldId: selectedWeld.id, payload });
          await weldsQuery.refetch();
        }}
        onSaveInspection={async (payload) => {
          if (!selectedWeld) return;
          await saveInspection.mutateAsync(payload);
          await weldsQuery.refetch();
          await inspectionQuery.refetch();
        }}
      />
    </>
  );
}

export default LascontrolePage;
