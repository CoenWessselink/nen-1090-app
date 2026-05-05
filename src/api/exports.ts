import { downloadUrlAsBlob } from './client';

const safePart = (value?: string | null, fallback = 'Project') => {
  const cleaned = String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
};

const today = () => new Date().toISOString().slice(0, 10);

const buildWeldComplianceReportFilename = (
  projectId: string,
  project?: { name?: string | null; code?: string | null; client_name?: string | null },
) => {
  const projectNumber = safePart(project?.code || projectId, projectId);
  const projectName = safePart(project?.name, 'project');
  return `Weld-Compliance-Report-${projectNumber}-${projectName}-${today()}.pdf`;
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const openBlobInNewWindow = (blob: Blob, fallbackFilename: string) => {
  const file = new File([blob], fallbackFilename, { type: blob.type || 'application/pdf' });
  const url = window.URL.createObjectURL(file);
  const win = window.open(url, '_blank', 'noopener,noreferrer');

  if (!win) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fallbackFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
};

const compliancePdfPath = (projectId: string) => `/projects/${projectId}/exports/compliance/pdf`;
const compliancePdfDownloadPath = (projectId: string) => `${compliancePdfPath(projectId)}?download=true`;
const compliancePdfViewerPath = (projectId: string) => `${compliancePdfPath(projectId)}?download=false`;

export const exportPdf = async (
  projectId: string,
  project?: { name?: string | null; code?: string | null; client_name?: string | null },
) => {
  const fallbackFilename = buildWeldComplianceReportFilename(projectId, project);
  const { blob, filename } = await downloadUrlAsBlob(compliancePdfDownloadPath(projectId), { method: 'GET' });
  triggerBlobDownload(blob, filename || fallbackFilename);
};

export const openPdfViewer = async (
  projectId: string,
  project?: { name?: string | null; code?: string | null; client_name?: string | null },
) => {
  const fallbackFilename = buildWeldComplianceReportFilename(projectId, project);
  const { blob, filename } = await downloadUrlAsBlob(compliancePdfViewerPath(projectId), { method: 'GET' });
  openBlobInNewWindow(blob, filename || fallbackFilename);
};

export const exportZip = async (
  projectId: string,
  project?: { name?: string | null; code?: string | null; client_name?: string | null },
) => {
  const base = buildWeldComplianceReportFilename(projectId, project).replace(/\.pdf$/i, '.zip');
  const { blob, filename } = await downloadUrlAsBlob(`/projects/${projectId}/exports/zip`, { method: 'POST' });
  triggerBlobDownload(blob, filename || base);
};

export const exportExcel = async (
  projectId: string,
  project?: { name?: string | null; code?: string | null; client_name?: string | null },
) => {
  const base = buildWeldComplianceReportFilename(projectId, project).replace(/\.pdf$/i, '.xlsx');
  const { blob, filename } = await downloadUrlAsBlob(`/projects/${projectId}/exports/excel`, { method: 'POST' });
  triggerBlobDownload(blob, filename || base);
};
