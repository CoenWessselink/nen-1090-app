import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveInspection, createInspection, createInspectionResult, deleteInspection, getInspectionResults, getInspections, updateInspection, uploadInspectionAttachment } from '@/api/inspections';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useInspections(params?: ListParams) {
  return useQuery({
    queryKey: ['inspections', params],
    queryFn: async () => normalizeListResponse(await getInspections(params)),
  });
}

export function useInspectionResults(inspectionId?: string | number) {
  return useQuery({
    queryKey: ['inspection-results', inspectionId],
    queryFn: () => getInspectionResults(String(inspectionId)),
    enabled: Boolean(inspectionId),
  });
}

export function useCreateInspection(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weldId, payload }: { weldId: string | number; payload: Record<string, unknown> }) => createInspection(projectId, weldId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, payload }: { inspectionId: string | number; payload: Record<string, unknown> }) => updateInspection(inspectionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: string | number) => deleteInspection(inspectionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useSaveInspectionResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, payload }: { inspectionId: string | number; payload: Record<string, unknown> }) => createInspectionResult(inspectionId, payload),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['inspection-results', vars.inspectionId] }),
  });
}

export function useApproveInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: string | number) => approveInspection(inspectionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useUploadInspectionAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, formData }: { inspectionId: string | number; formData: FormData }) => uploadInspectionAttachment(inspectionId, formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspections'] }),
  });
}
