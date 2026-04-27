import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, FolderOpen, History, ListChecks, PanelsTopLeft, Pencil, Plus, Wrench } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { normalizeApiError, projectClient, projectCode, projectExecutionClass, projectTitle } from '@/features/mobile/mobile-utils';
import { ProjectQualityNormCard } from '@/features/projecten/ProjectQualityNormCard';
import type { Project } from '@/types/domain';

export function MobileProject360Page() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProject(projectId)
      .then((result) => { if (!active) return; setProject(result || null); setError(null); })
      .catch((err) => { if (!active) return; setError(normalizeApiError(err, 'Project could not be loaded.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const actions = useMemo(() => [
    { label: 'Create assembly', color: 'primary', icon: PanelsTopLeft, to: `/projecten/${projectId}/assemblies/nieuw` },
    { label: 'Welds', color: 'success', icon: Wrench, to: `/projecten/${projectId}/lassen` },
    { label: 'Documents', color: 'danger', icon: FolderOpen, to: `/projecten/${projectId}/documenten` },
    { label: 'CE Dossier', color: 'warning', icon: FileText, to: `/projecten/${projectId}/ce-dossier` },
    { label: 'View PDF', color: 'primary', icon: Eye, to: `/projecten/${projectId}/pdf-viewer` },
    { label: 'History', color: 'neutral', icon: History, to: `/projecten/${projectId}/historie` },
    { label: 'Inspections', color: 'neutral', icon: ListChecks, to: `/projecten/${projectId}/lassen` },
  ], [projectId]);

  return (
    <MobilePageScaffold title="Project overview" subtitle="Manage assemblies, welds, documents, norm status and CE dossier output." backTo="/projecten" rightSlot={<div className="mobile-header-actions"><button className="mobile-icon-button" type="button" aria-label="Edit project" onClick={() => navigate(`/projecten/${projectId}/bewerken`)}><Pencil size={18} /></button><button className="mobile-icon-button" type="button" aria-label="Create weld" onClick={() => navigate(`/projecten/${projectId}/lassen/nieuw`)}><Plus size={18} /></button></div>}>
      {loading ? <div className="mobile-state-card">Loading project…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading && !error && project ? <>
        <div className="mobile-detail-card project-overview-card">
          <div className="mobile-field-row"><span>Project name</span><strong>{projectTitle(project)}</strong></div>
          <div className="mobile-field-row"><span>Project number</span><strong>{projectCode(project)}</strong></div>
          <div className="mobile-field-row"><span>Client</span><strong>{projectClient(project)}</strong></div>
          <div className="mobile-field-row"><span>Execution Class (EXC)</span><strong>{projectExecutionClass(project)}</strong></div>
        </div>
        <ProjectQualityNormCard projectId={projectId} onOpen={() => navigate(`/projecten/${projectId}/lassen`)} />
        <div className="mobile-inline-actions mobile-project-quick-actions">
          <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/assemblies/nieuw`)}><PanelsTopLeft size={16} /> Create assembly</button>
          <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/bewerken`)}><Pencil size={16} /> Edit project</button>
          <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/pdf-viewer`)}><Eye size={16} /> View PDF</button>
          <button type="button" className="mobile-primary-button" onClick={() => navigate(`/projecten/${projectId}/lassen/nieuw`)}><Plus size={16} /> Create weld</button>
        </div>
        <div className="mobile-action-grid">{actions.map((action) => { const Icon = action.icon; return <button key={action.label} type="button" className={`mobile-action-card mobile-action-card-${action.color}`} onClick={() => navigate(action.to)}><Icon size={20} /><span>{action.label}</span></button>; })}</div>
      </> : null}
    </MobilePageScaffold>
  );
}
