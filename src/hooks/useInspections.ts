import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveInspection, createInspection, createInspectionResult, deleteInspection, downloadInspectionAttachment, getInspectionAttachments, getInspectionAudit, getInspectionForWeld, getInspectionResults, getInspections, upsertInspectionForWeld, updateInspection, uploadInspectionAttachment } from '@/api/inspections';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';
import { useAuthStore } from '@/app/store/auth-store';

const REALTIME_STALE_TIME = 1000 * 60 * 5;

type UnknownRecord = Record<string, unknown>;

function updateWeldStatusInList(previous: unknown, weldId: string | number, status: unknown) {
  if (!previous || typeof previous !== 'object') return previous;
  const record = previous as UnknownRecord;
  const items = Array.isArray(record.items) ? record.items : null;
  if (!items) return previous;
  return {
    ...record,
    items: items.map((item) => {
      const row = item as UnknownRecord;
      return String(row.id) === String(weldId) ? { ...row, status, result: status } : item;
    }),
  };
}

function normalizeInspectionCachePayload(projectId: string | number, weldId: string | number, payload: UnknownRecord, saved?: unknown) {
  const status = payload.overall_status || payload.status || payload.result || 'conform';
  const savedRecord = saved && typeof saved === 'object' ? (saved as UnknownRecord) : {};
  return {
    ...savedRecord,
    ...payload,
    id: savedRecord.id || payload.id || `local-${weldId}`,
    project_id: savedRecord.project_id || projectId,
    weld_id: savedRecord.weld_id || weldId,
    overall_status: status,
    status,
    result: status,
  };
}

export function useInspections(params?: ListParams, enabled = true) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['inspections', params, token, user?.tenantId, user?.email], queryFn: async () => normalizeListResponse(await getInspections(params)), enabled: hasSession && enabled, staleTime: REALTIME_STALE_TIME, gcTime: REALTIME_STALE_TIME * 2 });
}

export function useWeldInspection(projectId?: string | number, weldId?: string | number) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['weld-inspection', projectId, weldId, token, user?.tenantId, user?.email], queryFn: async () => await getInspectionForWeld(String(projectId), String(weldId)), enabled: hasSession && Boolean(projectId) && Boolean(weldId), staleTime: REALTIME_STALE_TIME, gcTime: REALTIME_STALE_TIME * 2, refetchOnWindowFocus: false, refetchOnReconnect: false });
}

export function useInspectionResults(inspectionId?: string | number) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['inspection-results', inspectionId, token, user?.tenantId, user?.email], queryFn: async () => await getInspectionResults(String(inspectionId)), enabled: hasSession && Boolean(inspectionId), staleTime: REALTIME_STALE_TIME });
}

export function useInspectionAttachments(inspectionId?: string | number) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['inspection-attachments', inspectionId, token, user?.tenantId, user?.email], queryFn: async () => normalizeListResponse(await getInspectionAttachments(String(inspectionId))), enabled: hasSession && Boolean(inspectionId), staleTime: REALTIME_STALE_TIME });
}

export function useInspectionAudit(inspectionId?: string | number) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['inspection-audit', inspectionId, token, user?.tenantId, user?.email], queryFn: async () => normalizeListResponse(await getInspectionAudit(String(inspectionId))), enabled: hasSession && Boolean(inspectionId), staleTime: REALTIME_STALE_TIME });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, weldId, payload }: { projectId?: string | number; weldId: string | number; payload: Record<string, unknown> }) => await createInspection(String(projectId || ''), weldId, payload),
    onSuccess: (data, v) => {
      if (v.projectId) qc.setQueryData(['weld-inspection', String(v.projectId), v.weldId], data);
    },
  });
}

export function useUpdateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inspectionId, payload }: { inspectionId: string | number; payload: Record<string, unknown> }) => await updateInspection(inspectionId, payload),
    onSuccess: (data, v) => {
      const projectId = String((v.payload as any)?.project_id || (v.payload as any)?.projectId || '');
      const weldId = String((v.payload as any)?.weld_id || (v.payload as any)?.weldId || '');
      if (projectId && weldId) qc.setQueryData(['weld-inspection', projectId, weldId], data);
    },
  });
}

export function useDeleteInspection() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (inspectionId: string | number) => await deleteInspection(inspectionId), onSuccess: () => { qc.removeQueries({ queryKey: ['inspection-results', inspectionId] }); } });
}

export function useSaveInspectionResult() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ inspectionId, payload }: { inspectionId: string | number; payload: Record<string, unknown> }) => await createInspectionResult(inspectionId, payload), onSuccess: (data, v) => { qc.setQueryData(['inspection-results', v.inspectionId], data); } });
}

export function useApproveInspection() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (inspectionId: string | number) => await approveInspection(inspectionId), onSuccess: (_d, inspectionId) => { qc.setQueryData(['inspection-results', inspectionId], (old: unknown) => old); } });
}

export function useUploadInspectionAttachment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ inspectionId, formData }: { inspectionId: string | number; formData: FormData }) => await uploadInspectionAttachment(inspectionId, formData), onSuccess: (data, v) => { qc.setQueryData(['inspection-attachments', v.inspectionId], normalizeListResponse(data)); } });
}

export function useDownloadInspectionAttachment() {
  return useMutation({ mutationFn: async ({ inspectionId, attachmentId }: { inspectionId: string | number; attachmentId: string | number }) => await downloadInspectionAttachment(inspectionId, attachmentId) });
}

export function useUpsertWeldInspection(projectId: string | number, weldId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => await upsertInspectionForWeld(projectId, weldId, payload as never),
    onMutate: async (payload) => {
      const cached = normalizeInspectionCachePayload(projectId, weldId, payload);
      qc.setQueryData(['weld-inspection', projectId, weldId], cached);
      qc.setQueriesData({ queryKey: ['project-welds', projectId] }, (previous) => updateWeldStatusInList(previous, weldId, cached.status));
      return { cached };
    },
    onSuccess: (data, payload) => {
      const cached = normalizeInspectionCachePayload(projectId, weldId, payload, data);
      qc.setQueryData(['weld-inspection', projectId, weldId], cached);
      qc.setQueriesData({ queryKey: ['project-welds', projectId] }, (previous) => updateWeldStatusInList(previous, weldId, cached.status));
      qc.setQueriesData({ queryKey: ['welds'] }, (previous) => updateWeldStatusInList(previous, weldId, cached.status));
    },
  });
}
