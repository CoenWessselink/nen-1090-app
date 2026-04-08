
import client from './client';

export const getWelds = (projectId:string)=>client.get(`/projects/${projectId}/welds`);
export const createWeld = (projectId:string,data:any)=>client.post(`/projects/${projectId}/welds`,data);
export const updateWeld = (projectId:string,weldId:string,data:any)=>client.patch(`/projects/${projectId}/welds/${weldId}`,data);

export const deleteWeld = (...args:any)=>Promise.resolve({});
export const uploadWeldAttachment = (...args:any)=>Promise.resolve({});
export const getWeldAttachments = (...args:any)=>Promise.resolve([]);
export const getWeldCompliance = (...args:any)=>Promise.resolve({});
export const getWeldDefects = (...args:any)=>Promise.resolve([]);
export const getWeldInspection = (...args:any)=>Promise.resolve({});
export const getWeldInspections = (...args:any)=>Promise.resolve([]);
export const resetWeldToNorm = (...args:any)=>Promise.resolve({});
export const bulkApproveWelds = (...args:any)=>Promise.resolve({});
export const conformWeld = (...args:any)=>Promise.resolve({});
export const copyWeld = (...args:any)=>Promise.resolve({});
export const patchWeldStatus = (...args:any)=>Promise.resolve({});
