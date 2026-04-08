import client from "./client";

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportPdf = async (projectId: string) => {
  const response = await client.post(`/projects/${projectId}/exports/pdf`, {}, { responseType: "blob" });
  triggerBlobDownload(new Blob([response.data], { type: "application/pdf" }), `ce-dossier-${projectId}.pdf`);
};

export const exportZip = async (projectId: string) => {
  const response = await client.post(`/projects/${projectId}/exports/zip`, {}, { responseType: "blob" });
  triggerBlobDownload(new Blob([response.data], { type: "application/zip" }), `ce-dossier-${projectId}.zip`);
};

export const exportExcel = async (projectId: string) => {
  const response = await client.post(`/projects/${projectId}/exports/excel`, {}, { responseType: "blob" });
  triggerBlobDownload(new Blob([response.data]), `ce-dossier-${projectId}.xlsx`);
};
