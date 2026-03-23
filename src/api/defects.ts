import { apiRequest, listRequest, optionalRequest, resolveProjectScopedPath } from '@/api/client';
import type { Defect } from '@/types/domain';
import type { ListParams } from '@/types/api';

export function getDefects(params?: ListParams) {
  const projectId = params?.project_id || params?.projectId;
  return listRequest<Defect[] | { items?: Defect[] }>(
    resolveProjectScopedPath(projectId, `/projects/${projectId}/weld-defects`, '/weld-defects'),
    params,
  );
}

export function getDefect(defectId: string | number) {
  return apiRequest<Defect>(`/weld-defects/${defectId}`);
}

export function createDefect(projectId: string | number, weldId: string | number, payload: Record<string, unknown>) {
  return optionalRequest<Defect>([
    `/projects/${projectId}/welds/${weldId}/weld-defects`,
    `/projects/${projectId}/welds/${weldId}/defects`,
    `/projects/${projectId}/weld-defects`,
    `/projects/${projectId}/defects`,
  ], { method: 'POST', body: JSON.stringify(payload) });
}

export function updateDefect(defectId: string | number, payload: Record<string, unknown>) {
  return optionalRequest<Defect>([
    `/weld-defects/${defectId}`,
  ], { method: 'PUT', body: JSON.stringify(payload) });
}

export function resolveDefect(defectId: string | number) {
  return apiRequest<Record<string, unknown>>(`/weld-defects/${defectId}/resolve`, { method: 'POST' });
}

export function reopenDefect(defectId: string | number) {
  return optionalRequest<Record<string, unknown>>([`/weld-defects/${defectId}/reopen`], { method: 'POST' });
}

export function deleteDefect(defectId: string | number) {
  return optionalRequest<void>([`/weld-defects/${defectId}`], { method: 'DELETE' });
}
