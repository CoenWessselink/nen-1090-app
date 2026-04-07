import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { ProjectContextTabs } from '@/features/projecten/components/ProjectContextTabs';
import { ProjectTopActionBar } from '@/features/projecten/components/ProjectTopActionBar';

type ProjectTabShellProps = {
  projectId: string;
  currentTab: string;
  onBack: () => void;
  onCreateProject: () => void;
  onEditProject: () => void;
  onCreateAssembly: () => void;
  onCreateWeld: () => void;
  onExportSelectionPdf?: () => void;
  exportSelectionDisabled?: boolean;
  exportSelectionLabel?: string;
  filters?: ReactNode;
  kpis?: ReactNode;
  children: ReactNode;
};

export function ProjectTabShell({
  projectId,
  currentTab,
  onBack,
  onCreateProject,
  onEditProject,
  onCreateAssembly,
  onCreateWeld,
  onExportSelectionPdf,
  exportSelectionDisabled,
  exportSelectionLabel,
  filters,
  kpis,
  children,
}: ProjectTabShellProps) {
  return (
    <div className="project-tab-shell" data-project-structure="shell">
      <ProjectContextTabs projectId={projectId} value={currentTab} />

      <ProjectTopActionBar
        onBack={onBack}
        onCreateProject={onCreateProject}
        onEditProject={onEditProject}
        onCreateAssembly={onCreateAssembly}
        onCreateWeld={onCreateWeld}
        onExportSelectionPdf={onExportSelectionPdf}
        exportSelectionDisabled={exportSelectionDisabled}
        exportSelectionLabel={exportSelectionLabel}
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
