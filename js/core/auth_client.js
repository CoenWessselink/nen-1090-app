/*
  NEN1090 Phase 3 – Auth Client (frontend)

  Purpose:
  - Keep the existing static UI (no rebuild) but add REAL login against the Phase 3 backend.
  - Store tokens in localStorage so the UI can call protected endpoints later.

  Notes:
  - This file is intentionally dependency-free (vanilla JS).
  - Data modules (projects/welds/etc.) are still local/SSOT for now; Phase 3 first milestone is auth + DB connectivity.
*/

(function () {
  // Ensure a global API base is available on ALL pages (including /layers/*).
  // For Cloudflare Pages, we prefer same-origin proxy: /api
  try {
    window.__API_BASE_URL__ = window.__API_BASE_URL__
      || localStorage.getItem('API_BASE_URL')
      || localStorage.getItem('nen1090.api.baseUrl')
      || 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';
  } catch (_) {
    window.__API_BASE_URL__ = window.__API_BASE_URL__ || 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';
  }

  const LS_KEYS = {
    baseUrl: 'nen1090.api.baseUrl',
    tenant: 'nen1090.auth.tenant',
    email: 'nen1090.auth.email',
    access: 'nen1090.auth.access',
    refresh: 'nen1090.auth.refresh',
  };

  function getUserEmail() {
    return localStorage.getItem(LS_KEYS.email) || '';
  }

  function setUserEmail(email) {
    const clean = (email || '').trim();
    if (clean) localStorage.setItem(LS_KEYS.email, clean);
  }

  function getBaseUrl() {
    return (localStorage.getItem(LS_KEYS.baseUrl) || localStorage.getItem('API_BASE_URL') || window.__API_BASE_URL__ || '/api').replace(/\/$/, '');
  }

  function setBaseUrl(url) {
    const clean = (url || '').trim().replace(/\/$/, '');
    if (clean) localStorage.setItem(LS_KEYS.baseUrl, clean);
  }

  function getTenant() {
    return localStorage.getItem(LS_KEYS.tenant) || 'demo';
  }

  function setTenant(t) {
    const clean = (t || '').trim();
    if (clean) localStorage.setItem(LS_KEYS.tenant, clean);
  }

  function getAccessToken() {
    return localStorage.getItem(LS_KEYS.access) || '';
  }

  function getRefreshToken() {
    return localStorage.getItem(LS_KEYS.refresh) || '';
  }

  function setTokens(access, refresh) {
    if (access) {
      localStorage.setItem(LS_KEYS.access, access);
      // Backwards-compat / convenience key (some scripts/checks expect this)
      localStorage.setItem('auth_token', access);
    }
    if (refresh) localStorage.setItem(LS_KEYS.refresh, refresh);
  }

  function clearTokens() {
    localStorage.removeItem(LS_KEYS.access);
    localStorage.removeItem('auth_token');
    localStorage.removeItem(LS_KEYS.refresh);
    localStorage.removeItem(LS_KEYS.email);
  }

  function _jwtExpMs(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      if (!payload || !payload.exp) return null;
      return payload.exp * 1000;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    const t = getAccessToken();
    if (!t) return false;
    const exp = _jwtExpMs(t);
    if (!exp) return true;
    return Date.now() < (exp - 30_000);
  }

  async function _refreshAccessToken() {
    const refresh_token = getRefreshToken();
    if (!refresh_token) throw new Error('No refresh token');
    const base = getBaseUrl();
    const url = base + '/api/v1/auth/refresh';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token })
    });
    const text = await res.text().catch(()=> '');
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = { detail: text || null }; }
    if (!res.ok) {
      try { clearTokens(); } catch {}
      const err = new Error((data && data.detail) ? (Array.isArray(data.detail) ? data.detail.join(' ') : String(data.detail)) : (`HTTP ${res.status}`));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    if (!data || !data.access_token) {
      try { clearTokens(); } catch {}
      throw new Error('Refresh failed (no access_token)');
    }
    setTokens(data.access_token, data.refresh_token || refresh_token);
    return data;
  }

  async function apiFetch(path, options = {}) {
    const base = getBaseUrl();
    const url = base + path;
    // internal flag to avoid infinite refresh loops
    const _retry = !!options._retry;
    const safeOptions = Object.assign({}, options);
    delete safeOptions._retry;

    const headers = Object.assign({ 'Content-Type': 'application/json' }, safeOptions.headers || {});

    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(url, Object.assign({}, safeOptions, { headers }));
    } catch (e) {
      // When the backend isn't running (ERR_CONNECTION_REFUSED), don't crash the UI.
      const err = new Error('API_OFFLINE');
      err.code = 'API_OFFLINE';
      err.cause = e;
      throw err;
    }

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      try {
        const d = (data && data.detail) ? data.detail : null;
        const detailStr = d ? (typeof d === "string" ? d : JSON.stringify(d)) : "";
        const readonly = (res.status === 403) && ((typeof d === "object" && d && (d.code === "TENANT_READONLY")) || (/read-?only/i.test(detailStr)));
        if (readonly) {
          localStorage.setItem("TENANT_READONLY", "1");
          try { if (typeof d === "object" && d && d.reasons) { localStorage.setItem("TENANT_READONLY_REASONS", JSON.stringify(d.reasons)); } } catch {}
          window.dispatchEvent(new CustomEvent("tenant:readonly", { detail: { status: res.status, detail: d || detailStr } }));
        }
      } catch {}
      // Auto-refresh once on 401 when a refresh token exists.
      // Fixes: access token expired between page loads -> "Invalid token".
      if (res.status === 401 && !_retry && !String(path).includes('/api/v1/auth/login') && !String(path).includes('/api/v1/auth/refresh') && getRefreshToken()) {
        await _refreshAccessToken();
        return apiFetch(path, Object.assign({}, options, { _retry: true }));
      }

      // If token is stale/invalid, reset client auth to avoid endless 401 loops.
      if (res.status === 401 && !String(path).includes('/api/v1/auth/login') && !String(path).includes('/api/v1/auth/refresh')) {
        try { clearTokens(); } catch (_) {}
      }
      const err = new Error((data && data.detail) ? JSON.stringify(data.detail) : (`HTTP ${res.status}`));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function _decodeJwtPayload(token) {
    try {
      const parts = (token || '').split('.');
      if (parts.length < 2) return null;
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function getTenantId() {
    const tok = getAccessToken();
    const p = _decodeJwtPayload(tok);
    return (p && (p.tenant_id || p.tenantId)) ? (p.tenant_id || p.tenantId) : '';
  }

  async function apiFetchForm(path, formData, options = {}) {
    const base = getBaseUrl();
    const url = base + path;
    const headers = Object.assign({}, options.headers || {});
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Let the browser set Content-Type incl boundary
    const res = await fetch(url, Object.assign({}, options, { method: options.method || 'POST', headers, body: formData }));
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const err = new Error((data && data.detail) ? JSON.stringify(data.detail) : (`HTTP ${res.status}`));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function apiFetchBlob(path) {
    const base = getBaseUrl();
    const url = base + path;
    const headers = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return { blob, filename: (res.headers.get('content-disposition')||'') };
  }

  async function health() {
    // Use the stable infra endpoint.
    // /api/v1/health may be protected/unstable during deploys and is not needed for UI.
    return await apiFetch('/health', { method: 'GET' });
  }

  async function login({ email, password, tenant }) {
    const body = { email, password, tenant };
    const data = await apiFetch('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) });
    setTokens(data.access_token, data.refresh_token);
    setTenant(tenant);
    setUserEmail(email);
    return data;
  }

  async function me() {
    // Avoid spamming 401 when starting the UI without tokens.
    const access_token = getAccessToken();
    const refresh_token = getRefreshToken();
    if (!access_token && !refresh_token) return null;

    const data = await apiFetch('/api/v1/auth/me', { method: 'GET' });
    if (data && data.email) setUserEmail(data.email);
    return data;
  }

  async function tenantStatus() {
    return apiFetch('/api/v1/tenant/status', { method: 'GET' });
  }


  async function refresh() {
    const refresh_token = getRefreshToken();
    if (!refresh_token) throw new Error('No refresh token');
    const data = await apiFetch('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) });
    setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async function logout() {
    const refresh_token = getRefreshToken();
    try {
      if (refresh_token) {
        await apiFetch('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token }) });
      }
    } finally {
      clearTokens();
    }
  }

  window.Auth = {
    getBaseUrl,
    setBaseUrl,
    getTenant,
    setTenant,
    getUserEmail,
    isLoggedIn,
    getAccessToken,
    getRefreshToken,
    clearTokens,
    health,
    login,
    me,
    tenantStatus,
    refresh,
    logout,
    // Projects API (Phase 3.1)
    projects: {
      list: () => apiFetch('/api/v1/projects', { method: 'GET' }),
      create: (payload) => apiFetch('/api/v1/projects', { method: 'POST', body: JSON.stringify(payload) }),
      update: (id, payload) => apiFetch(`/api/v1/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      patch: (id, payload) => apiFetch(`/api/v1/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
      remove: (id) => apiFetch(`/api/v1/projects/${id}`, { method: 'DELETE' }),
      seedDemo: () => apiFetch('/api/v1/projects/seed_demo', { method: 'POST' }),
      clearAll: () => apiFetch('/api/v1/projects', { method: 'DELETE' }),
    },
    // Welds API (Phase 3.2)
    welds: {
      list: (projectId) => apiFetch(`/api/v1/projects/${projectId}/welds`, { method: 'GET' }),
      create: (projectId, payload) => apiFetch(`/api/v1/projects/${projectId}/welds`, { method: 'POST', body: JSON.stringify(payload) }),
      update: (projectId, weldId, payload) => apiFetch(`/api/v1/projects/${projectId}/welds/${weldId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
      remove: (projectId, weldId) => apiFetch(`/api/v1/projects/${projectId}/welds/${weldId}`, { method: 'DELETE' }),
      seedDemo: () => apiFetch('/api/v1/welds/seed_demo', { method: 'POST' }),
      clearAll: () => apiFetch('/api/v1/welds', { method: 'DELETE' }),
    },

    // Inspections API (Phase 3.3)
    inspections: {
      getForWeld: (weldUuid) => apiFetch(`/api/v1/welds/${weldUuid}/inspection`, { method: 'GET' }),
      createForWeld: (weldUuid, payload) => apiFetch(`/api/v1/welds/${weldUuid}/inspection`, { method: 'POST', body: JSON.stringify(payload) }),
      upsertForWeld: (weldUuid, payload) => apiFetch(`/api/v1/welds/${weldUuid}/inspection`, { method: 'PUT', body: JSON.stringify(payload) }),
      updateById: (inspectionId, payload) => apiFetch(`/api/v1/inspections/${inspectionId}`, { method: 'PUT', body: JSON.stringify(payload) }),
      resetToNormForWeld: (weldUuid, payload) => apiFetch(`/api/v1/welds/${weldUuid}/inspection/reset-to-norm`, { method: 'POST', body: JSON.stringify(payload||{}) }),
    },

    // Settings masterdata (WPS/WPQR, Materialen, Lassers)
    settings: {
      wps: {
        list: () => apiFetch('/api/v1/settings/wps', { method: 'GET' }),
        create: (payload) => apiFetch('/api/v1/settings/wps', { method: 'POST', body: JSON.stringify(payload) }),
        patch: (id, payload) => apiFetch(`/api/v1/settings/wps/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
        remove: (id) => apiFetch(`/api/v1/settings/wps/${id}`, { method: 'DELETE' }),
      },
      materials: {
        list: () => apiFetch('/api/v1/settings/materials', { method: 'GET' }),
        create: (payload) => apiFetch('/api/v1/settings/materials', { method: 'POST', body: JSON.stringify(payload) }),
        patch: (id, payload) => apiFetch(`/api/v1/settings/materials/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
        remove: (id) => apiFetch(`/api/v1/settings/materials/${id}`, { method: 'DELETE' }),
      },
      welders: {
        list: () => apiFetch('/api/v1/settings/welders', { method: 'GET' }),
        create: (payload) => apiFetch('/api/v1/settings/welders', { method: 'POST', body: JSON.stringify(payload) }),
        patch: (id, payload) => apiFetch(`/api/v1/settings/welders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
        remove: (id) => apiFetch(`/api/v1/settings/welders/${id}`, { method: 'DELETE' }),
      },
    },

    // Phase 1: EXC templates + bulk add from settings
    phase1: {
      listInspectionTemplates: (exc) => apiFetch(`/api/v1/settings/inspection-templates${exc ? `?exc=${encodeURIComponent(exc)}` : ''}`, { method: 'GET' }),
      createInspectionTemplate: (payload) => apiFetch(`/api/v1/settings/inspection-templates`, { method: 'POST', body: JSON.stringify(payload) }),
      patchInspectionTemplate: (id, payload) => apiFetch(`/api/v1/settings/inspection-templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
      applyInspectionTemplate: (projectId, payload) => apiFetch(`/api/v1/projects/${projectId}/apply-inspection-template`, { method: 'POST', body: JSON.stringify(payload) }),

      addAllWps: (projectId) => apiFetch(`/api/v1/projects/${projectId}/add-all-wps`, { method: 'POST' }),
      addAllMaterials: (projectId) => apiFetch(`/api/v1/projects/${projectId}/add-all-materials`, { method: 'POST' }),
      addAllWelders: (projectId) => apiFetch(`/api/v1/projects/${projectId}/add-all-welders`, { method: 'POST' }),
      addAllLascontrole: (projectId) => apiFetch(`/api/v1/projects/${projectId}/add-all-lascontrole`, { method: 'POST' }),

      selectedWps: (projectId) => apiFetch(`/api/v1/projects/${projectId}/selected/wps`, { method: 'GET' }),
      selectedMaterials: (projectId) => apiFetch(`/api/v1/projects/${projectId}/selected/materials`, { method: 'GET' }),
      selectedWelders: (projectId) => apiFetch(`/api/v1/projects/${projectId}/selected/welders`, { method: 'GET' }),
    },

    // Phase 2: Attachments (uniform)
    attachments: {
      tenantId: () => getTenantId(),
      upload: ({ files, scope_type, scope_id, kind, meta, valid_until }) => {
        const fd = new FormData();
        (files || []).forEach(f => fd.append('files', f));
        fd.append('scope_type', scope_type);
        fd.append('scope_id', scope_id);
        fd.append('kind', kind || 'other');
        if (meta) fd.append('meta', typeof meta === 'string' ? meta : JSON.stringify(meta));
        if (valid_until) fd.append('valid_until', valid_until);
        return apiFetchForm('/api/v1/attachments/upload', fd, { method: 'POST' });
      },
      list: ({ scope_type, scope_id, kind }) => {
        const qs = new URLSearchParams();
        if (scope_type) qs.set('scope_type', scope_type);
        if (scope_id) qs.set('scope_id', scope_id);
        if (kind) qs.set('kind', kind);
        return apiFetch(`/api/v1/attachments?${qs.toString()}`, { method: 'GET' });
      },
      remove: (id) => apiFetch(`/api/v1/attachments/${id}`, { method: 'DELETE' }),
      downloadBlob: (id) => apiFetchBlob(`/api/v1/attachments/${id}/download`),
    },

    // Phase 3: Lascontrole bulk approve
    phase3: {
      approveAllLascontrole: (projectId, payload) => apiFetch(`/api/v1/projects/${projectId}/lascontrole/approve_all`, { method: 'POST', body: JSON.stringify(payload) }),
    },


    platform: {
      tenants: {
        list: () => apiFetch('/api/v1/platform/tenants', { method: 'GET' }),
        get: (tenantId) => apiFetch(`/api/v1/platform/tenants/${tenantId}`, { method: 'GET' }),
        create: (payload) => apiFetch('/api/v1/platform/tenants', { method: 'POST', body: JSON.stringify(payload) }),
        patch: (tenantId, payload) => apiFetch(`/api/v1/platform/tenants/${tenantId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
        startTrial: (tenantId, payload) => apiFetch(`/api/v1/platform/tenants/${tenantId}/trial/start`, { method: 'POST', body: JSON.stringify(payload || {}) }),
        forceLogout: (tenantId) => apiFetch(`/api/v1/platform/tenants/${tenantId}/force_logout`, { method: 'POST' }),
        users: {
          list: (tenantId) => apiFetch(`/api/v1/platform/tenants/${tenantId}/users`, { method: 'GET' }),
          create: (tenantId, payload) => apiFetch(`/api/v1/platform/tenants/${tenantId}/users`, { method: 'POST', body: JSON.stringify(payload) }),
          patch: (tenantId, userId, payload) => apiFetch(`/api/v1/platform/tenants/${tenantId}/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
        },
        payments: (tenantId) => apiFetch(`/api/v1/platform/tenants/${tenantId}/payments`, { method: 'GET' }),
        audit: (tenantId) => apiFetch(`/api/v1/platform/tenants/${tenantId}/audit`, { method: 'GET' }),
        exportCsv: () => apiFetch('/api/v1/platform/tenants.csv', { method: 'GET' }),
        billing: {
          link: (tenantId, payload) => apiFetch(`/api/v1/platform/tenants/${tenantId}/billing/link`, { method: 'POST', body: JSON.stringify(payload || {}) }),
          previewSeats: (tenantId, payload) => apiFetch(`/api/v1/platform/tenants/${tenantId}/billing/seats`, { method: 'POST', body: JSON.stringify(payload || {}) }),
          applySeats: (tenantId, payload) => apiFetch(`/api/v1/platform/tenants/${tenantId}/billing/seats`, { method: 'POST', body: JSON.stringify(payload || {}) }),
          activateYear: (tenantId) => apiFetch(`/api/v1/platform/tenants/${tenantId}/billing/activate_year`, { method: 'POST' }),
          cancel: (tenantId) => apiFetch(`/api/v1/platform/tenants/${tenantId}/billing/cancel`, { method: 'POST' }),
        },
        paymentsManual: (tenantId, payload) => apiFetch(`/api/v1/platform/tenants/${tenantId}/payments/manual`, { method: 'POST', body: JSON.stringify(payload) }),
      }
    },
    // low-level helper (kept private-ish but useful for debugging)
    _apiFetch: apiFetch,
  };
})();
