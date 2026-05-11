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
  const response = await fetch(`/api/v1/projects/${projectId}/ce-aggregate`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch CE aggregate');
  }

  return response.json();
}
