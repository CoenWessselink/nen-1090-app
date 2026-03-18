import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addProjectMaterials,
  addProjectWelders,
  addProjectWps,
  applyProjectInspectionTemplate,
  approveAllProject,
  createProject,
  deleteProject,
  getProject,
  getProjectAssemblies,
  getProjectInspections,
  getProjects,
  getProjectWelds,
  updateProject,
} from '@/api/projects';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';
import type { ProjectFormValues } from '@/types/forms';

export function useProjects(params?: ListParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => normalizeListResponse(await getProjects(params)),
  });
}

export function useProject(projectId?: string | number) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(String(projectId)),
    enabled: Boolean(projectId),
  });
}

export function useProjectAssemblies(projectId?: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['project-assemblies', projectId, params],
    queryFn: async () => normalizeListResponse(await getProjectAssemblies(String(projectId), params)),
    enabled: Boolean(projectId),
  });
}

export function useProjectWelds(projectId?: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['project-welds', projectId, params],
    queryFn: async () => normalizeListResponse(await getProjectWelds(String(projectId), params)),
    enabled: Boolean(projectId),
  });
}

export function useProjectInspections(projectId?: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['project-inspections', projectId, params],
    queryFn: async () => normalizeListResponse(await getProjectInspections(String(projectId), params)),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectFormValues) => createProject(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: ProjectFormValues }) => updateProject(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}

const bulkActionMap = {
  approve: approveAllProject,
  template: applyProjectInspectionTemplate,
  materials: addProjectMaterials,
  wps: addProjectWps,
  welders: addProjectWelders,
} as const;

export function useProjectBulkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, projectIds }: { action: keyof typeof bulkActionMap; projectIds: Array<string | number> }) => {
      for (const projectId of projectIds) {
        await bulkActionMap[action](projectId);
      }
      return { count: projectIds.length, action };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-inspections'] });
    },
  });
}
