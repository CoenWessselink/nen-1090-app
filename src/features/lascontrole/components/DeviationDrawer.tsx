import React from 'react';
import { Drawer } from '@/components/overlays/Drawer';
import type { Weld } from '@/types/domain';

type DrawerProps = {
  open: boolean;
  inspection: Weld | null;
  onClose: () => void;
};

export function DeviationDrawer({ open, inspection, onClose }: DrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Lasdetail & opvolging">
      {inspection ? <div>{String(inspection.weld_number || inspection.id)}</div> : null}
    </Drawer>
  );
}
