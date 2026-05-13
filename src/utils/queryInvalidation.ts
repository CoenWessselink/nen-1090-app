import type { QueryClient } from '@tanstack/react-query';

/** React Query keys touched by project-scoped CE / export runtime reads. */
export function invalidateProjectCeCompliance(qc: QueryClient, projectId: string | number) {
  const id = String(projectId);
  void qc.invalidateQueries({ queryKey: ['compliance-overview', id] });
  void qc.invalidateQueries({ queryKey: ['compliance-missing', id] });
  void qc.invalidateQueries({ queryKey: ['compliance-checklist', id] });
  void qc.invalidateQueries({ queryKey: ['ce-dossier', id] });
  void qc.invalidateQueries({ queryKey: ['project-export-preview', id] });
}
