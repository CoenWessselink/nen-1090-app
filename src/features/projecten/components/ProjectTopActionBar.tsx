import { ArrowLeft, FileText, FolderPlus, Hammer, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ProjectTopActionBarProps = {
  onBack: () => void;
  onCreateProject: () => void;
  onEditProject: () => void;
  onCreateAssembly: () => void;
  onCreateWeld: () => void;
  onExportSelectionPdf?: () => void;
  exportSelectionDisabled?: boolean;
  exportSelectionLabel?: string;
};

export function ProjectTopActionBar({
  onBack,
  onCreateProject,
  onEditProject,
  onCreateAssembly,
  onCreateWeld,
  onExportSelectionPdf,
  exportSelectionDisabled = true,
  exportSelectionLabel = 'PDF export',
}: ProjectTopActionBarProps) {
  return (
    <div
      className="card project-top-actionbar"
      data-project-structure="actions"
      data-project-structure-legacy="top-actionbar"
    >
      <div className="project-top-actionbar-copy">
        <div className="project-top-actionbar-kicker">Uniforme bedieningslaag</div>
        <strong>Vaste hoofdacties op alle Project 360-tabbladen</strong>
        <div className="list-subtle">
          De knopvolgorde en uitlijning blijven op elk tabblad identiek zodat de projectflow overal hetzelfde aanvoelt.
        </div>
      </div>

      <div className="project-top-actionbar-actions">
        <Button variant="secondary" className="project-top-action" onClick={onBack}>
          <ArrowLeft size={16} /> Terug naar projecten
        </Button>
        <Button variant="secondary" className="project-top-action" onClick={onCreateProject}>
          <FolderPlus size={16} /> Nieuw project
        </Button>
        <Button variant="secondary" className="project-top-action" onClick={onEditProject}>
          <Pencil size={16} /> Wijzig project
        </Button>
        <Button variant="secondary" className="project-top-action" onClick={onCreateAssembly}>
          <Hammer size={16} /> Nieuwe assembly
        </Button>
        <Button variant="secondary" className="project-top-action" onClick={onCreateWeld}>
          <Plus size={16} /> Nieuwe las
        </Button>
        <Button
          variant="secondary"
          className="project-top-action"
          onClick={onExportSelectionPdf}
          disabled={exportSelectionDisabled || !onExportSelectionPdf}
        >
          <FileText size={16} /> {exportSelectionLabel}
        </Button>
      </div>
    </div>
  );
}
