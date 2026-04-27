import type { ReactNode } from 'react';

export function DataTableFilters({ children }: { children: ReactNode }) {
  return <div className="datatable-filters">{children}</div>;
}
