import type { ReactNode } from 'react';

export function DataTableToolbar({ left, center, right }: { left?: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <div className="table-toolbar">
      <div className="table-toolbar-left">{left}</div>
      <div className="table-toolbar-center">{center}</div>
      <div className="table-toolbar-right">{right}</div>
    </div>
  );
}
