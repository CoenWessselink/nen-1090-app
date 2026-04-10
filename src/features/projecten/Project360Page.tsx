import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProjectTabShell from '@/app/layout/ProjectTabShell';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import { ProjectContextHeader } from '@/features/projecten/components/ProjectContextHeader';
import { WeldInspectionModal } from '@/features/lascontrole/components/WeldInspectionModal';
import { useUpsertWeldInspection, useWeldInspection } from '@/hooks/useInspections';
import { useProject, useProjectAssemblies, useProjectInspections, useProjectWelds } from '@/hooks/useProjects';
import { usePatchWeldStatus, useUpdateWeld } from '@/hooks/useWelds';
import { useInspectionTemplates, useWelders, useWps } from '@/hooks/useSettings';
import type { Assembly, AuditEntry, Inspection, Project, Weld, WeldStatus } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

function titleFromProject(project?: Project | null) {
  return project?.name || project?.omschrijving || project?.projectnummer || String(project?.id || '') || 'Project 360';
}

function currentTabFromPath(pathname: string) {
  if (pathname.includes('/assemblies')) return 'assemblies';
  if (pathname.includes('/lassen')) return 'lassen';
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

function surfaceStyle(): React.CSSProperties {
  return {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
  };
}

function statusLabel(status: WeldStatus) {
  if (status === 'defect') return 'Defect';
  if (status === 'gerepareerd') return 'Gerepareerd';
  return 'Conform';
}

function actionButtonStyle(kind: 'default' | 'blue' | 'conform' | 'defect' | 'gerepareerd' = 'default', active = false): React.CSSProperties {
  const palette = {
    default: { border: '#cbd5e1', bg: '#fff', color: '#0f172a' },
    blue: { border: '#93c5fd', bg: '#dbeafe', color: '#1d4ed8' },
    conform: { border: active ? '#16a34a' : '#cbd5e1', bg: active ? '#dcfce7' : '#fff', color: active ? '#166534' : '#0f172a' },
    defect: { border: active ? '#ef4444' : '#cbd5e1', bg: active ? '#fee2e2' : '#fff', color: active ? '#991b1b' : '#0f172a' },
    gerepareerd: { border: active ? '#16a34a' : '#cbd5e1', bg: active ? '#dcfce7' : '#fff', color: active ? '#166534' : '#0f172a' },
  }[kind];

  return {
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.color,
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
  const [search, setSearch] = useState('');

  const projectQuery = useProject(projectId);
  const assembliesQuery = useProjectAssemblies(projectId, { page: 1, limit: 25 });
  const weldsQuery = useProjectWelds(projectId, { page: 1, limit: 200 });
  const inspectionsQuery = useProjectInspections(projectId, { page: 1, limit: 200 });
  const selectedInspectionQuery = useWeldInspection(projectId, selectedWeld?.id);
  const saveInspection = useUpsertWeldInspection(String(projectId || ''), String(selectedWeld?.id || ''));
  const updateWeld = useUpdateWeld(String(projectId || ''));
  const patchWeldStatus = usePatchWeldStatus(String(projectId || ''));
  const wpsQuery = useWps();
  const weldersQuery = useWelders();
  const templatesQuery = useInspectionTemplates();

  const project = projectQuery.data as Project | undefined;
  const assemblies = (assembliesQuery.data?.items || []) as Assembly[];
  const welds = (weldsQuery.data?.items || []) as Weld[];
  const inspections = (inspectionsQuery.data?.items || []) as AuditEntry[];
  const selectedInspection = selectedInspectionQuery.data as Inspection | null;

  const searchText = search.trim().toLowerCase();
  const visibleAssemblies = useMemo(() => assemblies.filter((a) => JSON.stringify(a).toLowerCase().includes(searchText)), [assemblies, searchText]);
  const visibleWelds = useMemo(() => welds.filter((w) => JSON.stringify(w).toLowerCase().includes(searchText)), [welds, searchText]);
  const visibleHistory = useMemo(() => inspections.filter((i) => JSON.stringify(i).toLowerCase().includes(searchText)), [inspections, searchText]);

  const filters = (
    <input
      placeholder="Zoek op projectnaam, projectnummer, opdrachtgever, assembly of las"
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}
    />
  );

  const assemblyOptions = assemblies.map((assembly) => ({ value: String(assembly.id), label: String(assembly.code || assembly.name || assembly.id) }));
  const wpsOptions = (wpsQuery.data?.items || []).map((item) => ({ value: String(item.id || item.code || ''), label: String(item.code || item.title || item.id || '') }));
  const welderOptions = (weldersQuery.data?.items || []).map((item) => ({ value: String(item.id || item.code || ''), label: String(item.name || item.code || item.id || '') }));
  const templateOptions = (templatesQuery.data?.items || []).map((item) => ({ value: String(item.id || item.code || ''), label: String(item.name || item.code || item.id || '') }));

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
      meta="Klik om lassen en lascontrole te openen"
      onClick={() => navigate(`/projecten/${projectId}/lassen`)}
      testId="project-kpi-welds"
    />,
    <ProjectKpiActionCard
      key="documenten"
      label="Documenten"
      value={0}
      meta="Klik om documentbeheer te openen"
      onClick={() => navigate(`/projecten/${projectId}/documenten`)}
      testId="project-kpi-documents"
    />,
    <ProjectKpiActionCard
      key="historie"
      label="Historie"
      value={inspections.length}
      meta="Klik om projecthistorie te openen"
      onClick={() => navigate(`/projecten/${projectId}/historie`)}
      testId="project-kpi-history"
    />,
  ];

  const content = useMemo(() => {
    if (projectQuery.isLoading) return <div>Project laden...</div>;
    if (!projectId || projectQuery.isError || !project) {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Project 360</h3>
          <p style={{ marginTop: 16, color: '#64748b' }}>Het projectdetail kon niet worden geladen vanuit de backend.</p>
        </section>
      );
    }

    if (currentTab === 'assemblies') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Assemblies</h3>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {visibleAssemblies.length ? visibleAssemblies.map((assembly) => (
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
          <div style={{ marginTop: 8, color: '#64748b' }}>Lascontrole is geïntegreerd in Lassen. Dubbelklik of gebruik Wijzigen om de popup te openen.</div>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {visibleWelds.length ? visibleWelds.map((weld) => {
              const weldStatus = normalizeStatus(weld.status);
              return (
                <div key={String(weld.id)} style={surfaceStyle()} onDoubleClick={() => setSelectedWeld(weld)}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.4fr) repeat(4, auto)', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{weld.weld_number || weld.weld_no || `Las ${weld.id}`}</strong>
                      <div style={{ marginTop: 8, color: '#64748b' }}>
                        {String(weld.location || 'Locatie onbekend')} · {String(weld.welder_name || 'Geen lasser')} · {String(weld.execution_class || 'Geen EXC')}
                      </div>
                    </div>
                    <button type="button" style={actionButtonStyle('blue')} onClick={() => setSelectedWeld(weld)}>Wijzigen</button>
                    <button type="button" style={actionButtonStyle('conform', weldStatus === 'conform')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'conform' })}>Conform</button>
                    <button type="button" style={actionButtonStyle('defect', weldStatus === 'defect')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'defect' })}>Defect</button>
                    <button type="button" style={actionButtonStyle('gerepareerd', weldStatus === 'gerepareerd')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'gerepareerd' })}>Gerepareerd</button>
                  </div>
                  <div style={{ marginTop: 12, color: '#64748b' }}>Huidige status: {statusLabel(weldStatus)}</div>
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
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <div style={surfaceStyle()}>
              <strong>WPS document</strong>
              <div style={{ marginTop: 8, color: '#64748b' }}>WPS-documenten moeten toegevoegd kunnen worden vanuit masterdata en projectcontext.</div>
              <button type="button" style={{ ...actionButtonStyle('blue'), marginTop: 12 }}>Document toevoegen</button>
            </div>
            <div style={surfaceStyle()}>
              <strong>Materiaaldocumenten</strong>
              <div style={{ marginTop: 8, color: '#64748b' }}>Materialen moeten ook documenten kunnen bevatten, zoals certificaten en productsheets.</div>
              <button type="button" style={{ ...actionButtonStyle('blue'), marginTop: 12 }}>Materiaaldocument toevoegen</button>
            </div>
          </div>
        </section>
      );
    }

    if (currentTab === 'historie') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Historie</h3>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {visibleHistory.length ? visibleHistory.map((entry) => (
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
          <p style={{ marginTop: 8, color: '#64748b' }}>Project 360 gebruikt op alle tabs dezelfde routingshell, projectkop, klikbare KPI’s en vaste hoofdacties.</p>
        </section>
      </div>
    );
  }, [projectQuery.isLoading, projectId, projectQuery.isError, project, currentTab, visibleAssemblies, visibleWelds, visibleHistory, navigate, patchWeldStatus, assemblies.length, welds.length, inspections.length]);

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
        <ProjectContextHeader projectId={String(projectId || '')} />
        {content}
      </ProjectTabShell>

      <WeldInspectionModal
        open={Boolean(selectedWeld)}
        weld={selectedWeld}
        inspection={selectedInspection}
        savingWeld={updateWeld.isPending}
        savingInspection={saveInspection.isPending}
        assemblyOptions={assemblyOptions}
        wpsOptions={wpsOptions}
        welderOptions={welderOptions}
        templateOptions={templateOptions}
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
          setSelectedWeld(null);
        }}
      />
    </>
  );
}

export default Project360Page;
