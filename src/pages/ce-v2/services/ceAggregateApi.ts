import { apiRequest } from '@/api/client';

export interface CeAggregateResponse {
  project: Record<string, unknown>;
  welds: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
  materials: Record<string, unknown>[];
  wps: Record<string, unknown>[];
  welders: Record<string, unknown>[];
  attachments: Record<string, unknown>[];
  completeness: Record<string, unknown>;
  status: Record<string, unknown>;
}

export async function fetchCeAggregate(projectId: string): Promise<CeAggregateResponse> {
  return apiRequest<CeAggregateResponse>(`/projects/${projectId}/ce-aggregate`);
}
