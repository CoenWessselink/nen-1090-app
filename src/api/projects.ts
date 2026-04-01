import { apiRequest } from '@/api/client';

export type ApproveAllProjectResponse = {
  ok: boolean;
  mode: 'open_only' | 'overwrite_all';
  inspections: number;
  checks_updated: number;
  inspections_set_ok: number;
  approved_welds: number;
  approved_assemblies: number;
  project_status_updated: boolean;
  project_status: string;
  weld_ids_marked_ready: string[];
  assembly_ids_marked_ready: string[];
};

export async function approveAllProject(projectId: string | number, mode: 'open_only' | 'overwrite_all' = 'open_only') {
  return apiRequest<ApproveAllProjectResponse>(`/projects/${projectId}/lascontrole/approve_all`, {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}

export async function updateProject(projectId: string | number, payload: Record<string, unknown>) {
  return apiRequest(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
