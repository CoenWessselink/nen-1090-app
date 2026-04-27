import type { ReactNode } from 'react';
import { FolderPlus, Hammer, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/app/store/ui-store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function ProjectWorkspaceActions({
  projectId,
  onCreateAssembly,
  onCreateWeld,
  extraActions,
}: {
  projectId: string;
  onCreateAssembly?: () => void;
  onCreateWeld?: () => void;
  extraActions?: ReactNode;
}) {
  const navigate = useNavigate();
  const requestCreateProject = useUiStore((state) => state.requestCreateProject);

  return (
    <Card className="project-action-bar">
      <div className="project-action-bar-copy">
        <strong>Actiebalk</strong>
        <div className="list-subtle">Snelle projectacties zijn op elk tabblad direct beschikbaar.</div>
      </div>

      <div className="project-action-bar-actions">
        <Button
          variant="secondary"
          onClick={() => {
            requestCreateProject();
            navigate('/projecten?intent=create-project');
          }}
        >
          <FolderPlus size={16} /> Nieuw project
        </Button>

        <Button variant="secondary" onClick={() => onCreateAssembly?.()}>
          <Hammer size={16} /> Nieuwe assembly
        </Button>

        <Button onClick={() => onCreateWeld?.()}>
          <Plus size={16} /> Nieuwe las
        </Button>

        {extraActions}
      </div>
    </Card>
  );
}
