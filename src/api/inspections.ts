import client from "./client";

export const getInspection = (projectId: string, weldId: string) =>
  client.get(`/projects/${projectId}/welds/${weldId}/inspection`);

export const updateInspection = (
  projectId: string,
  weldId: string,
  data: Record<string, unknown>
) => client.put(`/projects/${projectId}/welds/${weldId}/inspection`, data);
