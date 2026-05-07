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

type EntityDocumentListResponse = EntityDocument[] | { items?: EntityDocument[]; data?: EntityDocument[]; documents?: EntityDocument[] };

function normalizeDocuments(payload: EntityDocumentListResponse | null | undefined): EntityDocument[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.documents)) return payload.documents;
  return [];
}

function syntheticDocumentFromFile(scopeType: EntityDocumentScope, entityId: string, file: File, kind: string): EntityDocument {
  return {
    id: `pending-${scopeType}-${entityId}-${file.name}-${file.size}`,
    filename: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    uploaded_at: new Date().toISOString(),
    kind,
    scope_type: scopeType,
    scope_id: entityId,
  };
}

export const listEntityDocuments = async (scopeType: EntityDocumentScope, entityId: string, kind?: string) => {
  const payload = await client.get<EntityDocumentListResponse>(buildListPath(`/masterdata-documents/${scopeType}/${entityId}`, { kind }));
  return normalizeDocuments(payload);
};

export const uploadEntityDocuments = async (
  scopeType: EntityDocumentScope,
  entityId: string,
  files: File[] | FileList,
  kind = 'document',
) => {
  const fileList = Array.from(files);
  const formData = new FormData();
  fileList.forEach((file) => formData.append('files', file));
  formData.append('kind', kind);

  try {
    const payload = await client.post<EntityDocumentListResponse>(`/masterdata-documents/${scopeType}/${entityId}`, formData);
    const normalized = normalizeDocuments(payload);
    return normalized.length ? normalized : fileList.map((file) => syntheticDocumentFromFile(scopeType, entityId, file, kind));
  } catch (error) {
    throw error instanceof Error ? error : new Error('Upload mislukt.');
  }
};

export const deleteEntityDocument = (documentId: string) =>
  client.delete(`/masterdata-documents/${documentId}`);

export const downloadEntityDocument = (documentId: string) =>
  downloadRequest(`/masterdata-documents/file/${documentId}`);
