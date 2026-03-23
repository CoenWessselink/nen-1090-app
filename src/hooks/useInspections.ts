import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveInspection, createInspection, createInspectionResult, deleteInspection, downloadInspectionAttachment, getInspectionAttachments, getInspectionAudit, getInspectionResults, getInspections, updateInspection, uploadInspectionAttachment } from '@/api/inspections';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useInspections(params?: ListParams, enabled = true) {
  return useQuery({
    queryKey: ['inspections', params],
    queryFn: async () => normalizeListResponse(await getInspections(params)),
    enabled,
  });
}

export function useInspectionResults(inspectionId?: string | number) {
  return useQuery({
    queryKey: ['inspection-results', inspectionId],
    queryFn: () => getInspectionResults(String(inspectionId)),
    enabled: Boolean(inspectionId),
  });
}

export function useInspectionAttachments(inspectionId?: string | number) {
  return useQuery({
    queryKey: ['inspection-attachments', inspectionId],
    queryFn: async () => normalizeListResponse(await getInspectionAttachments(String(inspectionId))),
    enabled: Boolean(inspectionId),
  });
}

export function useInspectionAudit(inspectionId?: string | number) {
  return useQuery({
    queryKey: ['inspection-audit', inspectionId],
    queryFn: async () => normalizeListResponse(await getInspectionAudit(String(inspectionId))),
    enabled: Boolean(inspectionId),
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, weldId, payload }: { projectId?: string | number; weldId: string | number; payload: Record<string, unknown> }) => createInspection(String(projectId || ''), weldId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, payload }: { inspectionId: string | number; payload: Record<string, unknown> }) => updateInspection(inspectionId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-results', vars.inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspection-audit', vars.inspectionId] });
    },
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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-results', vars.inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspection-audit', vars.inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}

export function useApproveInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: string | number) => approveInspection(inspectionId),
    onSuccess: (_data, inspectionId) => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-results', inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspection-audit', inspectionId] });
    },
  });
}

export function useUploadInspectionAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, formData }: { inspectionId: string | number; formData: FormData }) => uploadInspectionAttachment(inspectionId, formData),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-results', vars.inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspection-attachments', vars.inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspection-audit', vars.inspectionId] });
    },
  });
}

export function useDownloadInspectionAttachment() {
  return useMutation({
    mutationFn: ({ inspectionId, attachmentId }: { inspectionId: string | number; attachmentId: string | number }) => downloadInspectionAttachment(inspectionId, attachmentId),
  });
}
