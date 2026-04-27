
import client, { buildListPath, downloadRequest } from '@/api/client';

export type WelderCertificate = {
  id: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number;
  uploaded_at?: string | null;
  kind?: string;
};

export const listWelderCertificates = (welderId: string) =>
  client.get<WelderCertificate[]>(buildListPath('/attachments', {
    scope_type: 'welder',
    scope_id: welderId,
    kind: 'certificate',
  }));

export const uploadWelderCertificate = async (welderId: string, file: File) => {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('scope_type', 'welder');
  formData.append('scope_id', welderId);
  formData.append('kind', 'certificate');
  return client.post('/attachments/upload', formData);
};

export const deleteWelderCertificate = (certificateId: string) =>
  client.delete(`/attachments/${certificateId}`);

export const downloadWelderCertificate = (certificateId: string) =>
  downloadRequest(`/attachments/${certificateId}/download`);
