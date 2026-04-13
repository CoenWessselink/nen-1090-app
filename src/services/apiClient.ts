import client from '@/api/client';

export async function apiRequest(url: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body;

  if (method === 'GET') {
    return client.get(url, options);
  }

  if (method === 'POST') {
    return client.post(url, body, options);
  }

  if (method === 'PUT') {
    return client.put(url, body, options);
  }

  if (method === 'PATCH') {
    return client.patch(url, body, options);
  }

  if (method === 'DELETE') {
    return client.delete(url, options);
  }

  return client.get(url, options);
}
