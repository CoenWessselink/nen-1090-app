const API_ORIGIN = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';

function copyHeaders(request) {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (['host', 'content-length', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'x-forwarded-proto', 'x-forwarded-host'].includes(lower)) {
      continue;
    }
    headers.set(key, value);
  }
  return headers;
}

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const target = new URL(`${API_ORIGIN}/api/v1/${path}`);
  target.search = url.search;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': url.origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Tenant, X-Tenant-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        Vary: 'Origin',
      },
    });
  }

  const init = {
    method: request.method,
    headers: copyHeaders(request),
    redirect: 'follow',
  };

  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target.toString(), init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set('Access-Control-Allow-Origin', url.origin);
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');
  responseHeaders.append('Vary', 'Origin');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
