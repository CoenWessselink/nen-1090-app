
import client from './client';

export const getInspection = (projectId:string,weldId:string)=>client.get(`/projects/${projectId}/welds/${weldId}/inspection`);
export const getInspections = (...args:any)=>Promise.resolve([]);

export const upsertInspectionForWeld = (projectId:string,weldId:string,data:any)=>
 client.put(`/projects/${projectId}/welds/${weldId}/inspection`,data);

export const updateInspection = (...args:any)=>Promise.resolve({});
export const deleteInspection = (...args:any)=>Promise.resolve({});
export const downloadInspectionAttachment = (...args:any)=>Promise.resolve({});
export const uploadInspectionAttachment = (...args:any)=>Promise.resolve({});
export const getInspectionAttachments = (...args:any)=>Promise.resolve([]);
export const getInspectionAudit = (...args:any)=>Promise.resolve({});
export const getInspectionForWeld = (...args:any)=>Promise.resolve({});
export const getInspectionResults = (...args:any)=>Promise.resolve([]);
