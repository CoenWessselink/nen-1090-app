import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { ProjectContextTabs } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectWorkspaceActionBar } from '@/features/projecten/components/ProjectWorkspaceActionBar';

type ProjectTabShellProps = {
  projectId: string;
  currentTab: string;
  onCreateProject: () => void;
  onCreateAssembly: () => void;
  onCreateWeld: () => void;
  filters?: ReactNode;
  kpis?: ReactNode;
  children: ReactNode;
};

export function ProjectTabShell({
  projectId,
  currentTab,
  onCreateProject,
  onCreateAssembly,
  onCreateWeld,
  filters,
  kpis,
  children,
}: ProjectTabShellProps) {
  return (
    <div className="project-tab-shell" data-project-structure="shell">
      <ProjectContextTabs projectId={projectId} value={currentTab} />

      <ProjectWorkspaceActionBar
        onCreateProject={onCreateProject}
        onCreateAssembly={onCreateAssembly}
        onCreateWeld={onCreateWeld}
      />

      {filters ? (
        <Card className="project-tab-section project-tab-section-filters" data-project-structure="filters">
          {filters}
        </Card>
      ) : null}

      {kpis ? <div className="project-tab-kpi-grid" data-project-structure="kpis">{kpis}</div> : null}

      <div className="project-tab-content" data-project-structure="content">{children}</div>
    </div>
  );
}
