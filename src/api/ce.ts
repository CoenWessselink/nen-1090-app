import { optionalRequest } from '@/api/client';
import type { CeDocument, ComplianceOverview, ExportJob } from '@/types/domain';
import type { ListParams } from '@/types/api';

function documentRowsFromCeExport(payload: Record<string, unknown>): CeDocument[] {
  const photos = Array.isArray(payload.photos) ? (payload.photos as Array<Record<string, unknown>>) : [];
  return photos.map((photo, index) => ({
    id: String(photo.id || `photo-${index}`),
    title: String(photo.name || `Foto ${index + 1}`),
    type: String(photo.mime || 'photo'),
    version: '1.0',
    status: 'Actief',
    uploaded_at: typeof photo.captured_at === 'string' ? photo.captured_at : undefined,
  })) as CeDocument[];
}

export async function getCeDocuments(params?: ListParams) {
  const projectId = params?.project_id || params?.projectId;
  if (!projectId) return [];
  const payload = await optionalRequest<Record<string, unknown>>([`/ce_export/${projectId}`]);
  if (!payload || typeof payload !== 'object') return [];
  return documentRowsFromCeExport(payload);
}

export function uploadDocument(_payload: FormData) {
  return Promise.resolve({ ok: false, reason: 'Upload niet beschikbaar op de huidige API.' });
}

export async function getComplianceOverview(projectId: string | number) {
  const payload = await optionalRequest<Record<string, unknown>>([`/ce_export/${projectId}`]);
  if (!payload || typeof payload !== 'object') {
    return { score: 0, checklist: [], missing_items: [] } as ComplianceOverview;
  }

  const counts = ((payload as Record<string, unknown>).counts || {}) as Record<string, unknown>;
  const ready = Boolean((payload as Record<string, unknown>).ready_for_export);
  const assemblies = Number(counts.assemblies || 0);
  const welds = Number(counts.welds || 0);
  const inspections = Number(counts.inspections || 0);

  return {
    score: ready ? 100 : Math.round(([assemblies > 0, welds > 0, inspections > 0].filter(Boolean).length / 3) * 100),
    validation_summary: {
      completed_checks: [assemblies > 0, welds > 0, inspections > 0].filter(Boolean).length,
      total_checks: 3,
    },
    checklist: [
      { label: 'Assemblies aanwezig', completed: assemblies > 0 },
      { label: 'Lassen aanwezig', completed: welds > 0 },
      { label: 'Inspecties aanwezig', completed: inspections > 0 },
    ],
    missing_items: [
      ...(assemblies > 0 ? [] : [{ label: 'Assemblies ontbreken', severity: 'warning' }]),
      ...(welds > 0 ? [] : [{ label: 'Lassen ontbreken', severity: 'warning' }]),
      ...(inspections > 0 ? [] : [{ label: 'Inspecties ontbreken', severity: 'warning' }]),
    ],
  } as ComplianceOverview;
}

export async function getComplianceMissingItems(projectId: string | number) {
  const overview = await getComplianceOverview(projectId);
  return { items: (overview as Record<string, unknown>).missing_items || [] };
}

export async function getComplianceChecklist(projectId: string | number) {
  const overview = await getComplianceOverview(projectId);
  return { items: (overview as Record<string, unknown>).checklist || [] };
}

export async function getCeDossier(projectId: string | number) {
  const payload = await optionalRequest<Record<string, unknown>>([`/ce_export/${projectId}`]);
  if (!payload || typeof payload !== 'object') return { sections: [] };

  const source = payload as Record<string, unknown>;
  const project = (source.project || {}) as Record<string, unknown>;
  const counts = (source.counts || {}) as Record<string, unknown>;

  return {
    sections: [
      {
        id: 'project',
        label: `Project ${String(project.project_number || project.name || project.id || projectId)}`,
        description: String(project.name || ''),
        completed: true,
      },
      {
        id: 'assemblies',
        label: 'Assemblies',
        description: `${Number(counts.assemblies || 0)} assemblies`,
        completed: Number(counts.assemblies || 0) > 0,
      },
      {
        id: 'welds',
        label: 'Lassen',
        description: `${Number(counts.welds || 0)} lassen`,
        completed: Number(counts.welds || 0) > 0,
      },
      {
        id: 'inspections',
        label: 'Inspecties',
        description: `${Number(counts.inspections || 0)} inspecties`,
        completed: Number(counts.inspections || 0) > 0,
      },
    ],
    raw: payload,
  };
}

export async function getProjectExports(projectId: string | number, _params?: ListParams) {
  const payload = await optionalRequest<Record<string, unknown>>([`/ce_export/${projectId}`]);
  if (!payload || typeof payload !== 'object') return [];
  return [{
    id: String(projectId),
    export_type: 'ce_export',
    bundle_type: 'json',
    status: Boolean((payload as Record<string, unknown>).ready_for_export) ? 'completed' : 'open',
    created_at: String((payload as Record<string, unknown>).generated_at || new Date().toISOString()),
    download_url: '',
  }] as ExportJob[];
}

export function createCeReport(projectId: string | number) {
  return Promise.resolve({ ok: true, project_id: projectId, mode: 'ce_export_view' });
}

export function createZipExport(projectId: string | number) {
  return Promise.resolve({ ok: false, project_id: projectId, reason: 'ZIP export niet beschikbaar op de huidige API.' });
}

export function createPdfExport(projectId: string | number) {
  return Promise.resolve({ ok: false, project_id: projectId, reason: 'PDF export niet beschikbaar op de huidige API.' });
}

export function createExcelExport(projectId: string | number) {
  return Promise.resolve({ ok: false, project_id: projectId, reason: 'Excel export niet beschikbaar op de huidige API.' });
}

export function downloadProjectExport(projectId: string | number, exportId: string | number) {
  const payload = {
    ok: false,
    project_id: String(projectId),
    export_id: String(exportId),
    reason: 'Download niet beschikbaar op de huidige API.',
  };
  return Promise.resolve(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
}

export function retryProjectExport(projectId: string | number, exportId: string | number) {
  return Promise.resolve({ ok: false, project_id: projectId, export_id: exportId, reason: 'Retry niet beschikbaar op de huidige API.' });
}

export async function getProjectExportPreview(projectId: string | number) {
  const payload = await optionalRequest<Record<string, unknown>>([`/ce_export/${projectId}`]);
  if (!payload || typeof payload !== 'object') return {};
  const source = payload as Record<string, unknown>;
  return {
    ready_for_export: Boolean(source.ready_for_export),
    assemblies: Array.isArray(source.assemblies) ? source.assemblies : [],
    welds: Array.isArray(source.welds) ? source.welds : [],
    inspection_results: Array.isArray(source.inspections) ? source.inspections : [],
    completeness: [
      { label: 'Project aanwezig', status: source.project ? 'completed' : 'open' },
      { label: 'Assemblies', status: Array.isArray(source.assemblies) && source.assemblies.length ? 'completed' : 'open' },
      { label: 'Lassen', status: Array.isArray(source.welds) && source.welds.length ? 'completed' : 'open' },
      { label: 'Inspecties', status: Array.isArray(source.inspections) && source.inspections.length ? 'completed' : 'open' },
    ],
  };
}

export async function getProjectExportManifest(projectId: string | number, exportId: string | number) {
  const payload = await optionalRequest<Record<string, unknown>>([`/ce_export/${projectId}`]);
  return {
    manifest: {
      id: String(exportId),
      project_id: String(projectId),
      ready_for_export: Boolean((payload || {}).ready_for_export),
      files: [],
      download_name: `ce-export-${String(projectId)}.json`,
      zip_name: `ce-export-${String(projectId)}.zip`,
    },
  };
}
