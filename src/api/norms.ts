import { ApiError, apiRequest, listRequest, optionalRequest } from '@/api/client';

// 🔥 HARD FIXED UPLOAD + SAVE
export async function uploadWeldInspectionAttachment(projectId: string, weldId: string, formData: FormData) {
  if (!formData.has('kind')) formData.set('kind', 'photo');

  return await apiRequest(
    `/projects/${projectId}/welds/${weldId}/photos`,
    {
      method: 'POST',
      body: formData,
    }
  );
}

export async function saveWeldInspection(projectId: string, weldId: string, payload: any) {
  const status = payload?.status || 'conform';

  const body = {
    ...payload,
    weld_id: weldId,
    status,
    overall_status: status,
  };

  return await apiRequest(
    `/projects/${projectId}/welds/${weldId}/inspection`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}
