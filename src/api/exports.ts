import { downloadRequest } from './client';

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

export const exportPdf = async (projectId: string) => {
  const blob = await downloadRequest(`/projects/${projectId}/exports/pdf`, { method: 'POST' });
  triggerBlobDownload(blob, `ce-dossier-${projectId}.pdf`);
};

export const exportZip = async (projectId: string) => {
  const blob = await downloadRequest(`/projects/${projectId}/exports/zip`, { method: 'POST' });
  triggerBlobDownload(blob, `ce-dossier-${projectId}.zip`);
};

export const exportExcel = async (projectId: string) => {
  const blob = await downloadRequest(`/projects/${projectId}/exports/excel`, { method: 'POST' });
  triggerBlobDownload(blob, `ce-dossier-${projectId}.xlsx`);
};
