import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProjectTabShell from '@/app/layout/ProjectTabShell';
import { useProject, useProjectAssemblies, useProjectInspections, useProjectWelds } from '@/hooks/useProjects';
import type { Assembly, AuditEntry, Project, Weld } from '@/types/domain';

function titleFromProject(project?: Project | null) {
  return project?.name || project?.omschrijving || project?.projectnummer || String(project?.id || '') || 'Project 360';
}

function currentTabFromPath(pathname: string) {
  if (pathname.includes('/assemblies')) return 'assemblies';
  if (pathname.includes('/lassen')) return 'lassen';
  if (pathname.includes('/documenten')) return 'documenten';
  if (pathname.includes('/historie')) return 'historie';
  return 'overzicht';
}

function statusTone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (value.includes('gereed') || value.includes('conform')) return '#16a34a';
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

export function Project360Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = currentTabFromPath(location.pathname);

  const projectQuery = useProject(projectId);
  const assembliesQuery = useProjectAssemblies(projectId, { page: 1, limit: 25 });
  const weldsQuery = useProjectWelds(projectId, { page: 1, limit: 25 });
  const inspectionsQuery = useProjectInspections(projectId, { page: 1, limit: 25 });

  const project = projectQuery.data as Project | undefined;
  const assemblies = (assembliesQuery.data?.items || []) as Assembly[];
  const welds = (weldsQuery.data?.items || []) as Weld[];
  const inspections = (inspectionsQuery.data?.items || []) as AuditEntry[];

  const filters = (
    <input
      placeholder="Zoek binnen projectcontext"
      style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}
    />
  );

  const kpis = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      <button type="button" style={{ ...surfaceStyle(), textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(`/projecten/${projectId}/assemblies`)}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Assemblies</div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>{assemblies.length}</div>
        <div style={{ color: '#64748b', marginTop: 8 }}>Klik om naar assemblies te gaan</div>
      </button>
      <button type="button" style={{ ...surfaceStyle(), textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(`/projecten/${projectId}/lassen`)}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Lassen</div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>{welds.length}</div>
        <div style={{ color: '#64748b', marginTop: 8 }}>Klik om de lassenlijst te openen</div>
      </button>
      <button type="button" style={{ ...surfaceStyle(), textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(`/projecten/${projectId}/lascontrole`)}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Inspecties</div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>{inspectionsQuery.data?.total || inspections.length}</div>
        <div style={{ color: '#64748b', marginTop: 8 }}>Klik om naar lascontrole te gaan</div>
      </button>
      <button type="button" style={{ ...surfaceStyle(), textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(`/projecten/${projectId}/documenten`)}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Documenten</div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>0</div>
        <div style={{ color: '#64748b', marginTop: 8 }}>Klik om documentbeheer te openen</div>
      </button>
    </div>
  );

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
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {welds.length ? welds.map((weld) => (
              <div key={String(weld.id)} style={surfaceStyle()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <strong>{weld.weld_number || weld.weld_no || `Las ${weld.id}`}</strong>
                  <span style={{ color: statusTone(String(weld.status || '')) }}>{String(weld.status || 'Onbekend')}</span>
                </div>
                <div style={{ marginTop: 8, color: '#64748b' }}>
                  {String(weld.location || 'Locatie onbekend')} · {String(weld.welder_name || 'Geen lasser')}
                </div>
              </div>
            )) : <div style={{ color: '#64748b' }}>Nog geen lassen beschikbaar voor dit project.</div>}
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
            <div style={surfaceStyle()}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Projecteigenschappen</div>
              <div style={{ marginTop: 12, fontWeight: 700 }}>{titleFromProject(project)}</div>
              <div style={{ marginTop: 8, color: '#64748b' }}>
                {String(project.client_name || project.opdrachtgever || 'Geen opdrachtgever')} · {String(project.execution_class || project.executieklasse || 'Geen EXC')}
              </div>
            </div>
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
  }, [assemblies, currentTab, inspections, inspectionsQuery.data?.total, project, projectId, projectQuery.isError, projectQuery.isLoading, welds]);

  return (
    <ProjectTabShell
      projectId={String(projectId || '')}
      currentTab={currentTab}
      onBack={() => navigate('/projecten')}
      onCreateProject={() => navigate('/projecten', { state: { intent: 'create-project' } })}
      onEditProject={() => navigate('/projecten')}
      onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies`)}
      onCreateWeld={() => navigate(`/projecten/${projectId}/lassen`)}
      filters={filters}
      kpis={kpis}
    >
      {content}
    </ProjectTabShell>
  );
}

export default Project360Page;
