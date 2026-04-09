import React from 'react';
import { Drawer } from '@/components/overlays/Drawer';
import { Badge } from '@/components/ui/Badge';
import type { Project } from '@/types/domain';

function tone() {
  return 'warning' as const;
}

export function Project360Drawer({
  project,
  open,
  onClose,
}: {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onMessage: (message: string) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Project 360°">
      {project ? (
        <div>
          <h3>{String(project.name || project.projectnummer || project.id)}</h3>
          <Badge tone={tone()}>{String(project.status || 'Onbekend')}</Badge>
        </div>
      ) : null}
    </Drawer>
  );
}
