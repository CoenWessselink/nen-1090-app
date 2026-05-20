import type { CeAggregateResponse } from '@/api/ceAggregateApi';
import type { CeDocument } from '@/types/domain';

/** Map server CE aggregate to the dossier-shaped record the mobile CE UI expects. */
export function dossierPayloadFromAggregate(aggregate: CeAggregateResponse): Record<string, unknown> {
  const completeness = aggregate.completeness as Record<string, unknown> | undefined;
  const project = (aggregate.project || {}) as Record<string, unknown>;
  const statusObj = (aggregate.status || {}) as Record<string, unknown>;

  const checklist =
    (Array.isArray(completeness?.checks) ? completeness.checks : null) ||
    (Array.isArray(completeness?.checklist) ? completeness.checklist : null) ||
    [];

  const welds = Array.isArray(aggregate.welds) ? aggregate.welds : [];
  const inspections = Array.isArray(aggregate.inspections) ? aggregate.inspections : [];
  const attachments = Array.isArray(aggregate.attachments) ? aggregate.attachments : [];

  const score =
    typeof completeness?.score === 'number'
      ? completeness.score
      : typeof completeness?.percentage === 'number'
        ? completeness.percentage
        : undefined;

  return {
    checklist,
    score,
    status: statusObj.label || statusObj.summary || statusObj.status || completeness?.status,
    welds_count: welds.length,
    weld_count: welds.length,
    inspection_count: inspections.length,
    attachments_count: attachments.length,
    counts: { welds: welds.length, inspections: inspections.length, documents: attachments.length },
    notes: project.notes,
    project,
  };
}

function attachmentDownloadUrl(row: Record<string, unknown>, id: string) {
  const explicit = String(row.url || row.download_url || row.file_url || row.preview_url || row.storage_url || row.public_url || row.href || '').trim();
  if (explicit) return explicit;
  return id ? `/api/v1/attachments/${id}/download` : '';
}

export function attachmentsAsCeDocuments(attachments: Record<string, unknown>[]): CeDocument[] {
  return attachments.map((row) => {
    const id = String(row.id ?? '');
    const filename = String(row.filename || row.uploaded_filename || row.file_name || row.title || row.name || '');
    const mime_type = String(row.mime_type || row.content_type || row.mimeType || '');
    const url = attachmentDownloadUrl(row, id);

    return {
      ...row,
      id,
      filename,
      file_name: filename,
      name: filename,
      title: filename,
      mime_type,
      content_type: mime_type,
      url,
      download_url: url,
      file_url: url,
      preview_url: url,
    } as CeDocument;
  });
}
