import client from '@/api/client';

export async function apiRequest<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body;

  if (method === 'GET') return client.get<T>(url, options);
  if (method === 'POST') return client.post<T>(url, body, options);
  if (method === 'PUT') return client.put<T>(url, body, options);
  if (method === 'PATCH') return client.patch<T>(url, body, options);
  if (method === 'DELETE') return client.delete<T>(url, options);

  return client.get<T>(url, options);
}
