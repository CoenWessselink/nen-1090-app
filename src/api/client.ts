
import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

export const apiRequest = (...args:any)=>client(...args);
export const listRequest = (...args:any)=>client.get(...args);
export const optionalRequest = (...args:any)=>client(...args);
export const downloadRequest = (...args:any)=>client.get(...args);
export const buildListPath = (p:string)=>p;

export const ApiError = class extends Error {};

export const healthRequest = ()=>client.get('/health');

export default client;
