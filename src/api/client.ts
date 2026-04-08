import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

export const apiRequest = client;
export const listRequest = client.get;
export const optionalRequest = client;
export const buildListPath = (path: string) => path;

export const healthRequest = () => client.get('/health');

export default client;
