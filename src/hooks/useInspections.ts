import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveInspection, createInspection, createInspectionResult, deleteInspection, downloadInspectionAttachment, getInspectionAttachments, getInspectionAudit, getInspectionForWeld, getInspectionResults, getInspections, upsertInspectionForWeld, updateInspection, uploadInspectionAttachment } from '@/api/inspections';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';
import { useAuthStore } from '@/app/store/auth-store';

export function useInspections(params?: ListParams, enabled = true) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['inspections', params, token, user?.tenantId, user?.email], queryFn: async () => normalizeListResponse(await getInspections(params)), enabled: hasSession && enabled, staleTime: 1000 * 30 });
}

export function useWeldInspection(projectId?: string | number, weldId?: string | number) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['weld-inspection', projectId, weldId, token, user?.tenantId, user?.email], queryFn: async () => await getInspectionForWeld(String(projectId), String(weldId)), enabled: hasSession && Boolean(projectId) && Boolean(weldId), staleTime: 1000 * 30 });
}

export function useInspectionResults(inspectionId?: string | number) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['inspection-results', inspectionId, token, user?.tenantId, user?.email], queryFn: async () => await getInspectionResults(String(inspectionId)), enabled: hasSession && Boolean(inspectionId), staleTime: 1000 * 30 });
}
export function useInspectionAttachments(inspectionId?: string | number) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['inspection-attachments', inspectionId, token, user?.tenantId, user?.email], queryFn: async () => normalizeListResponse(await getInspectionAttachments(String(inspectionId))), enabled: hasSession && Boolean(inspectionId), staleTime: 1000 * 30 });
}
export function useInspectionAudit(inspectionId?: string | number) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['inspection-audit', inspectionId, token, user?.tenantId, user?.email], queryFn: async () => normalizeListResponse(await getInspectionAudit(String(inspectionId))), enabled: hasSession && Boolean(inspectionId), staleTime: 1000 * 30 });
}
export function useCreateInspection() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ projectId, weldId, payload }: { projectId?: string | number; weldId: string | number; payload: Record<string, unknown> }) => await createInspection(String(projectId || ''), weldId, payload), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['inspections'] }); } }); }
export function useUpdateInspection() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ inspectionId, payload }: { inspectionId: string | number; payload: Record<string, unknown> }) => await updateInspection(inspectionId, payload), onSuccess: async (_d, v) => { await qc.invalidateQueries({ queryKey: ['inspections'] }); await qc.invalidateQueries({ queryKey: ['inspection-results', v.inspectionId] }); await qc.invalidateQueries({ queryKey: ['inspection-audit', v.inspectionId] }); } }); }
export function useDeleteInspection() { const qc = useQueryClient(); return useMutation({ mutationFn: async (inspectionId: string | number) => await deleteInspection(inspectionId), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['inspections'] }); } }); }
export function useSaveInspectionResult() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ inspectionId, payload }: { inspectionId: string | number; payload: Record<string, unknown> }) => await createInspectionResult(inspectionId, payload), onSuccess: async (_d, v) => { await qc.invalidateQueries({ queryKey: ['inspection-results', v.inspectionId] }); await qc.invalidateQueries({ queryKey: ['inspection-audit', v.inspectionId] }); await qc.invalidateQueries({ queryKey: ['inspections'] }); } }); }
export function useApproveInspection() { const qc = useQueryClient(); return useMutation({ mutationFn: async (inspectionId: string | number) => await approveInspection(inspectionId), onSuccess: async (_d, inspectionId) => { await qc.invalidateQueries({ queryKey: ['inspections'] }); await qc.invalidateQueries({ queryKey: ['inspection-results', inspectionId] }); await qc.invalidateQueries({ queryKey: ['inspection-audit', inspectionId] }); } }); }
export function useUploadInspectionAttachment() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ inspectionId, formData }: { inspectionId: string | number; formData: FormData }) => await uploadInspectionAttachment(inspectionId, formData), onSuccess: async (_d, v) => { await qc.invalidateQueries({ queryKey: ['inspections'] }); await qc.invalidateQueries({ queryKey: ['inspection-results', v.inspectionId] }); await qc.invalidateQueries({ queryKey: ['inspection-attachments', v.inspectionId] }); await qc.invalidateQueries({ queryKey: ['inspection-audit', v.inspectionId] }); } }); }
export function useDownloadInspectionAttachment() { return useMutation({ mutationFn: async ({ inspectionId, attachmentId }: { inspectionId: string | number; attachmentId: string | number }) => await downloadInspectionAttachment(inspectionId, attachmentId) }); }


export function useUpsertWeldInspection(projectId: string | number, weldId: string | number) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (payload: Record<string, unknown>) => await upsertInspectionForWeld(projectId, weldId, payload as never), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['inspections'] }); await qc.invalidateQueries({ queryKey: ['weld-inspection', projectId, weldId] }); await qc.invalidateQueries({ queryKey: ['project-welds', projectId] }); } });
}
