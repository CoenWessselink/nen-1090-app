import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const COMPLIANCE_STALE_TIME = 60_000;

export function useComplianceOverview(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-overview', projectId],
    queryFn: () => getComplianceOverview(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useComplianceMissingItems(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-missing', projectId],
    queryFn: () => getComplianceMissingItems(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useComplianceChecklist(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-checklist', projectId],
    queryFn: () => getComplianceChecklist(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useCeDossier(projectId?: string | number) {
  return useQuery({
    queryKey: ['ce-dossier', projectId],
    queryFn: () => getCeDossier(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useProjectExports(projectId?: string | number) {
  return useQuery({
    queryKey: ['project-exports', projectId],
    queryFn: async () => getProjectExports(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useCreateCeReport(projectId: string | number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => createCeReport(projectId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['project-exports', projectId] }),
        qc.invalidateQueries({ queryKey: ['project-export-preview', projectId] }),
        qc.invalidateQueries({ queryKey: ['ce-dossier', projectId] }),
      ]);
    },
  });
}

export function useProjectExportPreview(projectId?: string | number) {
  return useQuery({
    queryKey: ['project-export-preview', projectId],
    queryFn: () => getProjectExportPreview(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
  });
}

export function useProjectExportManifest(projectId?: string | number, exportId?: string | number) {
  return useQuery({
    queryKey: ['project-export-manifest', projectId, exportId],
    queryFn: () => getProjectExportManifest(String(projectId), String(exportId)),
    enabled: Boolean(projectId && exportId),
    staleTime: COMPLIANCE_STALE_TIME,
  });
}

export function useCreatePdfExport(projectId: string | number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => createPdfExport(projectId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-exports', projectId] });
    },
  });
}

export function useCreateZipExport(projectId: string | number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => createZipExport(projectId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-exports', projectId] });
    },
  });
}

export function useCreateExcelExport(projectId: string | number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => createExcelExport(projectId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-exports', projectId] });
    },
  });
}

export function useRetryProjectExport(projectId: string | number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (exportId: string | number) => retryProjectExport(projectId, exportId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-exports', projectId] });
    },
  });
}

export function useDownloadProjectExport(projectId: string | number) {
  return useMutation({
    mutationFn: (exportId: string | number) => downloadProjectExport(projectId, exportId),
  });
}
