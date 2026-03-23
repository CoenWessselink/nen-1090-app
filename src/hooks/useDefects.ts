import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDefect, deleteDefect, getDefects, reopenDefect, resolveDefect, updateDefect } from '@/api/defects';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useDefects(params?: ListParams) {
  return useQuery({
    queryKey: ['defects', params],
    queryFn: async () => normalizeListResponse(await getDefects(params)),
  });
}

export function useCreateDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, weldId, payload }: { projectId: string | number; weldId: string | number; payload: Record<string, unknown> }) => createDefect(projectId, weldId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects'] }),
  });
}

export function useUpdateDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ defectId, payload }: { defectId: string | number; payload: Record<string, unknown> }) => updateDefect(defectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects'] }),
  });
}

export function useResolveDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (defectId: string | number) => resolveDefect(defectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects'] }),
  });
}

export function useReopenDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (defectId: string | number) => reopenDefect(defectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects'] }),
  });
}

export function useDeleteDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (defectId: string | number) => deleteDefect(defectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects'] }),
  });
}
