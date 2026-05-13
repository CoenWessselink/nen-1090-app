import { useQuery } from '@tanstack/react-query';
import type { ProjectMaterialsAggregate } from '@/api/materialsAggregate';
import { fetchProjectMaterialsAggregate } from '@/api/materialsAggregate';
import { useAuthStore } from '@/app/store/auth-store';

function useProjectMaterialsAggregateQuery<TData = ProjectMaterialsAggregate>(
  projectId: string | undefined,
  select: (data: ProjectMaterialsAggregate) => TData,
) {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const token = useAuthStore((s) => s.token);
  const hasSession = Boolean(useAuthStore((s) => s.token || s.user));

  return useQuery({
    queryKey: ['project-materials-aggregate', projectId, tenantId, token],
    queryFn: () => fetchProjectMaterialsAggregate(String(projectId)),
    enabled: hasSession && Boolean(projectId),
    staleTime: 45_000,
    refetchOnWindowFocus: false,
    select,
  });
}

export function useProjectMaterialsAggregate(projectId?: string | number) {
  const id =
    projectId === undefined || projectId === null || projectId === '' ? undefined : String(projectId);
  return useProjectMaterialsAggregateQuery(id, (data) => data);
}

/**
 * Project-linked material rows only (`{ items }` shape for callers that only need selection rows).
 */
export function useProjectMaterials(projectId?: string | number) {
  const id =
    projectId === undefined || projectId === null || projectId === '' ? undefined : String(projectId);
  return useProjectMaterialsAggregateQuery(id, (data) => ({ items: data.selected }));
}
