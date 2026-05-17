import { useCallback, useEffect, useState } from 'react';
import { FileText, FolderOpen, History, ListChecks, PanelsTopLeft, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteProject, getProject } from '@/api/projects';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { normalizeApiError, projectClient, projectCode, projectExecutionClass, projectTitle } from '@/features/mobile/mobile-utils';
import { ProjectQualityNormCard } from '@/features/projecten/ProjectQualityNormCard';
import type { Project } from '@/types/domain';

export function MobileProject360Page() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProject(projectId)
      .then((result) => { if (!active) return; setProject(result || null); setError(null); })
      .catch((err) => { if (!active) return; setError(normalizeApiError(err, 'Project kon niet worden geladen.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  function openCeReport() {
    window.open(`/projecten/${projectId}/ce-report`, '_blank');
  }

  const handleDeleteProject = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteProject(projectId);
      navigate('/projecten', { replace: true });
    } catch (err) {
      setError(normalizeApiError(err, 'Project kon niet worden verwijderd.'));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [projectId, navigate]);

  const actions = [
    { label: 'Nieuwe assembly', color: 'primary', icon: PanelsTopLeft, onClick: () => navigate(`/projecten/${projectId}/assemblies/nieuw`) },
    { label: 'Lassen', color: 'success', icon: Wrench, onClick: () => navigate(`/projecten/${projectId}/lassen`) },
    { label: 'Documenten', color: 'danger', icon: FolderOpen, onClick: () => navigate(`/projecten/${projectId}/documenten`) },
    { label: 'CE-dossier', color: 'warning', icon: FileText, onClick: () => navigate(`/projecten/${projectId}/ce-v2`) },
    { label: 'CE-rapport PDF', color: 'primary', icon: FileText, onClick: openCeReport },
    { label: 'Historie', color: 'neutral', icon: History, onClick: () => navigate(`/projecten/${projectId}/historie`) },
    { label: 'Inspecties', color: 'neutral', icon: ListChecks, onClick: () => navigate(`/projecten/${projectId}/lassen`) },
  ];

  return (
    <MobilePageScaffold
      title="Project overzicht"
      subtitle="Beheer assemblies, lassen, documenten, normstatus en CE-dossier."
      backTo="/projecten"
      rightSlot={<div className="mobile-header-actions"><button className="mobile-icon-button" type="button" aria-label="Project bewerken" onClick={() => navigate(`/projecten/${projectId}/bewerken`)}><Pencil size={18} /></button><button className="mobile-icon-button" type="button" aria-label="Las toevoegen" onClick={() => navigate(`/projecten/${projectId}/lassen/nieuw`)}><Plus size={18} /></button></div>}
    >
      {loading ? <div className="mobile-state-card">Laden...</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading && !error && project ? <>
        <div className="mobile-detail-card project-overview-card">
          <div className="mobile-field-row"><span>Projectnaam</span><strong>{projectTitle(project)}</strong></div>
          <div className="mobile-field-row"><span>Projectnummer</span><strong>{projectCode(project)}</strong></div>
          <div className="mobile-field-row"><span>Opdrachtgever</span><strong>{projectClient(project)}</strong></div>
          <div className="mobile-field-row"><span>Execution Class (EXC)</span><strong>{projectExecutionClass(project)}</strong></div>
        </div>
        <ProjectQualityNormCard projectId={projectId} onOpen={() => navigate(`/projecten/${projectId}/lassen`)} />
        <div className="mobile-inline-actions mobile-project-quick-actions">
          <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/assemblies/nieuw`)}><PanelsTopLeft size={16} /> Nieuwe assembly</button>
          <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/bewerken`)}><Pencil size={16} /> Project bewerken</button>
          <button type="button" className="mobile-secondary-button" onClick={openCeReport}><FileText size={16} /> CE-rapport PDF</button>
          <button type="button" className="mobile-primary-button" onClick={() => navigate(`/projecten/${projectId}/lassen/nieuw`)}><Plus size={16} /> Las toevoegen</button>
        </div>
        <div className="mobile-action-grid">{actions.map((action) => { const Icon = action.icon; return <button key={action.label} type="button" className={`mobile-action-card mobile-action-card-${action.color}`} onClick={action.onClick}><Icon size={20} /><span>{action.label}</span></button>; })}</div>
        <div className="mobile-inline-actions" style={{ marginTop: 16 }}>
          <button type="button" className="mobile-danger-button" onClick={() => setConfirmDelete(true)} disabled={deleting}>
            <Trash2 size={16} /> {deleting ? 'Verwijderen…' : 'Project verwijderen'}
          </button>
        </div>
        <ConfirmDialog
          open={confirmDelete}
          title="Project verwijderen"
          description={`Weet je zeker dat je "${project ? projectTitle(project) : 'dit project'}" wilt verwijderen? Alle gekoppelde lassen, inspecties en documenten worden ook verwijderd. Deze actie kan niet ongedaan worden gemaakt.`}
          confirmLabel="Ja, verwijder project"
          cancelLabel="Annuleren"
          danger
          onConfirm={handleDeleteProject}
          onClose={() => setConfirmDelete(false)}
        />
      </> : null}
    </MobilePageScaffold>
  );
}
