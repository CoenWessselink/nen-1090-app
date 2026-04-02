import { ApiError, apiRequest, optionalRequest } from '@/api/client';
import { getAssemblies } from '@/api/assemblies';
import { getProjectDocuments, getProjectInspections, getProjectWelds, getProjects } from '@/api/projects';
import type { ListParams } from '@/types/api';
import type { Assembly, CeDocument, Inspection, Project, Weld } from '@/types/domain';

function emptyListPayload() {
  return { items: [], total: 0, page: 1, limit: 25 };
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asProject(projectId: string | number, projects: Project[]): Project | null {
  return projects.find((item) => String(item.id) === String(projectId)) || null;
}

function buildChecklist(args: {
  project: Project | null;
  assemblies: Assembly[];
  welds: Weld[];
  inspections: Inspection[];
  documents: CeDocument[];
}) {
  const { project, assemblies, welds, inspections, documents } = args;
  const approvedInspections = inspections.filter((item) => {
    const value = String(item.status || item.result || '').toLowerCase();
    return ['approved', 'goedgekeurd', 'conform', 'gereed', 'ok'].includes(value);
  }).length;

  return [
    { key: 'project', label: 'Projectgegevens', ok: Boolean(project), count: project ? 1 : 0, detail: project ? 'Project gevonden in live API.' : 'Project ontbreekt in live API.' },
    { key: 'assemblies', label: 'Assemblies', ok: assemblies.length > 0, count: assemblies.length, detail: assemblies.length ? `${assemblies.length} assemblies gekoppeld.` : 'Nog geen assemblies gekoppeld.' },
    { key: 'welds', label: 'Lassen', ok: welds.length > 0, count: welds.length, detail: welds.length ? `${welds.length} lassen beschikbaar.` : 'Nog geen lassen geregistreerd.' },
    { key: 'inspections', label: 'Inspecties', ok: inspections.length > 0, count: inspections.length, detail: inspections.length ? `${approvedInspections}/${inspections.length} inspecties akkoord of conform.` : 'Nog geen inspecties geregistreerd.' },
    { key: 'documents', label: 'Documenten en foto’s', ok: documents.length > 0, count: documents.length, detail: documents.length ? `${documents.length} documenten/foto’s gekoppeld.` : 'Nog geen documenten of foto’s gekoppeld.' },
  ];
}

function buildMissingItems(checklist: Array<Record<string, unknown>>) {
  return checklist.filter((item) => !Boolean(item.ok)).map((item) => ({ key: item.key, label: item.label, detail: item.detail }));
}

function buildStatus(checklist: Array<Record<string, unknown>>) {
  const total = checklist.length;
  const completed = checklist.filter((item) => Boolean(item.ok)).length;
  const score = total ? Math.round((completed / total) * 100) : 0;

  if (completed === total && total > 0) return { score, status: 'gereed', ready_for_export: true };
  if (completed === 0) return { score, status: 'niet gestart', ready_for_export: false };
  return { score, status: 'in behandeling', ready_for_export: false };
}

async function buildFallbackCeDossier(projectId: string | number) {
  const projectsResponse = await getProjects({ limit: 250 });
  const project = asProject(projectId, projectsResponse.items || []);

  const [assembliesResponse, weldsResponse, inspectionsResponse, documentsResponse] = await Promise.all([
    getAssemblies(projectId).catch(() => ({ items: [] as Assembly[] })),
    getProjectWelds(projectId).catch(() => ({ items: [] as Weld[] })),
    getProjectInspections(projectId).catch(() => ({ items: [] as Inspection[] })),
    getProjectDocuments(projectId).catch(() => ({ items: [] as CeDocument[] })),
  ]);

  const assembliesPayload = Array.isArray(assembliesResponse) ? assembliesResponse : asArray<Assembly>(assembliesResponse?.items);
  const weldsPayload = Array.isArray(weldsResponse) ? weldsResponse : asArray<Weld>(weldsResponse?.items);
  const inspectionsPayload = Array.isArray(inspectionsResponse) ? inspectionsResponse : asArray<Inspection>(inspectionsResponse?.items);
  const documentsPayload = Array.isArray(documentsResponse) ? documentsResponse : asArray<CeDocument>(documentsResponse?.items);

  const assemblies = asArray<Assembly>(assembliesPayload);
  const welds = asArray<Weld>(weldsPayload);
  const inspections = asArray<Inspection>(inspectionsPayload);
  const documents = asArray<CeDocument>(documentsPayload);
  const photos = documents.filter((item) => {
    const mime = String(item.mime_type || '').toLowerCase();
    const filename = String(item.filename || item.uploaded_filename || '').toLowerCase();
    return mime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(filename);
  });

  const checklist = buildChecklist({ project, assemblies, welds, inspections, documents });
  const missing_items = buildMissingItems(checklist);
  const { score, status, ready_for_export } = buildStatus(checklist);

  return {
    source: 'assembled-live-api',
    project_id: String(projectId),
    project,
    assemblies,
    welds,
    inspections,
    documents,
    photos,
    checklist,
    missing_items,
    counts: {
      assemblies: assemblies.length,
      welds: welds.length,
      inspections: inspections.length,
      documents: documents.length,
      photos: photos.length,
    },
    score,
    status,
    ready_for_export,
    summary: {
      project_name: String(project?.name || project?.omschrijving || project?.projectnummer || ''),
      client_name: String(project?.client_name || project?.opdrachtgever || ''),
      execution_class: String(project?.execution_class || project?.executieklasse || ''),
    },
  };
}

function mergeCePayload(livePayload: Record<string, unknown> | null, fallbackPayload: Record<string, unknown>) {
  const live = asRecord(livePayload);
  const mergedChecklist = asArray<Record<string, unknown>>(live.checklist).length ? asArray<Record<string, unknown>>(live.checklist) : asArray<Record<string, unknown>>(fallbackPayload.checklist);
  const mergedMissing = asArray<Record<string, unknown>>(live.missing_items).length ? asArray<Record<string, unknown>>(live.missing_items) : asArray<Record<string, unknown>>(fallbackPayload.missing_items);

  return {
    ...fallbackPayload,
    ...live,
    source: livePayload ? 'live-ce-export+assembled-live-api' : fallbackPayload.source,
    project: Object.keys(asRecord(live.project)).length ? live.project : fallbackPayload.project,
    assemblies: asArray(live.assemblies).length ? asArray(live.assemblies) : fallbackPayload.assemblies,
    welds: asArray(live.welds).length ? asArray(live.welds) : fallbackPayload.welds,
    inspections: asArray(live.inspections).length ? asArray(live.inspections) : fallbackPayload.inspections,
    photos: asArray(live.photos).length ? asArray(live.photos) : fallbackPayload.photos,
    documents: asArray(live.documents).length ? asArray(live.documents) : fallbackPayload.documents,
    checklist: mergedChecklist,
    missing_items: mergedMissing,
    counts: { ...asRecord(fallbackPayload.counts), ...asRecord(live.counts) },
    score: Number(live.score || fallbackPayload.score || 0),
    status: String(live.status || fallbackPayload.status || 'in behandeling'),
    ready_for_export: Boolean(live.ready_for_export ?? fallbackPayload.ready_for_export),
  };
}

async function tryRequestVariants(paths: string[], methods: Array<'GET' | 'POST'>) {
  for (const path of paths) {
    for (const method of methods) {
      try {
        return await apiRequest<Record<string, unknown>>(path, method === 'POST' ? { method: 'POST' } : undefined, 0, true);
      } catch (error) {
        if (error instanceof ApiError && [404, 405].includes(error.status)) {
          continue;
        }
        throw error;
      }
    }
  }
  return null;
}

function directDownloadPayload(kind: string, projectId: string | number, path: string) {
  return {
    type: kind,
    export_type: kind,
    status: 'aangemaakt',
    message: `${kind.toUpperCase()} download gestart.`,
    project_id: String(projectId),
    download_url: path,
    direct_download: true,
  };
}

export async function getComplianceOverview(projectId: string | number) {
  const dossier = await getCeDossier(projectId);
  return { score: dossier.score || 0, status: dossier.status || 'in behandeling', ready_for_export: Boolean(dossier.ready_for_export), checklist: asArray<Record<string, unknown>>(dossier.checklist), missing_items: asArray<Record<string, unknown>>(dossier.missing_items), counts: asRecord(dossier.counts), source: dossier.source };
}

export async function getComplianceMissingItems(projectId: string | number) {
  const dossier = await getCeDossier(projectId);
  return { items: asArray<Record<string, unknown>>(dossier.missing_items), missing_items: asArray<Record<string, unknown>>(dossier.missing_items), source: dossier.source };
}

export async function getComplianceChecklist(projectId: string | number) {
  const dossier = await getCeDossier(projectId);
  return { items: asArray<Record<string, unknown>>(dossier.checklist), checklist: asArray<Record<string, unknown>>(dossier.checklist), source: dossier.source };
}

export async function getCeDossier(projectId: string | number) {
  const fallbackPayload = await buildFallbackCeDossier(projectId);
  let livePayload: Record<string, unknown> | null = null;

  try {
    livePayload = await optionalRequest<Record<string, unknown>>([`/projects/${projectId}/ce-dossier`, `/ce_export/${projectId}`]);
  } catch {
    livePayload = null;
  }

  return mergeCePayload(livePayload, fallbackPayload);
}

export async function getCeDocuments(_params?: ListParams) {
  return emptyListPayload();
}

export async function uploadDocument(payload: FormData) {
  return optionalRequest<Record<string, unknown>>(['/documents/upload'], { method: 'POST', body: payload });
}

export async function getProjectExports(projectId: string | number) {
  try {
    return ((await optionalRequest<Record<string, unknown> | { items?: Record<string, unknown>[] }>([`/projects/${projectId}/exports`])) || emptyListPayload());
  } catch {
    return emptyListPayload();
  }
}

export async function createCeReport(projectId: string | number) {
  const result = await tryRequestVariants([
    `/projects/${projectId}/exports/ce-report`,
    `/projects/${projectId}/exports/report`,
    `/projects/${projectId}/ce-dossier/report`,
  ], ['POST', 'GET']);

  return result || { unsupported: true, type: 'ce-report', project_id: String(projectId) };
}

export async function createZipExport(projectId: string | number) {
  const getPaths = [
    `/projects/${projectId}/exports/zip`,
    `/projects/${projectId}/export/zip`,
    `/projects/${projectId}/ce-dossier/zip`,
  ];
  const result = await tryRequestVariants(getPaths, ['GET', 'POST']);
  return result || directDownloadPayload('zip', projectId, getPaths[0]);
}

export async function createPdfExport(projectId: string | number) {
  const getPaths = [
    `/projects/${projectId}/exports/pdf`,
    `/projects/${projectId}/export/pdf`,
    `/projects/${projectId}/ce-dossier/pdf`,
  ];
  const result = await tryRequestVariants(getPaths, ['GET', 'POST']);
  return result || directDownloadPayload('pdf', projectId, getPaths[0]);
}

export async function createExcelExport(projectId: string | number) {
  const getPaths = [
    `/projects/${projectId}/exports/excel`,
    `/projects/${projectId}/export/excel`,
    `/projects/${projectId}/ce-dossier/excel`,
  ];
  const result = await tryRequestVariants(getPaths, ['GET', 'POST']);
  return result || directDownloadPayload('excel', projectId, getPaths[0]);
}

export async function downloadProjectExport(_projectId: string | number, exportId: string | number) {
  return optionalRequest<Record<string, unknown>>([`/projects/exports/${exportId}/download`]);
}

export async function retryProjectExport(projectId: string | number, exportId: string | number) {
  return ((await optionalRequest<Record<string, unknown>>([
    `/projects/${projectId}/exports/${exportId}/retry`,
    `/ops/projects/${projectId}/exports/${exportId}/retry`,
  ], { method: 'POST' })) || { unsupported: true, export_id: String(exportId), project_id: String(projectId) });
}

export async function getProjectExportPreview(projectId: string | number) {
  const dossier = await getCeDossier(projectId);
  return {
    project_id: String(projectId),
    preview: [
      { label: 'Project', value: asRecord(dossier.project).name || asRecord(dossier.project).omschrijving || asRecord(dossier.project).projectnummer || '—' },
      { label: 'Assemblies', value: Number(asRecord(dossier.counts).assemblies || 0) },
      { label: 'Lassen', value: Number(asRecord(dossier.counts).welds || 0) },
      { label: 'Inspecties', value: Number(asRecord(dossier.counts).inspections || 0) },
      { label: 'Documenten', value: Number(asRecord(dossier.counts).documents || 0) },
      { label: 'CE status', value: String(dossier.status || 'in behandeling') },
    ],
  };
}

export async function getProjectExportManifest(projectId: string | number, exportId: string | number) {
  const dossier = await getCeDossier(projectId);
  return {
    project_id: String(projectId),
    export_id: String(exportId),
    manifest: [
      { section: 'project', included: Boolean(dossier.project) },
      { section: 'assemblies', included: asArray(dossier.assemblies).length > 0, count: asArray(dossier.assemblies).length },
      { section: 'welds', included: asArray(dossier.welds).length > 0, count: asArray(dossier.welds).length },
      { section: 'inspections', included: asArray(dossier.inspections).length > 0, count: asArray(dossier.inspections).length },
      { section: 'documents', included: asArray(dossier.documents).length > 0, count: asArray(dossier.documents).length },
      { section: 'photos', included: asArray(dossier.photos).length > 0, count: asArray(dossier.photos).length },
      { section: 'checklist', included: asArray(dossier.checklist).length > 0, count: asArray(dossier.checklist).length },
    ],
  };
}
