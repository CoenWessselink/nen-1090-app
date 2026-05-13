import client, { ApiError, buildListPath, downloadRequest } from '@/api/client';

export type WeldCoordinatorCertificate = {
  id: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number;
  uploaded_at?: string | null;
  kind?: string;
};

async function listCertificatesForScope(coordinatorId: string, scopeType: string) {
  return client.get<WeldCoordinatorCertificate[]>(
    buildListPath('/attachments', {
      scope_type: scopeType,
      scope_id: coordinatorId,
      kind: 'certificate',
    }),
  );
}

export async function listWeldCoordinatorCertificates(coordinatorId: string) {
  try {
    return await listCertificatesForScope(coordinatorId, 'weld_coordinator');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return listCertificatesForScope(coordinatorId, 'coordinator');
    }
    throw error;
  }
}

export async function uploadWeldCoordinatorCertificate(coordinatorId: string, file: File) {
  const post = (scopeType: string) => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('scope_type', scopeType);
    formData.append('scope_id', coordinatorId);
    formData.append('kind', 'certificate');
    return client.post('/attachments/upload', formData);
  };

  try {
    return await post('weld_coordinator');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 422)) {
      return post('coordinator');
    }
    throw error;
  }
}

export const deleteWeldCoordinatorCertificate = (certificateId: string) =>
  client.delete(`/attachments/${certificateId}`);

export const downloadWeldCoordinatorCertificate = (certificateId: string) =>
  downloadRequest(`/attachments/${certificateId}/download`);
