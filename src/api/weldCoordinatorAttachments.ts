import client, { buildListPath, downloadRequest } from '@/api/client';

export type WeldCoordinatorCertificate = {
  id: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number;
  uploaded_at?: string | null;
  kind?: string;
};

export const listWeldCoordinatorCertificates = (coordinatorId: string) =>
  client.get<WeldCoordinatorCertificate[]>(buildListPath('/attachments', {
    scope_type: 'weld_coordinator',
    scope_id: coordinatorId,
    kind: 'certificate',
  }));

export const uploadWeldCoordinatorCertificate = async (coordinatorId: string, file: File) => {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('scope_type', 'weld_coordinator');
  formData.append('scope_id', coordinatorId);
  formData.append('kind', 'certificate');
  return client.post('/attachments/upload', formData);
};

export const deleteWeldCoordinatorCertificate = (certificateId: string) =>
  client.delete(`/attachments/${certificateId}`);

export const downloadWeldCoordinatorCertificate = (certificateId: string) =>
  downloadRequest(`/attachments/${certificateId}/download`);
