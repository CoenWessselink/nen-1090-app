(function () {
  const LIVE_API = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';

  const LS_KEYS = {
    baseUrl: 'nen1090.api.baseUrl',
    tenant: 'nen1090.auth.tenant',
    email: 'nen1090.auth.email',
    access: 'nen1090.auth.access',
    refresh: 'nen1090.auth.refresh',
  };

  function getHost() {
    try {
      return String(window.location.hostname || '').toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function isLocalHost(host) {
    return host === '127.0.0.1' || host === 'localhost';
  }

  function isLiveHost(host) {
    return (
      host.endsWith('pages.dev') ||
      host === 'nen1090.nl' ||
      host === 'www.nen1090.nl'
    );
  }

  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function forceRuntimeBaseUrl() {
    const host = getHost();
    const mustUseLiveApi = isLocalHost(host) || isLiveHost(host);

    if (mustUseLiveApi) {
      const normalized = normalizeBaseUrl(LIVE_API);
      window.__API_BASE_URL__ = normalized;
      try {
        localStorage.setItem(LS_KEYS.baseUrl, normalized);
      } catch (_) {}
      return normalized;
    }

    const current =
      normalizeBaseUrl(window.__API_BASE_URL__) ||
      normalizeBaseUrl(localStorage.getItem(LS_KEYS.baseUrl)) ||
      normalizeBaseUrl(localStorage.getItem('API_BASE_URL')) ||
      '/api';

    window.__API_BASE_URL__ = current;
    return current;
  }

  function getBaseUrl() {
    const host = getHost();

    if (isLocalHost(host) || isLiveHost(host)) {
      return normalizeBaseUrl(LIVE_API);
    }

    const stored =
      normalizeBaseUrl(localStorage.getItem(LS_KEYS.baseUrl)) ||
      normalizeBaseUrl(localStorage.getItem('API_BASE_URL')) ||
      normalizeBaseUrl(window.__API_BASE_URL__) ||
      '/api';

    return stored;
  }

  function buildApiUrl(base, path) {
    const left = normalizeBaseUrl(base);
    const rawRight = String(path || '');
    const right = rawRight.startsWith('/') ? rawRight : `/${rawRight}`;
    return `${left}${right}`.replace(/\/api\/api\//g, '/api/');
  }

  async function parseResponse(res) {
    const text = await res.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }

  async function apiFetch(path, options = {}) {
    const url = buildApiUrl(getBaseUrl(), path);
    const safeOptions = Object.assign({}, options);
    const method = String(safeOptions.method || 'GET').toUpperCase();
    const headers = Object.assign({}, safeOptions.headers || {});

    if (safeOptions.body && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    const token =
      localStorage.getItem(LS_KEYS.access) ||
      localStorage.getItem('auth_token') ||
      '';

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, Object.assign({}, safeOptions, {
      method,
      headers,
    }));

    const data = await parseResponse(res);

    if (!res.ok) {
      const detail =
        data && typeof data === 'object' && data.detail
          ? data.detail
          : data || `HTTP ${res.status}`;

      const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      err.status = res.status;
      err.data = data;
      err.url = url;
      throw err;
    }

    return data;
  }

  function storeAuth(data, tenant, email) {
    if (data && data.access_token) {
      localStorage.setItem(LS_KEYS.access, data.access_token);
      localStorage.setItem('auth_token', data.access_token);
    }

    if (data && data.refresh_token) {
      localStorage.setItem(LS_KEYS.refresh, data.refresh_token);
    }

    localStorage.setItem(LS_KEYS.tenant, tenant || 'demo');
    localStorage.setItem(LS_KEYS.email, email || '');
    localStorage.setItem(LS_KEYS.baseUrl, getBaseUrl());
  }

  function clearAuth() {
    localStorage.removeItem(LS_KEYS.access);
    localStorage.removeItem(LS_KEYS.refresh);
    localStorage.removeItem(LS_KEYS.tenant);
    localStorage.removeItem(LS_KEYS.email);
    localStorage.removeItem('auth_token');
  }

  async function login(payload) {
    const body = {
      email: String(payload.email || '').trim(),
      password: String(payload.password || ''),
      tenant: String(payload.tenant || 'demo').trim(),
    };

    const data = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    storeAuth(data, body.tenant, body.email);
    return data;
  }

  async function me() {
    return apiFetch('/api/v1/auth/me', {
      method: 'GET',
    });
  }

  function logout() {
    clearAuth();
  }

  forceRuntimeBaseUrl();

  window.Auth = window.Auth || {};
  window.Auth.getBaseUrl = getBaseUrl;
  window.Auth.apiFetch = apiFetch;
  window.Auth.login = login;
  window.Auth.me = me;
  window.Auth.logout = logout;
  window.Auth.clearAuth = clearAuth;
})();