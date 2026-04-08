import client from './client';

export const getWelds = (projectId: string) =>
  client.get(`/projects/${projectId}/welds`);

export const createWeld = (projectId: string, data: any) =>
  client.post(`/projects/${projectId}/welds`, data);

export const deleteWeld = (projectId: string, weldId: string) =>
  client.delete(`/projects/${projectId}/welds/${weldId}`);

export const getWeldAttachments = () => Promise.resolve([]);
export const getWeldCompliance = () => Promise.resolve({});
export const getWeldDefects = () => Promise.resolve([]);
export const getWeldInspection = () => Promise.resolve({});
export const resetWeldToNorm = () => Promise.resolve({});
export const bulkApproveWelds = () => Promise.resolve({});
export const conformWeld = () => Promise.resolve({});
export const copyWeld = () => Promise.resolve({});
