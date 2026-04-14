import { useEffect, useMemo, useState } from 'react';
import { Construction, FileText, FolderOpen, History, ListChecks, PanelsTopLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject } from '@/api/projects';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { projectClient, projectCode, projectExecutionClass, projectTitle } from '@/features/mobile/mobile-utils';
import type { Project } from '@/types/domain';

export function MobileProject360Page() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProject() {
    setLoading(true);
    try {
      const result = await getProject(projectId);
      setProject(result || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Project kon niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  const actions = useMemo(
    () => [
      { label: 'Assemblies', color: 'primary', icon: PanelsTopLeft, to: `/projecten/${projectId}/assemblies` },
      { label: 'Lassen', color: 'success', icon: Construction, to: `/projecten/${projectId}/lassen` },
      { label: 'Documenten', color: 'danger', icon: FolderOpen, to: `/projecten/${projectId}/documenten` },
      { label: 'CE-Dossier', color: 'warning', icon: FileText, to: `/projecten/${projectId}/ce-dossier` },
      { label: 'Historie', color: 'neutral', icon: History, to: `/projecten/${projectId}/historie` },
      { label: 'Inspecties', color: 'neutral', icon: ListChecks, to: `/projecten/${projectId}/lassen` },
    ],
    [projectId],
  );

  return (
    <MobilePageScaffold title="Project 360" backTo="/projecten" testId="mobile-project360-page">
      {loading ? <div className="mobile-state-card" data-testid="mobile-project360-loading">Project laden…</div> : null}
      {error ? (
        <div className="mobile-state-card mobile-state-card-error" data-testid="mobile-project360-error">
          <strong>Project 360 niet beschikbaar</strong>
          <span>{error}</span>
          <button type="button" className="mobile-secondary-button" onClick={() => void loadProject()}>
            Opnieuw proberen
          </button>
        </div>
      ) : null}
      {!loading && !error && project ? (
        <>
          <div className="mobile-detail-card" data-testid="mobile-project360-summary">
            <div className="mobile-field-row"><span>Projectnaam</span><strong>{projectTitle(project)}</strong></div>
            <div className="mobile-field-row"><span>Projectnummer</span><strong>{projectCode(project)}</strong></div>
            <div className="mobile-field-row"><span>Opdrachtgever</span><strong>{projectClient(project)}</strong></div>
            <div className="mobile-field-row"><span>ExecutieKlasse</span><strong>{projectExecutionClass(project)}</strong></div>
          </div>
          <div className="mobile-action-grid" data-testid="mobile-project360-actions">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  className={`mobile-action-card mobile-action-card-${action.color}`}
                  onClick={() => navigate(action.to)}
                  data-testid={`mobile-project360-action-${action.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                >
                  <Icon size={18} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </MobilePageScaffold>
  );
}
