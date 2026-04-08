import client from "./client";

export type WeldStatus = "conform" | "defect" | "gerepareerd";

export const getWelds = (projectId: string, params?: Record<string, unknown>) =>
  client.get(`/projects/${projectId}/welds`, { params });

export const getWeld = (projectId: string, weldId: string) =>
  client.get(`/projects/${projectId}/welds/${weldId}`);

export const createWeld = (projectId: string, data: Record<string, unknown>) =>
  client.post(`/projects/${projectId}/welds`, data);

export const updateWeld = (projectId: string, weldId: string, data: Record<string, unknown>) =>
  client.put(`/projects/${projectId}/welds/${weldId}`, data);

export const patchWeldStatus = (projectId: string, weldId: string, status: WeldStatus) =>
  client.patch(`/projects/${projectId}/welds/${weldId}/status`, { status });

export const getWeldInspection = (projectId: string, weldId: string) =>
  client.get(`/projects/${projectId}/welds/${weldId}/inspection`);

export const updateWeldInspection = (projectId: string, weldId: string, data: Record<string, unknown>) =>
  client.put(`/projects/${projectId}/welds/${weldId}/inspection`, data);

export const uploadWeldAttachment = (projectId: string, weldId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return client.post(`/projects/${projectId}/welds/${weldId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
