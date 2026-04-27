import { downloadUrlAsBlob } from './client';

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

export const exportPdf = async (projectId: string) => {
  const { blob, filename } = await downloadUrlAsBlob(compliancePdfDownloadPath(projectId), { method: 'GET' });
  triggerBlobDownload(blob, filename || `CE-Dossier-${projectId}.pdf`);
};

export const openPdfViewer = async (projectId: string) => {
  const { blob, filename } = await downloadUrlAsBlob(compliancePdfViewerPath(projectId), { method: 'GET' });
  openBlobInNewWindow(blob, filename || `CE-Dossier-${projectId}.pdf`);
};

export const exportZip = async (projectId: string) => {
  const { blob, filename } = await downloadUrlAsBlob(`/projects/${projectId}/exports/zip`, { method: 'POST' });
  triggerBlobDownload(blob, filename || `ce-dossier-${projectId}.zip`);
};

export const exportExcel = async (projectId: string) => {
  const { blob, filename } = await downloadUrlAsBlob(`/projects/${projectId}/exports/excel`, { method: 'POST' });
  triggerBlobDownload(blob, filename || `ce-dossier-${projectId}.xlsx`);
};
