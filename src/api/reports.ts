import { optionalRequest } from '@/api/client';
import { getProjects } from '@/api/projects';
import type { ReportItem } from '@/types/domain';
import type { ListParams } from '@/types/api';
import { withQuery } from '@/utils/api';

type ReportResponse = ReportItem[] | { items?: ReportItem[]; data?: ReportItem[]; results?: ReportItem[]; total?: number; page?: number; limit?: number };

function normalizeReportUrls(items: ReportItem[]) {
  return items.map((item) => ({
    ...item,
    pdf_url: String((item as ReportItem & { pdf_url?: string; download_url?: string }).pdf_url || (item as ReportItem & { download_url?: string }).download_url || '' || '').trim() || undefined,
  }));
}

function normalizeItems(payload: ReportResponse | null | undefined) {
  if (Array.isArray(payload)) {
    return {
      items: normalizeReportUrls(payload),
      total: payload.length,
      page: 1,
      limit: payload.length || 25,
    };
  }

  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.results)
        ? payload.results
        : [];

  return {
    items: normalizeReportUrls(items),
    total: Number(payload?.total || items.length || 0),
    page: Number(payload?.page || 1),
    limit: Number(payload?.limit || 25),
  };
}

function deriveProjectReports(projects: Awaited<ReturnType<typeof getProjects>>) {
  const items: ReportItem[] = (projects.items || []).map((project, index) => {
    const projectNumber = String(project.projectnummer || project.code || project.id || '').trim();
    const projectName = String(project.name || project.omschrijving || project.project_name || '').trim();
    return {
      id: `project-summary-${project.id}`,
      title: `Weld Compliance Report ${projectNumber || index + 1}`,
      type: 'weld_compliance_report',
      status: String(project.status || 'concept'),
      owner: String(project.client_name || project.opdrachtgever || 'Projectteam'),
      created_at: String(project.updated_at || project.created_at || project.start_date || new Date().toISOString()),
      project_id: project.id,
      project_name: projectName,
      projectnummer: projectNumber,
      client_name: String(project.client_name || project.opdrachtgever || ''),
      pdf_url: `/api/v1/projects/${project.id}/exports/compliance/pdf?download=true&force=true`,
      download_url: `/api/v1/projects/${project.id}/exports/compliance/pdf?download=true&force=true`,
    };
  });

  return {
    items,
    total: items.length,
    page: 1,
    limit: Number(projects.limit || items.length || 25),
    source: 'derived-projects',
  };
}

export async function getReports(params?: ListParams) {
  const response = await optionalRequest<ReportResponse>([
    withQuery('/reports', params),
  ]);

  const normalized = normalizeItems(response);
  if (normalized.items.length > 0) return normalized;

  const projects = await getProjects({ limit: Number(params?.limit || 25), page: Number(params?.page || 1), search: params?.search });
  return deriveProjectReports(projects);
}
