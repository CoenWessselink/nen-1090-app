import { listRequest } from '@/api/client';

export function getProjectAudit(projectId: string | number, limit = 200) {
  return listRequest<any>(`/projects/${projectId}/audit`, { limit });
}
