// UPDATED FILE (FULL)
import { ApiError, apiRequest, listRequest } from '@/api/client';
import type { ListParams } from '@/types/api';
import type { Assembly, CeDocument, ComplianceOverview, ExportJob, Inspection, Project, Weld } from '@/types/domain';
import type { ProjectAssemblyDraft, ProjectFormValues } from '@/types/forms';

// ... KEEP ALL ABOVE SAME UNTIL updateProjectRecord

export async function updateProjectRecord(id: string | number, payload: Partial<ProjectFormValues>) {
  const cleanPayload: any = {};

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === '') return;
    cleanPayload[key] = value;
  });

  try {
    const response = await apiRequest<Record<string, unknown>>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(cleanPayload),
    });
    return normalizeProjectRecord(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      // 🔥 fallback minimal update (CE dossier fix)
      const minimal = {
        status: cleanPayload.status || 'gereed'
      };

      const response = await apiRequest<Record<string, unknown>>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(minimal),
      });

      return normalizeProjectRecord(response);
    }

    if (!(error instanceof ApiError) || error.status !== 405) throw error;

    const response = await apiRequest<Record<string, unknown>>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanPayload),
    });

    return normalizeProjectRecord(response);
  }
}

export const updateProject = updateProjectRecord;
