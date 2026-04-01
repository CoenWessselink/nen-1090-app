import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Boxes, ClipboardCheck, Eye, FileText, History, Paperclip, Pencil, Plus, ShieldCheck, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Modal } from '@/components/overlays/Modal';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { useProject, useProjectInspections, useProjectWelds } from '@/hooks/useProjects';
import { useAssemblies, useAssemblyCompliance, useAssemblyDocuments, useAssemblyWelds, useCreateAssembly, useDeleteAssembly, useUpdateAssembly } from '@/hooks/useAssemblies';
import { useCreateProjectDocument, useDeleteDocument, useDocumentVersions, useDownloadDocument, useProjectDocuments, useUpdateDocument } from '@/hooks/useDocuments';
import { useProjectAudit } from '@/hooks/useProjectAudit';
import { useConformWeld, useCreateWeld, useDeleteWeld, useUpdateWeld, useWeldAttachments, useWeldCompliance, useWeldDefects, useWeldInspections } from '@/hooks/useWelds';
import { AssemblyForm } from '@/features/projecten/components/AssemblyForm';
import { WeldForm } from '@/features/lascontrole/components/WeldForm';
import type { Assembly, AuditEntry, CeDocument, Weld } from '@/types/domain';
import { uploadWeldAttachment as uploadWeldAttachmentRequest } from '@/api/welds';
import type { WeldFormValues } from '@/types/forms';
import { formatDate } from '@/utils/format';
import { ProjectContextTabs, resolveProjectContextTab } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTabShell } from '@/features/projecten/components/ProjectTabShell';

function textOf(value: unknown, fallback = '—') {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function statusTone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['vrijgegeven', 'gereed', 'goedgekeurd', 'conform', 'resolved'].includes(value)) return 'success' as const;
  if (['afgekeurd', 'geblokkeerd', 'nok', 'open'].includes(value)) return 'danger' as const;
  return 'warning' as const;
}

function complianceLabel(data: Record<string, unknown> | null | undefined) {
  return textOf(data?.status ?? data?.state ?? data?.result, 'In controle');
}

function listCount(data: { items?: unknown[] } | undefined) {
  return Array.isArray(data?.items) ? data.items.length : 0;
}

export function Project360Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams<{ projectId?: string; assemblyId?: string; weldId?: string }>();
  const projectId = params.projectId || '';
  const location = useLocation();
  const currentPath = location.pathname;
  const currentTab = resolveProjectContextTab(currentPath);
  const currentIntent = new URLSearchParams(location.search).get('intent');

  const [message, setMessage] = useState<string | null>(null);
  const [subSearch, setSubSearch] = useState('');
  const [assemblyModal, setAssemblyModal] = useState<{ mode: 'create' | 'edit'; item?: Assembly } | null>(null);
  const [pendingDeleteAssembly, setPendingDeleteAssembly] = useState<Assembly | null>(null);
  const [weldModal, setWeldModal] = useState<{ mode: 'create' | 'edit'; item?: Weld } | null>(null);
  const [pendingDeleteWeld, setPendingDeleteWeld] = useState<Weld | null>(null);
  const [pendingConformWeld, setPendingConformWeld] = useState<Weld | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [documentModal, setDocumentModal] = useState<CeDocument | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<CeDocument | null>(null);
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState<CeDocument | null>(null);

  const projectQuery = useProject(projectId);
  const assembliesQuery = useAssemblies(projectId, { search: subSearch || undefined, sort: 'code' });
  const weldsQuery = useProjectWelds(projectId, { search: subSearch || undefined, sort: 'weld_number' });
  const inspectionsQuery = useProjectInspections(projectId, { search: subSearch || undefined });
  const documentsQuery = useProjectDocuments(projectId, { search: subSearch || undefined });
  const auditQuery = useProjectAudit(projectId);

  const assemblyDetailWelds = useAssemblyWelds(projectId, params.assemblyId || '');
  const assemblyDetailDocuments = useAssemblyDocuments(projectId, params.assemblyId || '');
  const assemblyDetailCompliance = useAssemblyCompliance(projectId, params.assemblyId || '');

  const selectedWeldInspections = useWeldInspections(projectId, params.weldId || '');
  const selectedWeldDefects = useWeldDefects(projectId, params.weldId || '');
  const selectedWeldAttachments = useWeldAttachments(projectId, params.weldId || '');
  const selectedWeldCompliance = useWeldCompliance(projectId, params.weldId || '');
  const documentVersionsQuery = useDocumentVersions(selectedDocument?.id);

  const createAssembly = useCreateAssembly(projectId);
  const updateAssembly = useUpdateAssembly(projectId);
  const deleteAssembly = useDeleteAssembly(projectId);
  const createWeld = useCreateWeld();
  const updateWeld = useUpdateWeld(projectId);
  const deleteWeld = useDeleteWeld(projectId);
  const conformWeld = useConformWeld(projectId);
  const createDocument = useCreateProjectDocument(projectId);
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const downloadDocument = useDownloadDocument();

  const project = projectQuery.data;
  const assemblies = useMemo(() => assembliesQuery.data?.items || [], [assembliesQuery.data]);
  const welds = useMemo(() => weldsQuery.data?.items || [], [weldsQuery.data]);
  const inspections = useMemo(() => inspectionsQuery.data?.items || [], [inspectionsQuery.data]);
  const documents = useMemo(() => documentsQuery.data?.items || [], [documentsQuery.data]);
  const auditItems = useMemo<AuditEntry[]>(() => (auditQuery.data?.items || []) as AuditEntry[], [auditQuery.data]);

  const selectedAssembly = useMemo(
    () => assemblies.find((item) => String(item.id) === String(params.assemblyId || '')) || null,
    [assemblies, params.assemblyId],
  );
  const selectedWeld = useMemo(
    () => welds.find((item) => String(item.id) === String(params.weldId || '')) || null,
    [welds, params.weldId],
  );

  const filteredAssemblies = useMemo(() => assemblies.filter((item) => {
    const haystack = [item.code, item.name, item.status].map((value) => String(value || '').toLowerCase()).join(' ');
    return !subSearch || haystack.includes(subSearch.toLowerCase());
  }), [assemblies, subSearch]);

  const filteredWelds = useMemo(() => welds.filter((item) => {
    const haystack = [item.weld_number, item.welder_name, item.location, item.status].map((value) => String(value || '').toLowerCase()).join(' ');
    return !subSearch || haystack.includes(subSearch.toLowerCase());
  }), [welds, subSearch]);

  const filteredDocuments = useMemo(() => documents.filter((item) => {
    const haystack = [item.title, item.filename, item.type, item.status, item.notes].map((value) => String(value || '').toLowerCase()).join(' ');
    return !subSearch || haystack.includes(subSearch.toLowerCase());
  }), [documents, subSearch]);

  const filteredAudit = useMemo(() => auditItems.filter((item) => {
    const haystack = [item.title, item.action, item.entity, item.status].map((value) => String(value || '').toLowerCase()).join(' ');
    return !subSearch || haystack.includes(subSearch.toLowerCase());
  }), [auditItems, subSearch]);

  const inspectionOpenCount = useMemo(() => inspections.filter((item) => !['goedgekeurd', 'conform', 'approved'].includes(String(item.status || '').toLowerCase())).length, [inspections]);
  const weldOpenCount = useMemo(() => welds.filter((item) => !['conform', 'goedgekeurd', 'approved'].includes(String(item.status || '').toLowerCase())).length, [welds]);
  const documentMissingCount = useMemo(() => documents.filter((item) => !item.has_file && !item.download_url).length, [documents]);
  const progressPercent = useMemo(() => {
    const total = (assemblies.length > 0 ? 1 : 0) + (welds.length > 0 ? 1 : 0) + (documents.length > 0 ? 1 : 0) + (inspectionOpenCount === 0 && inspections.length > 0 ? 1 : 0);
    return Math.round((total / 4) * 100);
  }, [assemblies.length, welds.length, documents.length, inspectionOpenCount, inspections.length]);

  const summaryCards = [
    { label: 'Assemblies', value: assembliesQuery.data?.total ?? assemblies.length, icon: Boxes },
    { label: 'Lassen', value: weldsQuery.data?.total ?? welds.length, icon: ShieldCheck },
    { label: 'Open inspecties', value: inspectionOpenCount, icon: ClipboardCheck },
    { label: 'Documenten', value: documentsQuery.data?.total ?? documents.length, icon: FileText },
    { label: 'CE gereedheid', value: `${Math.min(progressPercent, 100)}%`, icon: ShieldAlert },
    { label: 'Historie', value: auditQuery.data?.total ?? auditItems.length, icon: History },
  ];

  const recentAudit = filteredAudit.slice(0, 5);
  const recentDocuments = filteredDocuments.slice(0, 5);

  const goToTab = (value: string) => navigate(`/projecten/${projectId}/${value}`);


  useEffect(() => {
    if (!currentIntent) return;

    if (currentIntent === 'create-assembly') {
      setAssemblyModal({ mode: 'create' });
    }

    if (currentIntent === 'create-weld') {
      setWeldModal({ mode: 'create' });
    }

    navigate(currentPath, { replace: true });
  }, [currentIntent, currentPath, navigate]);


  const handleDocumentUpload = async (files: File[], extra: Record<string, string> = {}) => {
    try {
      for (const file of files) {
        const payload = new FormData();
        payload.append('files', file);
        payload.append('title', documentTitle || file.name);
        payload.append('notes', documentNotes);
        Object.entries(extra).forEach(([key, value]) => payload.append(key, value));
        await createDocument.mutateAsync(payload);
      }
      setDocumentTitle('');
      setDocumentNotes('');
      setMessage(`${files.length} document(en) toegevoegd aan dit project.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Document upload mislukt.');
    }
  };

  if (!projectId) return <ErrorState title="Geen projectcontext" description="Open eerst een project vanuit de projectlijst." />;
  if (projectQuery.isLoading) return <LoadingState label="Project 360 laden..." />;
  if (projectQuery.isError || !project) return <ErrorState title="Project niet geladen" description="De projectcontext kon niet worden opgehaald uit de bestaande backend." />;

  return (
    <div className="page-stack">
      <PageHeader
        title={textOf(project.name || project.omschrijving || project.projectnummer, 'Project 360')}
        description="Volledige projectinterne werkcontainer voor overzicht, assemblies, lassen, lascontrole, documenten en historie."
      >
        <Button variant="secondary" onClick={() => navigate('/projecten')}>Terug naar projecten</Button>
        <Button variant="secondary" onClick={() => navigate('/projecten')}>Projectlijst</Button>
      </PageHeader>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <Card>
        <div className="detail-hero">
          <div>
            <h3>{textOf(project.projectnummer, textOf(project.name || project.omschrijving, 'Project'))}</h3>
            <div className="list-subtle">{textOf(project.client_name || project.opdrachtgever, 'Geen opdrachtgever')} · {textOf(project.execution_class || project.executieklasse, 'Executieklasse onbekend')}</div>
          </div>
          <div className="row-actions">
            <Badge tone={statusTone(String(project.status || ''))}>{textOf(project.status, 'Open')}</Badge>
          </div>
        </div>
        <div className="divider" />
        <div className="detail-grid">
          <div><span>Start</span><strong>{formatDate(project.start_date)}</strong></div>
          <div><span>Einde</span><strong>{formatDate(project.end_date)}</strong></div>
          <div><span>Open lassen</span><strong>{weldOpenCount}</strong></div>
          <div><span>Ontbrekende documenten</span><strong>{documentMissingCount}</strong></div>
        </div>
        <div className="divider" />
        <div className="progress-shell"><div className="progress-bar" style={{ width: `${Math.min(progressPercent, 100)}%` }} /></div>
        <div className="list-subtle">Projectvoortgang binnen Fase 2 werkstroom: {progressPercent}% van de kernonderdelen is gevuld of afgerond.</div>
      </Card>

      <ProjectTabShell
        projectId={projectId}
        currentTab={currentTab}
        onCreateProject={() => navigate('/projecten?intent=create-project')}
        onCreateAssembly={() => setAssemblyModal({ mode: 'create' })}
        onCreateWeld={() => setWeldModal({ mode: 'create' })}
        filters={<Input value={subSearch} onChange={(event) => setSubSearch(event.target.value)} placeholder="Zoek binnen deze projectcontext" />}
        kpis={summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="project-kpi-card">
              <div className="stat-card">
                <div className="metric-inline"><Icon size={18} /><span className="stat-label">{card.label}</span></div>
                <div className="stat-value">{card.value}</div>
                <div className="stat-meta">Direct vanuit deze projectcontext bijgewerkt.</div>
              </div>
            </Card>
          );
        })}
      >
      {currentTab === 'overzicht' ? (
        <>
          <div className="content-grid-2">
            <Card>
              <div className="section-title-row"><h3>Snelle acties</h3></div>
              <div className="list-stack compact-list">
                <button className="list-row list-row-button" type="button" onClick={() => setAssemblyModal({ mode: 'create' })}>
                  <div><strong>Nieuwe assembly</strong><div className="list-subtle">Voeg direct een assembly toe binnen dit project.</div></div>
                  <Plus size={16} />
                </button>
                <button className="list-row list-row-button" type="button" onClick={() => setWeldModal({ mode: 'create' })}>
                  <div><strong>Nieuwe las</strong><div className="list-subtle">Leg direct een nieuwe las vast in de projectcontext.</div></div>
                  <Plus size={16} />
                </button>
                <button className="list-row list-row-button" type="button" onClick={() => goToTab('lascontrole')}>
                  <div><strong>Open lascontrole</strong><div className="list-subtle">Verwerk inspecties, defecten en opvolging projectgebonden.</div></div>
                  <ClipboardCheck size={16} />
                </button>
                <button className="list-row list-row-button" type="button" onClick={() => goToTab('documenten')}>
                  <div><strong>Document uploaden</strong><div className="list-subtle">Voeg bewijslast, certificaten of foto's toe.</div></div>
                  <Upload size={16} />
                </button>
                <button className="list-row list-row-button" type="button" onClick={() => goToTab('ce-dossier')}>
                  <div><strong>Open CE dossier</strong><div className="list-subtle">Bekijk ontbrekende onderdelen, gereedheid en exportacties.</div></div>
                  <ShieldCheck size={16} />
                </button>
              </div>
            </Card>
            <Card>
              <div className="section-title-row"><h3>Open aandachtspunten</h3></div>
              {filteredWelds.length ? (
                <div className="list-stack compact-list">
                  {filteredWelds.slice(0, 5).map((weld) => (
                    <button key={String(weld.id)} className="list-row list-row-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lassen/${String(weld.id)}`)}>
                      <div>
                        <strong>{textOf(weld.weld_number || weld.weld_no, `Las ${weld.id}`)}</strong>
                        <div className="list-subtle">{textOf(weld.location)} · {textOf(weld.welder_name)} · {textOf(weld.status)}</div>
                      </div>
                      <Eye size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="Nog geen lassen" description="Maak in deze fase eerst lassen aan binnen het project." />
              )}
            </Card>
          </div>

          <div className="content-grid-2">
            <Card>
              <div className="section-title-row"><h3>Recente documenten</h3></div>
              {recentDocuments.length ? (
                <div className="list-stack compact-list">
                  {recentDocuments.map((document) => (
                    <button key={String(document.id)} className="list-row list-row-button" type="button" onClick={() => { setSelectedDocument(document); goToTab('documenten'); }}>
                      <div>
                        <strong>{textOf(document.title || document.filename, `Document ${document.id}`)}</strong>
                        <div className="list-subtle">{textOf(document.type)} · {textOf(document.status)} · {formatDate(document.uploaded_at)}</div>
                      </div>
                      <FileText size={16} />
                    </button>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen documenten" description="Upload projectdocumenten om bewijs en CE-opbouw te ondersteunen." />}
            </Card>
            <Card>
              <div className="section-title-row"><h3>Recente historie</h3></div>
              {recentAudit.length ? (
                <div className="timeline-list">
                  {recentAudit.map((item) => (
                    <div key={String(item.id)} className="timeline-item">
                      <div className="timeline-dot" />
                      <div>
                        <strong>{textOf(item.title || item.action, `Auditregel ${item.id}`)}</strong>
                        <div className="list-subtle">{textOf(item.entity)} · {textOf(item.status)} · {formatDate(item.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen historie" description="Mutaties, acties en auditregels verschijnen hier zodra er wijzigingen zijn." />}
            </Card>
          </div>
        </>
      ) : null}

      {currentTab === 'assemblies' ? (
        <div className="content-grid-2">
          <Card>
            <div className="section-title-row"><h3>Assemblies</h3><Button variant="secondary" onClick={() => setAssemblyModal({ mode: 'create' })}><Plus size={16} /> Nieuw</Button></div>
            {assembliesQuery.isLoading ? <LoadingState label="Assemblies laden..." /> : null}
            {assembliesQuery.isError ? <ErrorState title="Assemblies niet geladen" description="De assemblies konden niet worden opgehaald." /> : null}
            {!assembliesQuery.isLoading && !assembliesQuery.isError ? (
              filteredAssemblies.length ? (
                <div className="list-stack compact-list">
                  {filteredAssemblies.map((assembly) => (
                    <div key={String(assembly.id)} className="list-row">
                      <div>
                        <strong>{textOf(assembly.code, textOf(assembly.name, `Assembly ${assembly.id}`))}</strong>
                        <div className="list-subtle">{textOf(assembly.name)} · {textOf(assembly.status)}</div>
                      </div>
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => navigate(`/projecten/${projectId}/assemblies/${String(assembly.id)}`)} aria-label="Open assembly"><Eye size={16} /></button>
                        <button className="icon-button" type="button" onClick={() => setAssemblyModal({ mode: 'edit', item: assembly })} aria-label="Bewerk assembly"><Pencil size={16} /></button>
                        <button className="icon-button" type="button" onClick={() => setPendingDeleteAssembly(assembly)} aria-label="Verwijder assembly"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen assemblies" description="Maak de eerste assembly direct vanuit Project 360." />
            ) : null}
          </Card>

          <Card>
            <div className="section-title-row"><h3>Assembly detail</h3></div>
            {selectedAssembly ? (
              <div className="detail-stack">
                <div className="detail-grid">
                  <div><span>Code</span><strong>{textOf(selectedAssembly.code)}</strong></div>
                  <div><span>Naam</span><strong>{textOf(selectedAssembly.name)}</strong></div>
                  <div><span>Status</span><strong>{textOf(selectedAssembly.status)}</strong></div>
                  <div><span>Compliance</span><strong>{complianceLabel(assemblyDetailCompliance.data as Record<string, unknown> | undefined)}</strong></div>
                </div>
                <div className="detail-grid">
                  <div><span>Gekoppelde lassen</span><strong>{assemblyDetailWelds.data?.total ?? listCount(assemblyDetailWelds.data)}</strong></div>
                  <div><span>Gekoppelde documenten</span><strong>{assemblyDetailDocuments.data?.total ?? listCount(assemblyDetailDocuments.data)}</strong></div>
                </div>
                <Card>
                  <div className="section-title-row"><h3>Gekoppelde lassen</h3></div>
                  {(assemblyDetailWelds.data?.items || []).length ? (
                    <div className="list-stack compact-list">
                      {(assemblyDetailWelds.data?.items || []).slice(0, 8).map((weld) => (
                        <div key={String(weld.id)} className="list-row">
                          <div><strong>{textOf((weld as Weld).weld_number || (weld as Weld).weld_no, `Las ${String(weld.id)}`)}</strong><div className="list-subtle">{textOf((weld as Weld).location)} · {textOf((weld as Weld).status)}</div></div>
                          <button className="icon-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lassen/${String(weld.id)}`)} aria-label="Open las"><Eye size={16} /></button>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState title="Nog geen lassen gekoppeld" description="Voeg vanuit de lassen-tab lassen toe aan deze assembly." />}
                </Card>
                <Card>
                  <div className="section-title-row"><h3>Gekoppelde documenten</h3></div>
                  {(assemblyDetailDocuments.data?.items || []).length ? (
                    <div className="list-stack compact-list">
                      {(assemblyDetailDocuments.data?.items || []).slice(0, 8).map((document) => (
                        <div key={String(document.id)} className="list-row">
                          <div><strong>{textOf((document as CeDocument).title || (document as CeDocument).filename, `Document ${String(document.id)}`)}</strong><div className="list-subtle">{textOf((document as CeDocument).status)} · {formatDate((document as CeDocument).uploaded_at)}</div></div>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState title="Nog geen assembly-documenten" description="Documentrelaties worden hier zichtbaar zodra de backend ze teruggeeft." />}
                </Card>
              </div>
            ) : (
              <EmptyState title="Selecteer een assembly" description="Open een assembly uit de lijst om detail, koppelingen en compliance te bekijken." />
            )}
          </Card>
        </div>
      ) : null}

      {currentTab === 'lassen' ? (
        <div className="content-grid-2">
          <Card>
            <div className="section-title-row"><h3>Lassen</h3><Button variant="secondary" onClick={() => setWeldModal({ mode: 'create' })}><Plus size={16} /> Nieuwe las</Button></div>
            {weldsQuery.isLoading ? <LoadingState label="Lassen laden..." /> : null}
            {weldsQuery.isError ? <ErrorState title="Lassen niet geladen" description="De lassenlijst kon niet worden opgehaald." /> : null}
            {!weldsQuery.isLoading && !weldsQuery.isError ? (
              filteredWelds.length ? (
                <div className="list-stack compact-list">
                  {filteredWelds.map((weld) => (
                    <div
                      key={String(weld.id)}
                      className="list-row list-row-button"
                      onClick={() => navigate(`/projecten/${projectId}/lassen/${String(weld.id)}`)}
                      onDoubleClick={() => setWeldModal({ mode: 'edit', item: weld })}
                    >
                      <div>
                        <strong>{textOf(weld.weld_number || weld.weld_no, `Las ${weld.id}`)}</strong>
                        <div className="list-subtle">{textOf(weld.location)} · {textOf(weld.welder_name)} · {textOf(weld.status, 'Conform')}</div>
                      </div>
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={(event) => { event.stopPropagation(); navigate(`/projecten/${projectId}/lassen/${String(weld.id)}`); }} aria-label="Open las"><Eye size={16} /></button>
                        <button className="icon-button" type="button" onClick={(event) => { event.stopPropagation(); setWeldModal({ mode: 'edit', item: weld }); }} aria-label="Bewerk las"><Pencil size={16} /></button>
                        <button className="icon-button" type="button" onClick={(event) => { event.stopPropagation(); setPendingConformWeld(weld); }} aria-label="Zet conform"><ShieldCheck size={16} /></button>
                        <button className="icon-button" type="button" onClick={(event) => { event.stopPropagation(); setPendingDeleteWeld(weld); }} aria-label="Verwijder las"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen lassen" description="Voeg de eerste las toe om inspecties en CE-opbouw te starten." />
            ) : null}
          </Card>

          <Card>
            <div className="section-title-row"><h3>Lasdetail</h3></div>
            {selectedWeld ? (
              <div className="detail-stack">
                <div className="detail-grid">
                  <div><span>Lasnummer</span><strong>{textOf(selectedWeld.weld_number || selectedWeld.weld_no)}</strong></div>
                  <div><span>Locatie</span><strong>{textOf(selectedWeld.location)}</strong></div>
                  <div><span>Lasser</span><strong>{textOf(selectedWeld.welder_name)}</strong></div>
                  <div><span>Status</span><strong>{textOf(selectedWeld.status)}</strong></div>
                  <div><span>Inspecties</span><strong>{selectedWeldInspections.data?.total ?? listCount(selectedWeldInspections.data)}</strong></div>
                  <div><span>Defecten</span><strong>{selectedWeldDefects.data?.total ?? listCount(selectedWeldDefects.data)}</strong></div>
                  <div><span>Bijlagen</span><strong>{selectedWeldAttachments.data?.total ?? listCount(selectedWeldAttachments.data)}</strong></div>
                  <div><span>Compliance</span><strong>{complianceLabel(selectedWeldCompliance.data as Record<string, unknown> | undefined)}</strong></div>
                </div>
                <Card>
                  <div className="section-title-row"><h3>Workflow</h3></div>
                  <div className="list-stack compact-list">
                    <button className="list-row list-row-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lascontrole`)}>
                      <div><strong>Ga naar lascontrole</strong><div className="list-subtle">Voer inspecties, defecten en vervolgacties uit binnen dit project.</div></div>
                      <ClipboardCheck size={16} />
                    </button>
                    <div className="list-row"><div><strong>Defectaantal</strong><div className="list-subtle">{selectedWeldDefects.data?.total ?? listCount(selectedWeldDefects.data)} geregistreerd</div></div><Badge tone={(selectedWeldDefects.data?.total ?? listCount(selectedWeldDefects.data)) ? 'danger' : 'success'}>{(selectedWeldDefects.data?.total ?? listCount(selectedWeldDefects.data)) ? 'Open' : 'Geen'}</Badge></div>
                    <div className="list-row"><div><strong>Bijlagen</strong><div className="list-subtle">Foto's, bestanden en bewijs gekoppeld aan deze las.</div></div><Badge tone="neutral">{selectedWeldAttachments.data?.total ?? listCount(selectedWeldAttachments.data)}</Badge></div>
                  </div>
                </Card>
                <Card>
                  <div className="section-title-row"><h3>Recente lasbijlagen</h3></div>
                  {(selectedWeldAttachments.data?.items || []).length ? (
                    <div className="list-stack compact-list">
                      {(selectedWeldAttachments.data?.items || []).slice(0, 5).map((attachment) => (
                        <div key={String((attachment as CeDocument).id)} className="list-row">
                          <div><strong>{textOf((attachment as CeDocument).title || (attachment as CeDocument).filename, `Bijlage ${String((attachment as CeDocument).id)}`)}</strong><div className="list-subtle">{textOf((attachment as CeDocument).status)} · {formatDate((attachment as CeDocument).uploaded_at)}</div></div>
                          <Paperclip size={16} />
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState title="Nog geen bijlagen" description="Bijlagen die tijdens lascontrole worden toegevoegd verschijnen hier direct." />}
                </Card>
              </div>
            ) : (
              <EmptyState title="Selecteer een las" description="Open een las uit de lijst om de detailcontext en vervolgstappen te zien." />
            )}
          </Card>
        </div>
      ) : null}

      {currentTab === 'lascontrole' ? (
        <div className="content-grid-2">
          <Card>
            <div className="section-title-row"><h3>Lascontrole werkstroom</h3></div>
            <div className="detail-grid">
              <div><span>Open inspecties</span><strong>{inspectionOpenCount}</strong></div>
              <div><span>Lassen met aandacht</span><strong>{weldOpenCount}</strong></div>
              <div><span>Defectmeldingen</span><strong>{welds.reduce((sum, item) => sum + Number(item.defect_count || 0), 0)}</strong></div>
              <div><span>Actieve projectcontext</span><strong>{textOf(project.projectnummer || project.name)}</strong></div>
            </div>
            <div className="divider" />
            <div className="list-stack compact-list">
              <button className="list-row list-row-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lascontrole`)}>
                <div><strong>Open volledige lascontrole</strong><div className="list-subtle">Ga door naar inspecties, defecten, foto's en bulkacties binnen dit project.</div></div>
                <ClipboardCheck size={16} />
              </button>
              <button className="list-row list-row-button" type="button" onClick={() => setWeldModal({ mode: 'create' })}>
                <div><strong>Nieuwe las registreren</strong><div className="list-subtle">Nieuwe las direct in projectcontext toevoegen.</div></div>
                <Plus size={16} />
              </button>
            </div>
          </Card>
          <Card>
            <div className="section-title-row"><h3>Prioriteiten</h3></div>
            {filteredWelds.length ? (
              <div className="list-stack compact-list">
                {filteredWelds.filter((weld) => String(weld.status || '').toLowerCase() !== 'conform').slice(0, 6).map((weld) => (
                  <div key={String(weld.id)} className="list-row">
                    <div>
                      <strong>{textOf(weld.weld_number || weld.weld_no, `Las ${weld.id}`)}</strong>
                      <div className="list-subtle">{textOf(weld.location)} · {textOf(weld.status)} · Defecten: {Number(weld.defect_count || 0)}</div>
                    </div>
                    <button className="icon-button" type="button" onClick={() => navigate(`/projecten/${projectId}/lassen/${String(weld.id)}`)} aria-label="Open las"><ShieldAlert size={16} /></button>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Geen open aandachtspunten" description="Alle bekende lassen staan momenteel conform of er zijn nog geen lassen vastgelegd." />}
          </Card>
        </div>
      ) : null}

      {currentTab === 'documenten' ? (
        <div className="content-grid-2">
          <Card>
            <div className="section-title-row"><h3>Nieuw document</h3></div>
            <div className="form-grid">
              <Input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} placeholder="Documenttitel (optioneel)" />
              <Input value={documentNotes} onChange={(event) => setDocumentNotes(event.target.value)} placeholder="Notities / context" />
              <UploadDropzone onFiles={handleDocumentUpload} disabled={createDocument.isPending} />
            </div>
          </Card>
          <Card>
            <div className="section-title-row"><h3>Projectdocumenten</h3></div>
            {documentsQuery.isLoading ? <LoadingState label="Documenten laden..." /> : null}
            {documentsQuery.isError ? <ErrorState title="Documenten niet geladen" description="De projectdocumenten konden niet worden opgehaald." /> : null}
            {!documentsQuery.isLoading && !documentsQuery.isError ? (
              filteredDocuments.length ? (
                <div className="list-stack compact-list">
                  {filteredDocuments.map((document) => (
                    <div key={String(document.id)} className="list-row">
                      <div>
                        <strong>{textOf(document.title || document.filename, `Document ${document.id}`)}</strong>
                        <div className="list-subtle">{textOf(document.type)} · {textOf(document.status)} · {formatDate(document.uploaded_at)}</div>
                      </div>
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => setSelectedDocument(document)} aria-label="Document detail"><Eye size={16} /></button>
                        <button className="icon-button" type="button" onClick={() => setDocumentModal(document)} aria-label="Document bewerken"><Pencil size={16} /></button>
                        <button className="icon-button" type="button" onClick={async () => { await downloadDocument.mutateAsync(document.id); setMessage('Documentdownload gestart.'); }} aria-label="Document downloaden"><FileText size={16} /></button>
                        <button className="icon-button" type="button" onClick={() => setPendingDeleteDocument(document)} aria-label="Document verwijderen"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen documenten" description="Upload certificaten, foto's of andere bewijsstukken in dit project." />
            ) : null}
          </Card>

          <Card>
            <div className="section-title-row"><h3>Documentdetail</h3></div>
            {selectedDocument ? (
              <div className="detail-stack">
                <div className="detail-grid">
                  <div><span>Titel</span><strong>{textOf(selectedDocument.title || selectedDocument.filename)}</strong></div>
                  <div><span>Status</span><strong>{textOf(selectedDocument.status)}</strong></div>
                  <div><span>Type</span><strong>{textOf(selectedDocument.type)}</strong></div>
                  <div><span>Uploaddatum</span><strong>{formatDate(selectedDocument.uploaded_at)}</strong></div>
                </div>
                <Card>
                  <div className="section-title-row"><h3>Versies</h3></div>
                  {documentVersionsQuery.isLoading ? <LoadingState label="Versies laden..." /> : null}
                  {!documentVersionsQuery.isLoading && (documentVersionsQuery.data?.items || []).length ? (
                    <div className="list-stack compact-list">
                      {(documentVersionsQuery.data?.items || []).map((version) => (
                        <div key={String(version.id)} className="list-row">
                          <div><strong>{textOf(version.version, `Versie ${version.id}`)}</strong><div className="list-subtle">{textOf(version.status)} · {formatDate(version.uploaded_at)}</div></div>
                          <Badge tone="neutral">{textOf(version.type, 'Document')}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState title="Geen versiehistorie" description="Versies worden hier getoond zodra de backend deze ondersteuning teruggeeft." />}
                </Card>
              </div>
            ) : <EmptyState title="Selecteer een document" description="Open een document uit de projectlijst om metadata en versiehistorie te bekijken." />}
          </Card>
        </div>
      ) : null}

      {currentTab === 'historie' ? (
        <div className="content-grid-2">
          <Card>
            <div className="section-title-row"><h3>Projecthistorie</h3></div>
            {auditQuery.isLoading ? <LoadingState label="Historie laden..." /> : null}
            {auditQuery.isError ? <ErrorState title="Historie niet geladen" description="De audittrail kon niet worden opgehaald." /> : null}
            {!auditQuery.isLoading && !auditQuery.isError ? (
              filteredAudit.length ? (
                <div className="list-stack compact-list">
                  {filteredAudit.map((item) => (
                    <div key={String(item.id)} className="list-row">
                      <div>
                        <strong>{textOf(item.title || item.action, `Auditregel ${item.id}`)}</strong>
                        <div className="list-subtle">{textOf(item.entity)} · {textOf(item.status)} · {formatDate(item.created_at)}</div>
                      </div>
                      <Badge tone={statusTone(String(item.status || ''))}>{textOf(item.status, 'Open')}</Badge>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Nog geen historie" description="Auditregels verschijnen hier zodra het project mutaties of exports bevat." />
            ) : null}
          </Card>
          <Card>
            <div className="section-title-row"><h3>Samenvatting</h3></div>
            <div className="detail-grid">
              <div><span>Auditregels</span><strong>{auditQuery.data?.total ?? auditItems.length}</strong></div>
              <div><span>Documentmutaties</span><strong>{documents.length}</strong></div>
              <div><span>Lasmutaties</span><strong>{welds.length}</strong></div>
              <div><span>Assemblymutaties</span><strong>{assemblies.length}</strong></div>
            </div>
            <div className="divider" />
            <div className="list-subtle">Hier blijft de projecthistorie inzichtelijk voor controles, overdracht en bewijsvoering binnen de projectcontext.</div>
          </Card>
        </div>
      ) : null}
      </ProjectTabShell>

      <Modal open={!!assemblyModal} onClose={() => setAssemblyModal(null)} title={assemblyModal?.mode === 'edit' ? 'Assembly bewerken' : 'Nieuwe assembly'} size="large">
        <AssemblyForm
          initial={assemblyModal?.item}
          isSubmitting={createAssembly.isPending || updateAssembly.isPending || createDocument.isPending}
          onSubmit={async (values, files) => {
            try {
              let assemblyId = assemblyModal?.item?.id;
              if (assemblyModal?.mode === 'edit' && assemblyModal.item) {
                const updated = await updateAssembly.mutateAsync({ assemblyId: assemblyModal.item.id, payload: values });
                assemblyId = updated.id || assemblyModal.item.id;
                setMessage('Assembly bijgewerkt.');
              } else {
                const created = await createAssembly.mutateAsync(values);
                assemblyId = created.id;
                setMessage('Assembly toegevoegd aan project.');
              }

              if (files.length && assemblyId) {
                await handleDocumentUpload(files, { assembly_id: String(assemblyId), relation_type: 'assembly' });
              }

              setAssemblyModal(null);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Assembly opslaan mislukt.');
            }
          }}
        />
      </Modal>

      <Modal open={!!weldModal} onClose={() => setWeldModal(null)} title={weldModal?.mode === 'edit' ? 'Las bewerken' : 'Nieuwe las'} size="large">
        <WeldForm
          initial={weldModal?.item ? {
            project_id: String(projectId),
            weld_number: String(weldModal.item.weld_number || weldModal.item.weld_no || ''),
            assembly_id: weldModal.item.assembly_id ? String(weldModal.item.assembly_id) : '',
            wps_id: weldModal.item.wps_id || '',
            welder_name: weldModal.item.welder_name || '',
            process: weldModal.item.process || '135',
            location: weldModal.item.location || '',
            status: weldModal.item.status || 'conform',
          } : undefined}
          defaultProjectId={String(projectId)}
          isSubmitting={createWeld.isPending || updateWeld.isPending}
          onSubmit={async (values: WeldFormValues, files) => {
            try {
              let weldId = weldModal?.item?.id;
              if (weldModal?.mode === 'edit' && weldModal.item) {
                const updated = await updateWeld.mutateAsync({ weldId: weldModal.item.id, payload: values });
                weldId = updated.id || weldModal.item.id;
                setMessage('Las bijgewerkt.');
              } else {
                const created = await createWeld.mutateAsync(values);
                weldId = created && typeof created === 'object' && 'id' in created ? (created as { id?: string | number }).id : undefined;
                setMessage('Las toegevoegd aan project.');
              }

              if (files.length && weldId) {
                for (const file of files) {
                  const payload = new FormData();
                  payload.append('files', file);
                  await uploadWeldAttachmentRequest(projectId, weldId, payload);
                }
                await queryClient.invalidateQueries({ queryKey: ['weld-attachments', projectId, weldId] });
              }

              setWeldModal(null);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Las opslaan mislukt.');
            }
          }}
        />
      </Modal>

      <Modal open={!!documentModal} onClose={() => setDocumentModal(null)} title="Documentmetadata" size="medium">
        <div className="form-grid">
          <Input value={documentModal?.title || ''} onChange={(event) => setDocumentModal((current) => current ? { ...current, title: event.target.value } : current)} placeholder="Titel" />
          <Input value={documentModal?.notes || ''} onChange={(event) => setDocumentModal((current) => current ? { ...current, notes: event.target.value } : current)} placeholder="Notities" />
          <div className="form-actions">
            <Button onClick={async () => {
              if (!documentModal) return;
              try {
                await updateDocument.mutateAsync({ documentId: documentModal.id, payload: { title: documentModal.title || '', notes: documentModal.notes || '' } });
                setDocumentModal(null);
                setMessage('Documentmetadata bijgewerkt.');
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Document bijwerken mislukt.');
              }
            }}>Opslaan</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDeleteAssembly}
        title="Assembly verwijderen"
        description="Deze assembly wordt uit het project verwijderd."
        danger
        confirmLabel="Verwijderen"
        onConfirm={async () => {
          if (!pendingDeleteAssembly) return;
          try {
            await deleteAssembly.mutateAsync(pendingDeleteAssembly.id);
            if (String(params.assemblyId || '') === String(pendingDeleteAssembly.id)) {
              navigate(`/projecten/${projectId}/assemblies`);
            }
            setPendingDeleteAssembly(null);
            setMessage('Assembly verwijderd.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Assembly verwijderen mislukt.');
          }
        }}
        onClose={() => setPendingDeleteAssembly(null)}
      />

      <ConfirmDialog
        open={!!pendingDeleteWeld}
        title="Las verwijderen"
        description="Deze las wordt uit het project verwijderd."
        danger
        confirmLabel="Verwijderen"
        onConfirm={async () => {
          if (!pendingDeleteWeld) return;
          try {
            await deleteWeld.mutateAsync(pendingDeleteWeld.id);
            if (String(params.weldId || '') === String(pendingDeleteWeld.id)) {
              navigate(`/projecten/${projectId}/lassen`);
            }
            setPendingDeleteWeld(null);
            setMessage('Las verwijderd.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Las verwijderen mislukt.');
          }
        }}
        onClose={() => setPendingDeleteWeld(null)}
      />

      <ConfirmDialog
        open={!!pendingConformWeld}
        title="Las conform zetten"
        description="Deze las wordt direct als conform gemarkeerd binnen het project."
        confirmLabel="Conform zetten"
        onConfirm={async () => {
          if (!pendingConformWeld) return;
          try {
            await conformWeld.mutateAsync(pendingConformWeld.id);
            setPendingConformWeld(null);
            setMessage('Las gemarkeerd als conform.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Conformactie mislukt.');
          }
        }}
        onClose={() => setPendingConformWeld(null)}
      />

      <ConfirmDialog
        open={!!pendingDeleteDocument}
        title="Document verwijderen"
        description="Dit document wordt uit het project verwijderd."
        danger
        confirmLabel="Verwijderen"
        onConfirm={async () => {
          if (!pendingDeleteDocument) return;
          try {
            await deleteDocument.mutateAsync(pendingDeleteDocument.id);
            if (selectedDocument && String(selectedDocument.id) === String(pendingDeleteDocument.id)) {
              setSelectedDocument(null);
            }
            setPendingDeleteDocument(null);
            setMessage('Document verwijderd.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Document verwijderen mislukt.');
          }
        }}
        onClose={() => setPendingDeleteDocument(null)}
      />
    </div>
  );
}

export default Project360Page;
