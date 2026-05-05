import client, { buildListPath, downloadRequest } from '@/api/client';

export type EntityDocumentScope = 'welder' | 'wps' | 'weld-coordinator';

export type EntityDocument = {
  id: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number;
  uploaded_at?: string | null;
  kind?: string;
  scope_type?: string;
  scope_id?: string;
  download_url?: string;
  url?: string;
};

export const listEntityDocuments = (scopeType: EntityDocumentScope, entityId: string, kind?: string) =>
  client.get<EntityDocument[]>(buildListPath('/attachments', {
    scope_type: scopeType,
    scope_id: entityId,
    kind,
  }));

export const uploadEntityDocuments = async (
  scopeType: EntityDocumentScope,
  entityId: string,
  files: File[] | FileList,
  kind = 'document',
) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));
  formData.append('scope_type', scopeType);
  formData.append('scope_id', entityId);
  formData.append('kind', kind);
  return client.post('/attachments/upload', formData);
};

export const deleteEntityDocument = (documentId: string) =>
  client.delete(`/attachments/${documentId}`);

export const downloadEntityDocument = (documentId: string) =>
  downloadRequest(`/attachments/${documentId}/download`);
