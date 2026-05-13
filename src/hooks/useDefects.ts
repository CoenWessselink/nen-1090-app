import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDefect, deleteDefect, getDefects, reopenDefect, resolveDefect, updateDefect } from '@/api/defects';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';
import { useAuthStore } from '@/app/store/auth-store';
import { invalidateProjectCeCompliance } from '@/utils/queryInvalidation';

export function useDefects(params?: ListParams, enabled = true) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['defects', params, token, user?.tenantId, user?.email], queryFn: async () => normalizeListResponse(await getDefects(params)), enabled: hasSession && enabled, staleTime: 1000 * 30 });
}
export function useCreateDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      weldId,
      payload,
    }: {
      projectId: string | number;
      weldId: string | number;
      payload: Record<string, unknown>;
    }) => await createDefect(projectId, weldId, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['defects'] });
      invalidateProjectCeCompliance(queryClient, variables.projectId);
    },
  });
}
function projectIdFromDefectPayload(data: unknown): string | number | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const row = data as Record<string, unknown>;
  const pid = row.project_id;
  if (pid === undefined || pid === null || pid === '') return undefined;
  return pid as string | number;
}

export function useUpdateDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ defectId, payload }: { defectId: string | number; payload: Record<string, unknown> }) =>
      await updateDefect(defectId, payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['defects'] });
      const pid = projectIdFromDefectPayload(data);
      if (pid !== undefined) invalidateProjectCeCompliance(queryClient, pid);
    },
  });
}

export function useResolveDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (defectId: string | number) => await resolveDefect(defectId),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['defects'] });
      const pid = projectIdFromDefectPayload(data);
      if (pid !== undefined) invalidateProjectCeCompliance(queryClient, pid);
    },
  });
}

export function useReopenDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (defectId: string | number) => await reopenDefect(defectId),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['defects'] });
      const pid = projectIdFromDefectPayload(data);
      if (pid !== undefined) invalidateProjectCeCompliance(queryClient, pid);
    },
  });
}

export function useDeleteDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (defectId: string | number) => await deleteDefect(defectId),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['defects'] });
      const pid = projectIdFromDefectPayload(data);
      if (pid !== undefined) invalidateProjectCeCompliance(queryClient, pid);
    },
  });
}
