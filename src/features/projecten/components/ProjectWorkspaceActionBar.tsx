import { Plus } from 'lucide-react';
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
    <div className="card project-workspace-actionbar">
      <div className="project-workspace-actionbar-copy">
        <strong>Actiebalk</strong>
        <div className="list-subtle">Dezelfde hoofdacties blijven op ieder projecttabblad bovenaan beschikbaar.</div>
      </div>
      <div className="project-workspace-actionbar-actions">
        <Button variant="secondary" onClick={onCreateProject}><Plus size={16} /> Nieuw project</Button>
        <Button variant="secondary" onClick={onCreateAssembly}><Plus size={16} /> Nieuwe assembly</Button>
        <Button onClick={onCreateWeld}><Plus size={16} /> Nieuwe las</Button>
      </div>
    </div>
  );
}
