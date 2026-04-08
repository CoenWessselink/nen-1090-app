import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProjectTabShell from '@/app/layout/ProjectTabShell';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import { WeldInspectionModal } from '@/features/lascontrole/components/WeldInspectionModal';
import { useUpsertWeldInspection, useWeldInspection } from '@/hooks/useInspections';
import { useProject, useProjectAssemblies, useProjectInspections, useProjectWelds } from '@/hooks/useProjects';
import { usePatchWeldStatus, useUpdateWeld } from '@/hooks/useWelds';
import type { Assembly, AuditEntry, Inspection, Project, Weld, WeldStatus } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

function titleFromProject(project?: Project | null) {
  return project?.name || project?.omschrijving || project?.projectnummer || String(project?.id || '') || 'Project 360';
}

function currentTabFromPath(pathname: string) {
  if (pathname.includes('/assemblies')) return 'assemblies';
  if (pathname.includes('/lassen')) return 'lassen';
  if (pathname.includes('/lascontrole')) return 'lascontrole';
  if (pathname.includes('/documenten')) return 'documenten';
  if (pathname.includes('/ce-dossier')) return 'ce-dossier';
  if (pathname.includes('/historie')) return 'historie';
  return 'overzicht';
}

function normalizeStatus(value: unknown): WeldStatus {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'gerepareerd') return 'gerepareerd';
  if (raw === 'defect') return 'defect';
  return 'conform';
}

function statusTone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (value.includes('gereed') || value.includes('conform') || value.includes('gerepareerd')) return '#16a34a';
  if (value.includes('defect') || value.includes('afgekeurd')) return '#dc2626';
  return '#d97706';
}

function surfaceStyle(): React.CSSProperties {
  return {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
  };
}

function actionButtonStyle(active = false, status?: WeldStatus): React.CSSProperties {
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

export function Project360Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = currentTabFromPath(location.pathname);
  const [selectedWeld, setSelectedWeld] = useState<Weld | null>(null);

  const projectQuery = useProject(projectId);
  const assembliesQuery = useProjectAssemblies(projectId, { page: 1, limit: 25 });
  const weldsQuery = useProjectWelds(projectId, { page: 1, limit: 200 });
  const inspectionsQuery = useProjectInspections(projectId, { page: 1, limit: 25 });
  const selectedInspectionQuery = useWeldInspection(projectId, selectedWeld?.id);
  const saveInspection = useUpsertWeldInspection(String(projectId || ''), String(selectedWeld?.id || ''));
  const updateWeld = useUpdateWeld(String(projectId || ''));
  const patchWeldStatus = usePatchWeldStatus(String(projectId || ''));

  const project = projectQuery.data as Project | undefined;
  const assemblies = (assembliesQuery.data?.items || []) as Assembly[];
  const welds = (weldsQuery.data?.items || []) as Weld[];
  const inspections = (inspectionsQuery.data?.items || []) as AuditEntry[];
  const selectedInspection = selectedInspectionQuery.data as Inspection | null;

  const filters = (
    <input
      placeholder="Zoek binnen projectcontext"
      style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}
    />
  );

  const kpis = [
    <ProjectKpiActionCard
      key="assemblies"
      label="Assemblies"
      value={assemblies.length}
      meta="Klik om naar assemblies te gaan"
      onClick={() => navigate(`/projecten/${projectId}/assemblies`)}
      testId="project-kpi-assemblies"
    />,
    <ProjectKpiActionCard
      key="lassen"
      label="Lassen"
      value={welds.length}
      meta="Klik om de lassenlijst te openen"
      onClick={() => navigate(`/projecten/${projectId}/lassen`)}
      testId="project-kpi-welds"
    />,
    <ProjectKpiActionCard
      key="inspecties"
      label="Lascontrole"
      value={inspectionsQuery.data?.total || inspections.length}
      meta="Klik om naar lascontrole te gaan"
      onClick={() => navigate(`/projecten/${projectId}/lascontrole`)}
      testId="project-kpi-inspections"
    />,
    <ProjectKpiActionCard
      key="documenten"
      label="Documenten"
      value={0}
      meta="Klik om documentbeheer te openen"
      onClick={() => navigate(`/projecten/${projectId}/documenten`)}
      testId="project-kpi-documents"
    />,
  ];

  const content = useMemo(() => {
    if (projectQuery.isLoading) {
      return <div>Project laden...</div>;
    }

    if (!projectId || projectQuery.isError || !project) {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Project 360</h3>
          <p style={{ marginTop: 16, color: '#64748b' }}>
            Het projectdetail kon niet worden geladen vanuit de backend.
          </p>
        </section>
      );
    }

    if (currentTab === 'assemblies') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Assemblies</h3>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {assemblies.length ? assemblies.map((assembly) => (
              <div key={String(assembly.id)} style={surfaceStyle()}>
                <strong>{assembly.code || assembly.name || `Assembly ${assembly.id}`}</strong>
                <div style={{ marginTop: 8, color: '#64748b' }}>{String(assembly.status || 'Onbekend')}</div>
              </div>
            )) : <div style={{ color: '#64748b' }}>Nog geen assemblies beschikbaar voor dit project.</div>}
          </div>
        </section>
      );
    }

    if (currentTab === 'lassen') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Lassen</h3>
          <div style={{ marginTop: 8, color: '#64748b' }}>Dubbelklik op een las om de popup “Las wijzigen” te openen.</div>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {welds.length ? welds.map((weld) => {
              const weldStatus = normalizeStatus(weld.status);
              return (
                <div key={String(weld.id)} style={surfaceStyle()} onDoubleClick={() => setSelectedWeld(weld)}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.4fr) repeat(5, auto)', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{weld.weld_number || weld.weld_no || `Las ${weld.id}`}</strong>
                      <div style={{ marginTop: 8, color: '#64748b' }}>
                        {String(weld.location || 'Locatie onbekend')} · {String(weld.welder_name || 'Geen lasser')} · {String(weld.execution_class || 'Geen EXC')}
                      </div>
                    </div>
                    <span style={actionButtonStyle(true, weldStatus)}>{weldStatus === 'conform' ? 'Conform' : weldStatus === 'defect' ? 'Defect' : 'Gerepareerd'}</span>
                    <button type="button" style={actionButtonStyle()} onClick={() => setSelectedWeld(weld)}>Wijzigen</button>
                    <button type="button" style={actionButtonStyle(weldStatus === 'conform', 'conform')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'conform' })}>Conform</button>
                    <button type="button" style={actionButtonStyle(weldStatus === 'defect', 'defect')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'defect' })}>Defect</button>
                    <button type="button" style={actionButtonStyle(weldStatus === 'gerepareerd', 'gerepareerd')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'gerepareerd' })}>Gerepareerd</button>
                  </div>
                </div>
              );
            }) : <div style={{ color: '#64748b' }}>Nog geen lassen beschikbaar voor dit project.</div>}
          </div>
        </section>
      );
    }

    if (currentTab === 'documenten') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Documenten</h3>
          <div style={{ marginTop: 16, color: '#64748b' }}>
            Upload en download van projectdocumenten verloopt via de documenten-tab. Deze weergave is niet meer leeg en blijft binnen Project 360.
          </div>
        </section>
      );
    }

    if (currentTab === 'historie') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Historie</h3>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {inspections.length ? inspections.map((entry) => (
              <div key={String(entry.id)} style={surfaceStyle()}>
                <strong>{String(entry.action || entry.title || 'Historie-item')}</strong>
                <div style={{ marginTop: 8, color: '#64748b' }}>{String(entry.created_at || '')}</div>
              </div>
            )) : <div style={{ color: '#64748b' }}>Nog geen historie beschikbaar vanuit de backend.</div>}
          </div>
        </section>
      );
    }

    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <section style={surfaceStyle()}>
          <h2 style={{ margin: 0 }}>{titleFromProject(project)}</h2>
          <p style={{ marginTop: 8, color: '#64748b' }}>
            Project 360 gebruikt op alle tabs dezelfde routingshell, klikbare KPI’s en vaste hoofdacties.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => navigate('/projecten', { state: { intent: 'edit-project', projectId } })}
              style={{ ...surfaceStyle(), textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Projecteigenschappen</div>
              <div style={{ marginTop: 12, fontWeight: 700 }}>{titleFromProject(project)}</div>
              <div style={{ marginTop: 8, color: '#64748b' }}>
                {String(project.client_name || project.opdrachtgever || 'Geen opdrachtgever')} · {String(project.execution_class || project.executieklasse || 'Geen EXC')}
              </div>
            </button>
            <div style={surfaceStyle()}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Status</div>
              <div style={{ marginTop: 12, fontWeight: 700, color: statusTone(String(project.status || '')) }}>
                {String(project.status || 'Onbekend')}
              </div>
              <div style={{ marginTop: 8, color: '#64748b' }}>
                Start: {String(project.start_date || '—')} · Eind: {String(project.end_date || '—')}
              </div>
            </div>
          </div>
        </section>

        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Projectoverzicht</h3>
          <p style={{ marginTop: 8, color: '#64748b' }}>
            Dit scherm vervangt de lege stub en toont weer projectdata direct na dubbelklik vanuit de projectenlijst.
          </p>
        </section>
      </div>
    );
  }, [assemblies, currentTab, inspections, inspectionsQuery.data?.total, navigate, patchWeldStatus, project, projectId, projectQuery.isError, projectQuery.isLoading, welds]);

  return (
    <>
      <ProjectTabShell
        projectId={String(projectId || '')}
        currentTab={currentTab}
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
        {content}
      </ProjectTabShell>

      <WeldInspectionModal
        open={Boolean(selectedWeld)}
        weld={selectedWeld}
        inspection={selectedInspection}
        savingWeld={updateWeld.isPending}
        savingInspection={saveInspection.isPending}
        onClose={() => setSelectedWeld(null)}
        onQuickStatus={async (status) => {
          if (!selectedWeld) return;
          await patchWeldStatus.mutateAsync({ weldId: selectedWeld.id, status });
          await selectedInspectionQuery.refetch();
          await weldsQuery.refetch();
        }}
        onSaveWeld={async (payload: WeldFormValues) => {
          if (!selectedWeld) return;
          await updateWeld.mutateAsync({ weldId: selectedWeld.id, payload });
          await weldsQuery.refetch();
        }}
        onSaveInspection={async (payload) => {
          if (!selectedWeld) return;
          await saveInspection.mutateAsync(payload);
          await selectedInspectionQuery.refetch();
          await weldsQuery.refetch();
        }}
      />
    </>
  );
}

export default Project360Page;
