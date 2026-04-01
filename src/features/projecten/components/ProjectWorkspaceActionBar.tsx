import { FolderPlus, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ProjectWorkspaceActionBar({
  onCreateProject,
  onCreateAssembly,
  onCreateWeld,
}: {
  onCreateProject: () => void;
  onCreateAssembly: () => void;
  onCreateWeld: () => void;
}) {
  return (
    <div className="card project-workspace-actionbar" data-project-structure="actions">
      <div className="project-workspace-actionbar-copy">
        <div className="project-workspace-actionbar-kicker">
          <Sparkles size={14} />
          <span>Actiebalk</span>
        </div>
        <strong>Vaste hoofdacties op elk projecttabblad</strong>
        <div className="list-subtle">
          Nieuwe items blijven overal op dezelfde plek zichtbaar zodat de projectflow rustig en voorspelbaar blijft.
        </div>
      </div>
      <div className="project-workspace-actionbar-actions">
        <Button variant="secondary" className="project-workspace-action" onClick={onCreateProject}>
          <FolderPlus size={16} /> Nieuw project
        </Button>
        <Button variant="secondary" className="project-workspace-action" onClick={onCreateAssembly}>
          <Plus size={16} /> Nieuwe assembly
        </Button>
        <Button variant="secondary" className="project-workspace-action" onClick={onCreateWeld}>
          <Plus size={16} /> Nieuwe las
        </Button>
      </div>
    </div>
  );
}
