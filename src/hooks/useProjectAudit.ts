import { useQuery } from '@tanstack/react-query';
import { getProjectAudit } from '@/api/audit';
import { normalizeListResponse } from '@/utils/api';

export function useProjectAudit(projectId?: string | number, limit = 200) {
  return useQuery({
    queryKey: ['project-audit', projectId, limit],
    queryFn: async () => normalizeListResponse(await getProjectAudit(String(projectId), limit)),
    enabled: Boolean(projectId),
  });
}
