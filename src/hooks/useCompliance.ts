import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCeReport, createExcelExport, createPdfExport, createZipExport, getCeDossier, getComplianceChecklist, getComplianceMissingItems, getComplianceOverview, getProjectExports } from '@/api/ce';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useComplianceOverview(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-overview', projectId],
    queryFn: () => getComplianceOverview(String(projectId)),
    enabled: Boolean(projectId),
  });
}

export function useComplianceMissingItems(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-missing', projectId],
    queryFn: () => getComplianceMissingItems(String(projectId)),
    enabled: Boolean(projectId),
  });
}

export function useComplianceChecklist(projectId?: string | number) {
  return useQuery({
    queryKey: ['compliance-checklist', projectId],
    queryFn: () => getComplianceChecklist(String(projectId)),
    enabled: Boolean(projectId),
  });
}

export function useCeDossier(projectId?: string | number) {
  return useQuery({
    queryKey: ['ce-dossier', projectId],
    queryFn: () => getCeDossier(String(projectId)),
    enabled: Boolean(projectId),
  });
}

export function useProjectExports(projectId?: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['project-exports', projectId, params],
    queryFn: async () => normalizeListResponse(await getProjectExports(String(projectId), params)),
    enabled: Boolean(projectId),
  });
}

function exportMutation(projectId: string | number, action: (id: string | number) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => action(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-exports', projectId] }),
  });
}

export function useCreateCeReport(projectId: string | number) { return exportMutation(projectId, createCeReport); }
export function useCreateZipExport(projectId: string | number) { return exportMutation(projectId, createZipExport); }
export function useCreatePdfExport(projectId: string | number) { return exportMutation(projectId, createPdfExport); }
export function useCreateExcelExport(projectId: string | number) { return exportMutation(projectId, createExcelExport); }
