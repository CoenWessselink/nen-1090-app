import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, FileText, Plus, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { useProject, useProjectInspections, useProjectWelds } from '@/hooks/useProjects';
import { useAssemblies } from '@/hooks/useAssemblies';
import { useProjectDocuments } from '@/hooks/useDocuments';
import { useProjectAudit } from '@/hooks/useProjectAudit';
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTabShell } from '@/features/projecten/components/ProjectTabShell';
import { ProjectContextHeader } from '@/features/projecten/components/ProjectContextHeader';
import { formatDate } from '@/utils/format';

type AuditItem = {
  id: string | number;
  title?: string;
  action?: string;
  entity?: string;
  status?: string;
  created_at?: string;
};

function textOf(value: unknown, fallback = '—') {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

export function Project360Page() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();
  const currentTab = resolveProjectContextTab(location.pathname);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const projectQuery = useProject(projectId);
  const assembliesQuery = useAssemblies(projectId, { search: search || undefined });
  const weldsQuery = useProjectWelds(projectId, { search: search || undefined });
  const inspectionsQuery = useProjectInspections(projectId, { search: search || undefined });
  const documentsQuery = useProjectDocuments(projectId, { search: search || undefined });
  const auditQuery = useProjectAudit(projectId);

  const project = projectQuery.data;
  const assemblies = useMemo(() => assembliesQuery.data?.items || [], [assembliesQuery.data]);
  const welds = useMemo(() => weldsQuery.data?.items || [], [weldsQuery.data]);
  const inspections = useMemo(() => inspectionsQuery.data?.items || [], [inspectionsQuery.data]);
  const documents = useMemo(() => documentsQuery.data?.items || [], [documentsQuery.data]);
  const auditItems = useMemo<AuditItem[]>(() => (auditQuery.data?.items || []) as AuditItem[], [auditQuery.data]);

  const filteredAssemblies = useMemo(() => assemblies.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase())), [assemblies, search]);
  const filteredWelds = useMemo(() => welds.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase())), [welds, search]);
  const filteredDocuments = useMemo(() => documents.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase())), [documents, search]);
  const filteredAudit = useMemo<AuditItem[]>(() => auditItems.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase())), [auditItems, search]);

  if (!projectId) return <ErrorState title="Geen projectcontext" description="Open eerst een project vanuit Projecten." />;
  if (projectQuery.isLoading) return <LoadingState label="Project laden..." />;
  if (projectQuery.isError || !project) return <ErrorState title="Project niet geladen" description="De projectcontext kon niet worden opgehaald." />;

  return (
    <div className="page-stack">
      <PageHeader
        title={textOf(project.name || project.omschrijving || project.projectnummer, 'Project 360')}
        description="Projectoverzicht met assemblies, lassen, documenten, historie en doorstroom naar Lascontrole en CE Dossier."
      >
        <Button variant="secondary" onClick={() => navigate('/projecten')}>Terug naar projecten</Button>
      </PageHeader>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      <ProjectContextHeader projectId={projectId} title="Projecteigenschappen" />

      <ProjectTabShell
        projectId={projectId}
        currentTab={currentTab}
        onCreateProject={() => navigate('/projecten?intent=create-project')}
        onCreateAssembly={() => setMessage('Nieuwe assembly starten vanuit Project 360.')}
        onCreateWeld={() => navigate(`/projecten/${projectId}/lascontrole`)}
        filters={<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek binnen projectcontext" />}
        kpis={
          <>
            <Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Assemblies</div><div className="stat-value">{assemblies.length}</div></div></Card>
            <Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Lassen</div><div className="stat-value">{welds.length}</div></div></Card>
            <Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Inspecties</div><div className="stat-value">{inspections.length}</div></div></Card>
            <Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Documenten</div><div className="stat-value">{documents.length}</div></div></Card>
          </>
        }
      >
        {currentTab === 'overzicht' ? (
          <div className="content-grid-2">
            <Card>
              <div className="section-title-row"><h3>Snelle acties</h3></div>
              <div className="list-stack compact-list">
                <button className="list-row list-row-button" type="button" onClick={() => navigate(`/projecten/${projectId}/assemblies`)}>
                  <div><strong>Assemblies openen</strong><div className="list-subtle">Bekijk en beheer projectassemblies.</div></div><Plus size={16} />
                </button>
                <button className="list-row list-row-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lascontrole`)}>
                  <div><strong>Lascontrole openen</strong><div className="list-subtle">Werk inspecties, defecten en status bij.</div></div><ClipboardCheck size={16} />
                </button>
                <button className="list-row list-row-button" type="button" onClick={() => navigate(`/projecten/${projectId}/ce-dossier`)}>
                  <div><strong>CE Dossier openen</strong><div className="list-subtle">Bekijk gereedheid en ontbrekende onderdelen.</div></div><ShieldCheck size={16} />
                </button>
                <button className="list-row list-row-button" type="button" onClick={() => navigate(`/projecten/${projectId}/documenten`)}>
                  <div><strong>Documenten openen</strong><div className="list-subtle">Upload en beheer projectdocumenten.</div></div><FileText size={16} />
                </button>
              </div>
            </Card>

            <Card>
              <div className="section-title-row"><h3>Projectstatus</h3></div>
              <div className="detail-grid">
                <div><span>Status</span><strong>{textOf(project.status, 'Concept')}</strong></div>
                <div><span>Opdrachtgever</span><strong>{textOf(project.client_name || project.opdrachtgever)}</strong></div>
                <div><span>Executieklasse</span><strong>{textOf(project.execution_class || project.executieklasse)}</strong></div>
                <div><span>Periode</span><strong>{formatDate(project.start_date)} — {formatDate(project.end_date)}</strong></div>
              </div>
            </Card>
          </div>
        ) : null}

        {currentTab === 'historie' ? (
          <Card>
            <div className="section-title-row"><h3>Historie</h3></div>
            {auditQuery.isLoading ? <LoadingState label="Historie laden..." /> : null}
            {auditQuery.isError ? <ErrorState title="Historie niet geladen" description="De audittrail kon niet worden opgehaald." /> : null}
            {!auditQuery.isLoading && !auditQuery.isError ? (
              filteredAudit.length ? (
                <div className="list-stack compact-list">
                  {filteredAudit.map((item: AuditItem) => (
                    <div key={String(item.id)} className="list-row">
                      <div>
                        <strong>{textOf(item.title || item.action, `Auditregel ${item.id}`)}</strong>
                        <div className="list-subtle">{textOf(item.entity)} · {textOf(item.status)} · {formatDate(item.created_at)}</div>
                      </div>
                      <span className="badge badge-neutral">{textOf(item.status, 'Open')}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen historie" description="Projecthistorie verschijnt hier zodra er mutaties zijn." />
            ) : null}
          </Card>
        ) : null}

        {currentTab !== 'overzicht' && currentTab !== 'historie' ? (
          <Card>
            <div className="section-title-row"><h3>{currentTab}</h3></div>
            <div className="list-subtle">Deze tab blijft actief binnen de projectcontext. De typecheck-fix is hier nu toegepast.</div>
          </Card>
        ) : null}
      </ProjectTabShell>
    </div>
  );
}

export default Project360Page;
