import { useQuery } from '@tanstack/react-query';
import { getCeDossier, getComplianceChecklist, getComplianceMissingItems, getComplianceOverview } from '@/api/ce';

export function useComplianceOverview(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-overview', projectId],
    queryFn: () => getComplianceOverview(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useComplianceMissingItems(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-missing', projectId],
    queryFn: () => getComplianceMissingItems(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useComplianceChecklist(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-checklist', projectId],
    queryFn: () => getComplianceChecklist(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useCeDossier(projectId?: string | number) {
  return useQuery({
    queryKey: ['ce-dossier', projectId],
    queryFn: () => getCeDossier(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useProjectExports(_projectId?: string | number) {
  return useQuery({
    queryKey: ['project-exports-disabled'],
    queryFn: async () => ({ items: [], total: 0, page: 1, pageSize: 25 }),
    staleTime: 30_000,
  });
}

export function useCreateCeReport(_projectId: string | number) {
  return { mutateAsync: async () => { throw new Error('Niet ondersteund door live API.'); }, isPending: false } as const;
}
export function useCreateZipExport(_projectId: string | number) {
  return { mutateAsync: async () => { throw new Error('Niet ondersteund door live API.'); }, isPending: false } as const;
}
export function useCreatePdfExport(_projectId: string | number) {
  return { mutateAsync: async () => { throw new Error('Niet ondersteund door live API.'); }, isPending: false } as const;
}
export function useCreateExcelExport(_projectId: string | number) {
  return { mutateAsync: async () => { throw new Error('Niet ondersteund door live API.'); }, isPending: false } as const;
}
export function useDownloadProjectExport(_projectId: string | number) {
  return { mutateAsync: async () => { throw new Error('Niet ondersteund door live API.'); }, isPending: false } as const;
}
export function useRetryProjectExport(_projectId: string | number) {
  return { mutateAsync: async () => { throw new Error('Niet ondersteund door live API.'); }, isPending: false } as const;
}
export function useProjectExportPreview(projectId?: string | number) {
  return useCeDossier(projectId);
}
export function useProjectExportManifest(projectId?: string | number) {
  return useCeDossier(projectId);
}
