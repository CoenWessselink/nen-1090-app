import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveInspection, createInspection, createInspectionResult, deleteInspection, downloadInspectionAttachment, getInspectionAttachments, getInspectionAudit, getInspectionForWeld, getInspectionResults, getInspections, upsertInspectionForWeld, updateInspection, uploadInspectionAttachment } from '@/api/inspections';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';
import { useAuthStore } from '@/app/store/auth-store';

const REALTIME_STALE_TIME = 1000 * 60 * 10;
const WELD_INSPECTION_STALE_TIME = 1000 * 5;

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
    checks: Array.isArray(savedRecord.checks) ? savedRecord.checks : payload.checks,
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
  return useQuery({ queryKey: ['weld-inspection', projectId, weldId, token, user?.tenantId, user?.email], queryFn: async () => await getInspectionForWeld(String(projectId), String(weldId)), enabled: hasSession && Boolean(projectId) && Boolean(weldId), staleTime: WELD_INSPECTION_STALE_TIME, refetchOnWindowFocus: true, refetchOnReconnect: true });
}

export function useUpsertWeldInspection(projectId: string | number, weldId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => await upsertInspectionForWeld(projectId, weldId, payload as never),
    onMutate: async (payload) => {
      const cached = normalizeInspectionCachePayload(projectId, weldId, payload);
      qc.setQueryData(['weld-inspection', projectId, weldId], cached);
      qc.setQueriesData({ queryKey: ['project-welds', projectId] }, (previous) => updateWeldStatusInList(previous, weldId, cached.status));
      qc.setQueriesData({ queryKey: ['welds'] }, (previous) => updateWeldStatusInList(previous, weldId, cached.status));
      return { cached };
    },
    onSuccess: async (data, payload) => {
      const cached = normalizeInspectionCachePayload(projectId, weldId, payload, data);
      qc.setQueryData(['weld-inspection', projectId, weldId], cached);
      qc.setQueriesData({ queryKey: ['project-welds', projectId] }, (previous) => updateWeldStatusInList(previous, weldId, cached.status));
      qc.setQueriesData({ queryKey: ['welds'] }, (previous) => updateWeldStatusInList(previous, weldId, cached.status));
      await qc.invalidateQueries({ queryKey: ['weld-inspection', projectId, weldId] });
      await qc.refetchQueries({ queryKey: ['weld-inspection', projectId, weldId], type: 'active' });
      await qc.invalidateQueries({ queryKey: ['project-welds', projectId] });
      await qc.refetchQueries({ queryKey: ['project-welds', projectId], type: 'active' });
    },
  });
}

export function useUploadInspectionAttachment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ inspectionId, formData }: { inspectionId: string | number; formData: FormData }) => await uploadInspectionAttachment(inspectionId, formData), onSuccess: (data, v) => { qc.setQueryData(['inspection-attachments', v.inspectionId], normalizeListResponse(data)); } });
}

export function useDownloadInspectionAttachment() {
  return useMutation({ mutationFn: async ({ inspectionId, attachmentId }: { inspectionId: string | number; attachmentId: string | number }) => await downloadInspectionAttachment(inspectionId, attachmentId) });
}
