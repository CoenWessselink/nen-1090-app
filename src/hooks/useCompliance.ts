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
import { useAuthStore } from '@/app/store/auth-store';
import { invalidateProjectCeCompliance } from '@/utils/queryInvalidation';

const COMPLIANCE_STALE_TIME = 60_000;

function useComplianceSessionKey() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const token = useAuthStore((s) => s.token);
  return { tenantId, token };
}

export function useComplianceOverview(projectId?: string | number) {
  const { tenantId, token } = useComplianceSessionKey();
  return useQuery({
    queryKey: ['compliance-overview', projectId, tenantId, token],
    queryFn: () => getComplianceOverview(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useComplianceMissingItems(projectId?: string | number) {
  const { tenantId, token } = useComplianceSessionKey();
  return useQuery({
    queryKey: ['compliance-missing', projectId, tenantId, token],
    queryFn: () => getComplianceMissingItems(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useComplianceChecklist(projectId?: string | number) {
  const { tenantId, token } = useComplianceSessionKey();
  return useQuery({
    queryKey: ['compliance-checklist', projectId, tenantId, token],
    queryFn: () => getComplianceChecklist(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useCeDossier(projectId?: string | number) {
  const { tenantId, token } = useComplianceSessionKey();
  return useQuery({
    queryKey: ['ce-dossier', projectId, tenantId, token],
    queryFn: () => getCeDossier(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
    refetchOnReconnect: true,
  });
}

export function useProjectExports(projectId?: string | number) {
  const { tenantId, token } = useComplianceSessionKey();
  return useQuery({
    queryKey: ['project-exports', projectId, tenantId, token],
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
      await qc.invalidateQueries({ queryKey: ['project-exports', projectId] });
      invalidateProjectCeCompliance(qc, projectId);
    },
  });
}

export function useProjectExportPreview(projectId?: string | number) {
  const { tenantId, token } = useComplianceSessionKey();
  return useQuery({
    queryKey: ['project-export-preview', projectId, tenantId, token],
    queryFn: () => getProjectExportPreview(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: COMPLIANCE_STALE_TIME,
  });
}

export function useProjectExportManifest(projectId?: string | number, exportId?: string | number) {
  const { tenantId, token } = useComplianceSessionKey();
  return useQuery({
    queryKey: ['project-export-manifest', projectId, exportId, tenantId, token],
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
      invalidateProjectCeCompliance(qc, projectId);
    },
  });
}

export function useCreateZipExport(projectId: string | number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => createZipExport(projectId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-exports', projectId] });
      invalidateProjectCeCompliance(qc, projectId);
    },
  });
}

export function useCreateExcelExport(projectId: string | number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => createExcelExport(projectId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-exports', projectId] });
      invalidateProjectCeCompliance(qc, projectId);
    },
  });
}

export function useRetryProjectExport(projectId: string | number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (exportId: string | number) => retryProjectExport(projectId, exportId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-exports', projectId] });
      invalidateProjectCeCompliance(qc, projectId);
    },
  });
}

export function useDownloadProjectExport(projectId: string | number) {
  return useMutation({
    mutationFn: (exportId: string | number) => downloadProjectExport(projectId, exportId),
  });
}
