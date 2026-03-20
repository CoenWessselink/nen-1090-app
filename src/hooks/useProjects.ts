import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addProjectMaterialLink,
  addProjectMaterials,
  addProjectWelderLink,
  addProjectWelders,
  addProjectWps,
  addProjectWpsLink,
  removeProjectMaterialLink,
  removeProjectWelderLink,
  removeProjectWpsLink,
  applyProjectInspectionTemplate,
  approveAllProject,
  createProject,
  deleteProject,
  getProject,
  getProjectAssemblies,
  getProjectInspections,
  getProjects,
  getProjectSelectedMaterials,
  getProjectSelectedWelders,
  getProjectSelectedWps,
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

function useProjectSelectionQuery(queryKey: string, projectId?: string | number, queryFn?: (projectId: string | number) => Promise<Record<string, unknown>[] | null>) {
  return useQuery({
    queryKey: [queryKey, projectId],
    queryFn: async () => ({ items: (await queryFn?.(String(projectId))) || [] }),
    enabled: Boolean(projectId && queryFn),
  });
}

export function useProjectMaterials(projectId?: string | number) {
  return useProjectSelectionQuery('project-materials', projectId, getProjectSelectedMaterials);
}

export function useProjectWps(projectId?: string | number) {
  return useProjectSelectionQuery('project-wps', projectId, getProjectSelectedWps);
}

export function useProjectWelders(projectId?: string | number) {
  return useProjectSelectionQuery('project-welders', projectId, getProjectSelectedWelders);
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProjectFormValues) => {
      const project = await createProject(payload);
      if (payload.inspection_template_id) await applyProjectInspectionTemplate(project.id, payload.inspection_template_id);
      if (payload.apply_materials) await addProjectMaterials(project.id);
      if (payload.apply_wps) await addProjectWps(project.id);
      if (payload.apply_welders) await addProjectWelders(project.id);
      return project;
    },
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
  template: (projectId: string | number) => applyProjectInspectionTemplate(projectId, null),
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
      queryClient.invalidateQueries({ queryKey: ['project-materials'] });
      queryClient.invalidateQueries({ queryKey: ['project-wps'] });
      queryClient.invalidateQueries({ queryKey: ['project-welders'] });
    },
  });
}


export function useProjectSelectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      projectId,
      refId,
    }: {
      action: 'add-material' | 'remove-material' | 'add-wps' | 'remove-wps' | 'add-welder' | 'remove-welder';
      projectId: string | number;
      refId: string | number;
    }) => {
      const actions = {
        'add-material': () => addProjectMaterialLink(projectId, refId),
        'remove-material': () => removeProjectMaterialLink(projectId, refId),
        'add-wps': () => addProjectWpsLink(projectId, refId),
        'remove-wps': () => removeProjectWpsLink(projectId, refId),
        'add-welder': () => addProjectWelderLink(projectId, refId),
        'remove-welder': () => removeProjectWelderLink(projectId, refId),
      } as const;
      return actions[action]();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-materials', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-wps', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-welders', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
