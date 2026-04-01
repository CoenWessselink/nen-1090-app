import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveAllProject, updateProject } from '@/api/projects';

export function useProjectBulkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectIds, mode = 'open_only' }: { projectIds: Array<string | number>; mode?: 'open_only' | 'overwrite_all' }) => {
      let approvedWelds = 0;
      let approvedAssemblies = 0;
      let inspectionsSetOk = 0;
      let projectsMarkedReady = 0;

      for (const projectId of [...new Set(projectIds.map(String))]) {
        const result = await approveAllProject(projectId, mode);
        approvedWelds += Number(result.approved_welds || 0);
        approvedAssemblies += Number(result.approved_assemblies || 0);
        inspectionsSetOk += Number(result.inspections_set_ok || 0);
        projectsMarkedReady += result.project_status_updated ? 1 : 0;
      }

      return {
        count: projectIds.length,
        approvedWelds,
        approvedAssemblies,
        inspectionsSetOk,
        projectsMarkedReady,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['project-welds'] });
      queryClient.invalidateQueries({ queryKey: ['project-assemblies'] });
      queryClient.invalidateQueries({ queryKey: ['project-inspections'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Record<string, unknown> }) => updateProject(id, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}
