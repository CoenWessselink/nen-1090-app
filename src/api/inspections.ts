import client from './client';

export const getInspection = (projectId: string, weldId: string) =>
  client.get(`/projects/${projectId}/welds/${weldId}/inspection`);

export const getInspections = () => Promise.resolve([]);

export const upsertInspectionForWeld = (projectId: string, weldId: string, data: any) =>
  client.put(`/projects/${projectId}/welds/${weldId}/inspection`, data);

export const uploadInspectionAttachment = () => Promise.resolve({});
