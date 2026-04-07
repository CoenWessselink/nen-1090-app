import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, FileText, History, Paperclip, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Modal } from '@/components/overlays/Modal';
import { useProject, useProjectInspections, useProjectWelds, useUpdateProject } from '@/hooks/useProjects';
import { useAssemblies } from '@/hooks/useAssemblies';
import { useProjectDocuments } from '@/hooks/useDocuments';
import { createProjectDocument } from '@/api/documents';
import { useProjectAudit } from '@/hooks/useProjectAudit';
import { resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTabShell } from '@/features/projecten/components/ProjectTabShell';
import { ProjectContextHeader } from '@/features/projecten/components/ProjectContextHeader';
import { ProjectForm } from '@/features/projecten/components/ProjectForm';
import { formatDate } from '@/utils/format';
import type { Project } from '@/types/domain';

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

function toneFromStatus(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['gereed', 'vrijgegeven', 'conform', 'approved'].includes(value)) return 'success' as const;
  if (['afgekeurd', 'geblokkeerd', 'niet conform', 'rejected'].includes(value)) return 'danger' as const;
  return 'warning' as const;
}

export function Project360Page() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = '' } = useParams<{ projectId?: string }>();
  const currentTab = resolveProjectContextTab(location.pathname);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const projectQuery = useProject(projectId);
  const assembliesQuery = useAssemblies(projectId, { search: search || undefined });
  const weldsQuery = useProjectWelds(projectId, { search: search || undefined });
  const inspectionsQuery = useProjectInspections(projectId, { search: search || undefined });
  const documentsQuery = useProjectDocuments(projectId, { search: search || undefined });
  const auditQuery = useProjectAudit(projectId);
  const updateProject = useUpdateProject();

  const project = projectQuery.data as Project | undefined;
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

  const handleProjectDocumentUpload = async (file: File) => {
    try {
      setDocumentUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('document_type', file.type || 'document');
      await createProjectDocument(projectId, formData);
      await documentsQuery.refetch();
      setMessage(`Document ${file.name} geüpload.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Document upload mislukt.');
    } finally {
      setDocumentUploading(false);
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={textOf(project.name || project.omschrijving || project.projectnummer, 'Project 360')}
        description="Dubbelklik in de projectlijst opent deze onderliggende projectgegevens. Hier open je Wijzig project via de knop of door te dubbelklikken op de projecteigenschappen."
      >
        <Button variant="secondary" onClick={() => navigate('/projecten')}>Terug naar projecten</Button>
        <Button onClick={() => setProjectModalOpen(true)}><Pencil size={16} /> Wijzig project</Button>
      </PageHeader>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <div onDoubleClick={() => setProjectModalOpen(true)}>
        <ProjectContextHeader projectId={projectId} title="Projecteigenschappen" />
      </div>

      <ProjectTabShell
        projectId={projectId}
        currentTab={currentTab}
        onCreateProject={() => navigate('/projecten?intent=create-project')}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies`)}
        onCreateWeld={() => navigate(`/projecten/${projectId}/lascontrole`)}
        filters={<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek binnen projectcontext" />}
        kpis={
          <>
            <button type="button" className="project-kpi-card-button" onClick={() => navigate(`/projecten/${projectId}/assemblies`)}><Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Assemblies</div><div className="stat-value">{assemblies.length}</div><div className="stat-meta">Klik om naar assemblies te gaan</div></div></Card></button>
            <button type="button" className="project-kpi-card-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}><Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Lassen</div><div className="stat-value">{welds.length}</div><div className="stat-meta">Klik om naar lassen te gaan</div></div></Card></button>
            <button type="button" className="project-kpi-card-button" onClick={() => navigate(`/projecten/${projectId}/lascontrole`)}><Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Inspecties</div><div className="stat-value">{inspections.length}</div><div className="stat-meta">Klik om naar lascontrole te gaan</div></div></Card></button>
            <button type="button" className="project-kpi-card-button" onClick={() => navigate(`/projecten/${projectId}/documenten`)}><Card className="project-kpi-card"><div className="stat-card"><div className="stat-label">Documenten</div><div className="stat-value">{documents.length}</div><div className="stat-meta">Klik om naar documenten te gaan</div></div></Card></button>
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

            <div onDoubleClick={() => setProjectModalOpen(true)}>
              <Card>
                <div className="section-title-row"><h3>Projectstatus</h3></div>
                <div className="detail-grid">
                  <div><span>Status</span><strong>{textOf(project.status, 'Concept')}</strong></div>
                  <div><span>Opdrachtgever</span><strong>{textOf(project.client_name || project.opdrachtgever)}</strong></div>
                  <div><span>Executieklasse</span><strong>{textOf(project.execution_class || project.executieklasse)}</strong></div>
                  <div><span>Periode</span><strong>{formatDate(project.start_date)} — {formatDate(project.end_date)}</strong></div>
                </div>
                <div className="list-subtle" style={{ marginTop: 12 }}>Dubbelklik op deze projectgegevens om het wijzigscherm te openen.</div>
              </Card>
            </div>
          </div>
        ) : null}

        {currentTab === 'assemblies' ? (
          <Card>
            <div className="section-title-row"><h3>Assemblies</h3></div>
            {assembliesQuery.isLoading ? <LoadingState label="Assemblies laden..." /> : null}
            {assembliesQuery.isError ? <ErrorState title="Assemblies niet geladen" description="De assemblies konden niet worden opgehaald." /> : null}
            {!assembliesQuery.isLoading && !assembliesQuery.isError ? (
              filteredAssemblies.length ? (
                <div className="list-stack compact-list">
                  {filteredAssemblies.map((assembly) => (
                    <div key={String((assembly as { id?: string | number }).id)} className="list-row">
                      <div>
                        <strong>{textOf((assembly as { code?: unknown; name?: unknown }).code || (assembly as { name?: unknown }).name, `Assembly ${(assembly as { id?: string | number }).id}`)}</strong>
                        <div className="list-subtle">{textOf((assembly as { name?: unknown }).name)} · {textOf((assembly as { status?: unknown }).status)}</div>
                      </div>
                      <Badge tone={toneFromStatus(String((assembly as { status?: unknown }).status || 'concept'))}>{textOf((assembly as { status?: unknown }).status, 'Concept')}</Badge>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen assemblies" description="Voeg assemblies toe om de projectstructuur op te bouwen." />
            ) : null}
          </Card>
        ) : null}

        {currentTab === 'lassen' ? (
          <Card>
            <div className="section-title-row"><h3>Lassen</h3></div>
            {weldsQuery.isLoading ? <LoadingState label="Lassen laden..." /> : null}
            {weldsQuery.isError ? <ErrorState title="Lassen niet geladen" description="De lassen konden niet worden opgehaald." /> : null}
            {!weldsQuery.isLoading && !weldsQuery.isError ? (
              filteredWelds.length ? (
                <div className="list-stack compact-list">
                  {filteredWelds.map((weld) => (
                    <div key={String((weld as { id?: string | number }).id)} className="list-row list-row-button" onDoubleClick={() => navigate(`/projecten/${projectId}/lascontrole`)}>
                      <div>
                        <strong>{textOf((weld as { weld_number?: unknown; weld_no?: unknown }).weld_number || (weld as { weld_no?: unknown }).weld_no, `Las ${(weld as { id?: string | number }).id}`)}</strong>
                        <div className="list-subtle">{textOf((weld as { location?: unknown }).location)} · {textOf((weld as { welder_name?: unknown }).welder_name)} · {textOf((weld as { status?: unknown }).status)}</div>
                      </div>
                      <Badge tone={toneFromStatus(String((weld as { status?: unknown }).status || 'concept'))}>{textOf((weld as { status?: unknown }).status, 'Concept')}</Badge>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen lassen" description="Voeg lassen toe via Lascontrole of projectopbouw." />
            ) : null}
          </Card>
        ) : null}

        {currentTab === 'documenten' ? (
          <Card>
            <div className="section-title-row"><h3>Documenten</h3></div>
            <div className="toolbar-cluster" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="list-subtle">Upload projectdocumenten, bekijk metadata en open downloads direct vanuit Project 360.</div>
              <div className="toolbar-cluster">
                <input ref={documentInputRef} type="file" style={{ display: 'none' }} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleProjectDocumentUpload(file); }} />
                <Button onClick={() => documentInputRef.current?.click()} disabled={documentUploading}>{documentUploading ? 'Uploaden...' : 'Document uploaden'}</Button>
              </div>
            </div>
            {documentsQuery.isLoading ? <LoadingState label="Documenten laden..." /> : null}
            {documentsQuery.isError ? <ErrorState title="Documenten niet geladen" description="De documenten konden niet worden opgehaald." /> : null}
            {!documentsQuery.isLoading && !documentsQuery.isError ? (
              filteredDocuments.length ? (
                <div className="list-stack compact-list">
                  {filteredDocuments.map((document) => (
                    <div key={String((document as { id?: string | number }).id)} className="list-row">
                      <div>
                        <strong>{textOf((document as { title?: unknown; filename?: unknown }).title || (document as { filename?: unknown }).filename, `Document ${(document as { id?: string | number }).id}`)}</strong>
                        <div className="list-subtle">{textOf((document as { type?: unknown }).type)} · {textOf((document as { status?: unknown }).status)} · {formatDate((document as { uploaded_at?: string }).uploaded_at)}</div>
                      </div>
                      <div className="toolbar-cluster">
                        {Boolean((document as { download_url?: string }).download_url) ? (
                          <Button variant="secondary" onClick={() => window.open(String((document as { download_url?: string }).download_url), '_blank', 'noopener,noreferrer')}>Download</Button>
                        ) : null}
                        <Paperclip size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen documenten" description="Upload projectdocumenten voor dossieropbouw en bewijs." />
            ) : null}
          </Card>
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
                      <Badge tone={toneFromStatus(String(item.status || 'concept'))}>{textOf(item.status, 'Open')}</Badge>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen historie" description="Projecthistorie verschijnt hier zodra er mutaties zijn." />
            ) : null}
          </Card>
        ) : null}
      </ProjectTabShell>

      <Modal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} title="Wijzig project" size="large">
        <ProjectForm
          initial={project}
          isSubmitting={updateProject.isPending}
          submitLabel="Wijzigen"
          onSubmit={async (values) => {
            try {
              await updateProject.mutateAsync({ id: project.id, payload: values });
              setMessage('Project gewijzigd.');
              setProjectModalOpen(false);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Project wijzigen mislukt.');
            }
          }}
        />
      </Modal>
    </div>
  );
}

export default Project360Page;
