import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAssembly, deleteAssembly, getAssemblies, getAssembly, getAssemblyCompliance, getAssemblyDocuments, getAssemblyWelds, updateAssembly } from '@/api/assemblies';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useAssemblies(projectId: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['assemblies', projectId, params],
    queryFn: async () => normalizeListResponse(await getAssemblies(projectId, params)),
    enabled: Boolean(projectId),
  });
}

export function useAssembly(projectId: string | number, assemblyId: string | number) {
  return useQuery({
    queryKey: ['assembly', projectId, assemblyId],
    queryFn: () => getAssembly(projectId, assemblyId),
    enabled: Boolean(projectId) && Boolean(assemblyId),
  });
}

export function useAssemblyWelds(projectId: string | number, assemblyId: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['assembly-welds', projectId, assemblyId, params],
    queryFn: async () => normalizeListResponse(await getAssemblyWelds(projectId, assemblyId, params)),
    enabled: Boolean(projectId) && Boolean(assemblyId),
  });
}

export function useAssemblyDocuments(projectId: string | number, assemblyId: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['assembly-documents', projectId, assemblyId, params],
    queryFn: async () => normalizeListResponse(await getAssemblyDocuments(projectId, assemblyId, params)),
    enabled: Boolean(projectId) && Boolean(assemblyId),
  });
}

export function useAssemblyCompliance(projectId: string | number, assemblyId: string | number) {
  return useQuery({
    queryKey: ['assembly-compliance', projectId, assemblyId],
    queryFn: () => getAssemblyCompliance(projectId, assemblyId),
    enabled: Boolean(projectId) && Boolean(assemblyId),
  });
}

export function useCreateAssembly(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAssembly(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assemblies', projectId] }),
  });
}

export function useUpdateAssembly(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assemblyId, payload }: { assemblyId: string | number; payload: Record<string, unknown> }) => updateAssembly(projectId, assemblyId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assemblies', projectId] }),
  });
}

export function useDeleteAssembly(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assemblyId: string | number) => deleteAssembly(projectId, assemblyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assemblies', projectId] }),
  });
}
