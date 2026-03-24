import { Drawer } from '@/components/overlays/Drawer';
import type { Project } from '@/types/domain';

type Props = {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onMessage: (message: string) => void;
};

export function Project360Drawer({ project, open, onClose }: Props) {
  return (
    <Drawer open={open} onClose={onClose} title="Project 360°">
      {project ? (
        <div className="detail-stack">
          <h3>{String(project.name || project.omschrijving || project.projectnummer || project.id)}</h3>
          <p>Project 360° herstelbuild actief.</p>
        </div>
      ) : null}
    </Drawer>
  );
}
