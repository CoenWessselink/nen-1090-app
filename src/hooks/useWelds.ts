import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkApproveWelds,
  conformWeld,
  copyWeld,
  createWeld,
  deleteWeld,
  getWeld,
  getWeldAttachments,
  getWeldCompliance,
  getWeldDefects,
  getWeldInspections,
  getWelds,
  resetWeldToNorm,
  updateWeld,
  uploadWeldAttachment,
} from '@/api/welds';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';
import type { WeldFormValues } from '@/types/forms';
import { useAuthStore } from '@/app/store/auth-store';

export function useWelds(params?: ListParams, enabled = true) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasSession = Boolean(token || user);

  return useQuery({
    queryKey: ['welds', params, token, user?.tenantId, user?.email],
    queryFn: async () => normalizeListResponse(await getWelds(params)),
    enabled: hasSession && enabled,
    staleTime: 1000 * 30,
  });
}

export function useWeld(projectId?: string | number, weldId?: string | number) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasSession = Boolean(token || user);

  return useQuery({
    queryKey: ['weld', projectId, weldId, token, user?.tenantId, user?.email],
    queryFn: () => getWeld(String(projectId), String(weldId)),
    enabled: hasSession && Boolean(projectId) && Boolean(weldId),
    staleTime: 1000 * 30,
  });
}

export function useWeldInspections(projectId?: string | number, weldId?: string | number) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasSession = Boolean(token || user);

  return useQuery({
    queryKey: ['weld-inspections', projectId, weldId, token, user?.tenantId, user?.email],
    queryFn: async () => normalizeListResponse(await getWeldInspections(String(projectId), String(weldId))),
    enabled: hasSession && Boolean(projectId) && Boolean(weldId),
    staleTime: 1000 * 30,
  });
}

export function useWeldDefects(projectId?: string | number, weldId?: string | number) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasSession = Boolean(token || user);

  return useQuery({
    queryKey: ['weld-defects', projectId, weldId, token, user?.tenantId, user?.email],
    queryFn: async () => normalizeListResponse(await getWeldDefects(String(projectId), String(weldId))),
    enabled: hasSession && Boolean(projectId) && Boolean(weldId),
    staleTime: 1000 * 30,
  });
}

export function useWeldAttachments(projectId?: string | number, weldId?: string | number) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasSession = Boolean(token || user);

  return useQuery({
    queryKey: ['weld-attachments', projectId, weldId, token, user?.tenantId, user?.email],
    queryFn: async () => normalizeListResponse(await getWeldAttachments(String(projectId), String(weldId))),
    enabled: hasSession && Boolean(projectId) && Boolean(weldId),
    staleTime: 1000 * 30,
  });
}

export function useWeldCompliance(projectId?: string | number, weldId?: string | number) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasSession = Boolean(token || user);

  return useQuery({
    queryKey: ['weld-compliance', projectId, weldId, token, user?.tenantId, user?.email],
    queryFn: () => getWeldCompliance(String(projectId), String(weldId)),
    enabled: hasSession && Boolean(projectId) && Boolean(weldId),
    staleTime: 1000 * 30,
  });
}

export function useCreateWeld() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WeldFormValues) => createWeld(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds'] });
    },
  });
}

export function useCopyWeld(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weldId, weldNumber }: { weldId: string | number; weldNumber?: string }) =>
      copyWeld(projectId, weldId, weldNumber),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds', projectId] });
      queryClient.invalidateQueries({ queryKey: ['weld', projectId, variables.weldId] });
    },
  });
}

export function useUpdateWeld(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weldId, payload }: { weldId: string | number; payload: WeldFormValues }) =>
      updateWeld(projectId, weldId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds', projectId] });
      queryClient.invalidateQueries({ queryKey: ['weld', projectId, variables.weldId] });
    },
  });
}

export function useDeleteWeld(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weldId: string | number) => deleteWeld(projectId, weldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds', projectId] });
    },
  });
}

export function useResetWeldToNorm(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weldId: string | number) => resetWeldToNorm(projectId, weldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds', projectId] });
    },
  });
}

export function useConformWeld(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weldId: string | number) => conformWeld(projectId, weldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds', projectId] });
    },
  });
}

export function useUploadWeldAttachment(projectId: string | number, weldId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormData) => uploadWeldAttachment(projectId, weldId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weld-attachments', projectId, weldId] }),
  });
}

export function useBulkApproveWelds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, weldIds }: { projectId: string | number; weldIds: Array<string | number> }) =>
      bulkApproveWelds(projectId, weldIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds'] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}
