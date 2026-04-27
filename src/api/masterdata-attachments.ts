import client, { buildListPath, downloadRequest } from '@/api/client';

export type MasterDataAttachment = {
  id: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number;
  uploaded_at?: string | null;
  kind?: string;
};

function normalizeScopeType(scopeType: 'wps' | 'materials') {
  return scopeType === 'materials' ? 'material' : 'wps';
}

export const listMasterDataAttachments = (scopeType: 'wps' | 'materials', scopeId: string) =>
  client.get<MasterDataAttachment[]>(buildListPath('/attachments', {
    scope_type: normalizeScopeType(scopeType),
    scope_id: scopeId,
    kind: 'document',
  }));

export const uploadMasterDataAttachment = async (scopeType: 'wps' | 'materials', scopeId: string, file: File) => {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('scope_type', normalizeScopeType(scopeType));
  formData.append('scope_id', scopeId);
  formData.append('kind', 'document');
  return client.post('/attachments/upload', formData);
};

export const deleteMasterDataAttachment = (attachmentId: string) => client.delete(`/attachments/${attachmentId}`);
export const downloadMasterDataAttachment = (attachmentId: string) => downloadRequest(`/attachments/${attachmentId}/download`);
