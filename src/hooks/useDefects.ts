import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDefect, deleteDefect, getDefects, reopenDefect, resolveDefect, updateDefect } from '@/api/defects';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';
import { useAuthStore } from '@/app/store/auth-store';

export function useDefects(params?: ListParams, enabled = true) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasSession = Boolean(token || user);
  return useQuery({ queryKey: ['defects', params, token, user?.tenantId, user?.email], queryFn: async () => normalizeListResponse(await getDefects(params)), enabled: hasSession && enabled, staleTime: 1000 * 30 });
}
export function useCreateDefect() { const queryClient = useQueryClient(); return useMutation({ mutationFn: async ({ projectId, weldId, payload }: { projectId: string | number; weldId: string | number; payload: Record<string, unknown> }) => await createDefect(projectId, weldId, payload), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['defects'] }); } }); }
export function useUpdateDefect() { const queryClient = useQueryClient(); return useMutation({ mutationFn: async ({ defectId, payload }: { defectId: string | number; payload: Record<string, unknown> }) => await updateDefect(defectId, payload), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['defects'] }); } }); }
export function useResolveDefect() { const queryClient = useQueryClient(); return useMutation({ mutationFn: async (defectId: string | number) => await resolveDefect(defectId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['defects'] }); } }); }
export function useReopenDefect() { const queryClient = useQueryClient(); return useMutation({ mutationFn: async (defectId: string | number) => await reopenDefect(defectId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['defects'] }); } }); }
export function useDeleteDefect() { const queryClient = useQueryClient(); return useMutation({ mutationFn: async (defectId: string | number) => await deleteDefect(defectId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['defects'] }); } }); }
