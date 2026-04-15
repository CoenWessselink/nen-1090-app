import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addProjectMaterialLink,
  addProjectMaterials,
  addProjectWelderLink,
  addProjectWelders,
  addProjectWps,
  addProjectWpsLink,
  applyProjectInspectionTemplate,
  approveAllProject,
  createProject,
  createProjectAssembly,
  deleteProject,
  getProject,
  getProjectAssemblies,
  getProjectInspections,
  getProjectSelectedMaterials,
  getProjectSelectedWelders,
  getProjectSelectedWps,
  getProjectWelds,
  getProjects,
  removeProjectMaterialLink,
  removeProjectWelderLink,
  removeProjectWpsLink,
  updateProject,
} from '@/api/projects';
import { createWeld, uploadWeldAttachment } from '@/api/welds';
import type { ListParams } from '@/types/api';
import type { ProjectFormValues } from '@/types/forms';
import { normalizeListResponse } from '@/utils/api';

type ProjectCreateWarning = { step: string; message: string };
type ProjectCreateSummary = {
  assemblies_created: number;
  welds_created: number;
  photos_uploaded: number;
  warnings: ProjectCreateWarning[];
};
type ProjectCreateResult = Record<string, unknown> & {
  id: string | number;
  create_summary: ProjectCreateSummary;
};
type SelectionQueryFn = (projectId: string | number) => Promise<Record<string, unknown>[] | null | unknown[]>;

type BulkAction = 'approve' | 'template' | 'materials' | 'wps' | 'welders';
type BulkPayload = { action: BulkAction; projectIds: Array<string | number> };
type SelectionAction =
  | 'add-material'
  | 'remove-material'
  | 'add-wps'
  | 'remove-wps'
  | 'add-welder'
  | 'remove-welder';

type SelectionPayload = {
  action: SelectionAction;
  projectId: string | number;
  refId: string | number;
};

export function useProjects(params?: ListParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => normalizeListResponse(await getProjects(params)),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useProject(projectId?: string | number) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(String(projectId)),
    enabled: Boolean(projectId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
    staleTime: 45_000,
    refetchOnWindowFocus: false,
  });
}

export function useProjectInspections(projectId?: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['project-inspections', projectId, params],
    queryFn: async () => normalizeListResponse(await getProjectInspections(String(projectId), params)),
    enabled: Boolean(projectId),
  });
}

function useProjectSelectionQuery(queryKey: string, projectId?: string | number, queryFn?: SelectionQueryFn) {
  return useQuery({
    queryKey: [queryKey, projectId],
    queryFn: async () => ({
      items: projectId && queryFn ? (await queryFn(projectId)) || [] : [],
    }),
    enabled: Boolean(projectId && queryFn),
  });
}

export function useProjectMaterials(projectId?: string | number) {
  return useProjectSelectionQuery('project-materials', projectId, getProjectSelectedMaterials as SelectionQueryFn);
}

export function useProjectWps(projectId?: string | number) {
  return useProjectSelectionQuery('project-wps', projectId, getProjectSelectedWps as SelectionQueryFn);
}

export function useProjectWelders(projectId?: string | number) {
  return useProjectSelectionQuery('project-welders', projectId, getProjectSelectedWelders as SelectionQueryFn);
}

function addWarning(warnings: ProjectCreateWarning[], step: string, error: unknown) {
  warnings.push({
    step,
    message: error instanceof Error ? error.message : String(error || 'Onbekende fout'),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProjectFormValues): Promise<ProjectCreateResult> => {
      const project = (await createProject(payload)) as ProjectCreateResult;
      const warnings: ProjectCreateWarning[] = [];
      let assembliesCreated = 0;
      let weldsCreated = 0;
      let photosUploaded = 0;

      if (payload.inspection_template_id) {
        try {
          await applyProjectInspectionTemplate(project.id, payload.inspection_template_id);
        } catch (error) {
          addWarning(warnings, 'inspection_template', error);
        }
      }

      if (payload.apply_materials) {
        try {
          await addProjectMaterials(project.id);
        } catch (error) {
          addWarning(warnings, 'materials', error);
        }
      }

      if (payload.apply_wps) {
        try {
          await addProjectWps(project.id);
        } catch (error) {
          addWarning(warnings, 'wps', error);
        }
      }

      if (payload.apply_welders) {
        try {
          await addProjectWelders(project.id);
        } catch (error) {
          addWarning(warnings, 'welders', error);
        }
      }

      const assemblyMap = new Map<string, string>();
      for (const assembly of payload.assemblies || []) {
        if (!assembly.code.trim() && !assembly.name.trim()) continue;
        if (!assembly.code.trim() || !assembly.name.trim()) {
          warnings.push({
            step: 'assembly_validation',
            message: `Assembly ${assembly.code || assembly.name || assembly.temp_id} is overgeslagen omdat code of naam ontbreekt.`,
          });
          continue;
        }

        try {
          const createdAssembly = (await createProjectAssembly(project.id, assembly)) as { id: string | number };
          assemblyMap.set(assembly.temp_id, String(createdAssembly.id));
          assembliesCreated += 1;
        } catch (error) {
          addWarning(warnings, `assembly:${assembly.code || assembly.temp_id}`, error);
        }
      }

      for (const weld of payload.welds || []) {
        if (!weld.weld_number.trim()) continue;
        const resolvedAssemblyId = weld.assembly_temp_id
          ? assemblyMap.get(weld.assembly_temp_id) || ''
          : weld.assembly_id || '';

        try {
          const createdWeld = (await createWeld({
            project_id: String(project.id),
            weld_number: weld.weld_number,
            assembly_id: resolvedAssemblyId,
            wps_id: weld.wps_id,
            welder_name: weld.welder_name,
            process: weld.process,
            location: weld.location,
            status: weld.status === 'gerepareerd' ? 'gerepareerd' : weld.status === 'conform' ? 'conform' : 'defect',
            execution_class: (payload.execution_class || '') as 'EXC1' | 'EXC2' | 'EXC3' | 'EXC4' | '',
            template_id: payload.inspection_template_id || '',
          })) as { id: string | number };
          weldsCreated += 1;

          for (const photo of weld.photos || []) {
            try {
              const formData = new FormData();
              formData.append('files', photo);
              await uploadWeldAttachment(project.id, createdWeld.id, formData);
              photosUploaded += 1;
            } catch (error) {
              addWarning(warnings, `weld_photo:${weld.weld_number}`, error);
            }
          }
        } catch (error) {
          addWarning(warnings, `weld:${weld.weld_number}`, error);
        }
      }

      return {
        ...project,
        create_summary: {
          assemblies_created: assembliesCreated,
          welds_created: weldsCreated,
          photos_uploaded: photosUploaded,
          warnings,
        },
      };
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-assemblies', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-welds', project.id] });
      queryClient.invalidateQueries({ queryKey: ['welds'] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
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
    mutationFn: async ({ action, projectIds }: BulkPayload) => {
      let approvedWelds = 0;
      let projectsMarkedReady = 0;

      for (const projectId of projectIds) {
        const result = (await bulkActionMap[action](projectId)) as Record<string, unknown> | undefined;
        approvedWelds += Number(result?.approved_welds || result?.approved || 0);
        projectsMarkedReady += Number(result?.project_status_updated ? 1 : 0);
      }

      return { count: projectIds.length, action, approvedWelds, projectsMarkedReady };
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
    mutationFn: async ({ action, projectId, refId }: SelectionPayload) => {
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
