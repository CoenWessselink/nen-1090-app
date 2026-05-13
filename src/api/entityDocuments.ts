import client, { downloadRequest } from '@/api/client';
import { listMasterDataAttachments, uploadMasterDataAttachment } from '@/api/masterdata-attachments';
import { listWelderCertificates, uploadWelderCertificate } from '@/api/welders';
import { listWeldCoordinatorCertificates, uploadWeldCoordinatorCertificate } from '@/api/weldCoordinatorAttachments';

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

export const listEntityDocuments = async (scopeType: EntityDocumentScope, entityId: string, _kind?: string) => {
  if (scopeType === 'welder') {
    const payload = await listWelderCertificates(entityId);
    return normalizeDocuments(payload as EntityDocumentListResponse);
  }
  if (scopeType === 'wps') {
    const payload = await listMasterDataAttachments('wps', entityId);
    return normalizeDocuments(payload as EntityDocumentListResponse);
  }
  if (scopeType === 'weld-coordinator') {
    const payload = await listWeldCoordinatorCertificates(entityId);
    return normalizeDocuments(payload as EntityDocumentListResponse);
  }
  return [];
};

export const uploadEntityDocuments = async (
  scopeType: EntityDocumentScope,
  entityId: string,
  files: File[] | FileList,
  _kind = 'document',
) => {
  const fileList = Array.from(files);
  try {
    if (scopeType === 'welder') {
      for (const file of fileList) {
        await uploadWelderCertificate(entityId, file);
      }
      return normalizeDocuments((await listWelderCertificates(entityId)) as EntityDocumentListResponse);
    }
    if (scopeType === 'wps') {
      for (const file of fileList) {
        await uploadMasterDataAttachment('wps', entityId, file);
      }
      return normalizeDocuments((await listMasterDataAttachments('wps', entityId)) as EntityDocumentListResponse);
    }
    if (scopeType === 'weld-coordinator') {
      for (const file of fileList) {
        await uploadWeldCoordinatorCertificate(entityId, file);
      }
      return normalizeDocuments((await listWeldCoordinatorCertificates(entityId)) as EntityDocumentListResponse);
    }
    return [];
  } catch (error) {
    throw error instanceof Error ? error : new Error('Upload mislukt.');
  }
};

export const deleteEntityDocument = (documentId: string) =>
  client.delete(`/attachments/${documentId}`);

export const downloadEntityDocument = (documentId: string) =>
  downloadRequest(`/attachments/${documentId}/download`);
