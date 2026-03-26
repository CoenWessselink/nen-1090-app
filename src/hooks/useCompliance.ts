import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createCeReport,
  createExcelExport,
  createPdfExport,
  createZipExport,
  downloadProjectExport,
  getCeDossier,
  getComplianceChecklist,
  getComplianceMissingItems,
  getComplianceOverview,
  getProjectExportManifest,
  getProjectExportPreview,
  getProjectExports,
  retryProjectExport,
} from '@/api/ce';

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

export function useProjectExports(projectId?: string | number) {
  return useQuery({
    queryKey: ['project-exports', projectId],
    queryFn: async () => getProjectExports(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useCreateCeReport(projectId: string | number) {
  return useMutation({ mutationFn: () => createCeReport(projectId) });
}
export function useCreateZipExport(projectId: string | number) {
  return useMutation({ mutationFn: () => createZipExport(projectId) });
}
export function useCreatePdfExport(projectId: string | number) {
  return useMutation({ mutationFn: () => createPdfExport(projectId) });
}
export function useCreateExcelExport(projectId: string | number) {
  return useMutation({ mutationFn: () => createExcelExport(projectId) });
}
export function useDownloadProjectExport(projectId: string | number) {
  return useMutation({ mutationFn: (exportId: string | number) => downloadProjectExport(projectId, exportId) });
}
export function useRetryProjectExport(projectId: string | number) {
  return useMutation({ mutationFn: (exportId: string | number) => retryProjectExport(projectId, exportId) });
}
export function useProjectExportPreview(projectId?: string | number) {
  return useQuery({
    queryKey: ['project-export-preview', projectId],
    queryFn: () => getProjectExportPreview(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}
export function useProjectExportManifest(projectId?: string | number, exportId?: string | number) {
  return useQuery({
    queryKey: ['project-export-manifest', projectId, exportId],
    queryFn: () => getProjectExportManifest(String(projectId), String(exportId)),
    enabled: Boolean(projectId && exportId),
    staleTime: 30_000,
  });
}
