import { getApiUrl } from './config.js';

function token() {
  try {
    return localStorage.getItem('nen1090.auth.access') || localStorage.getItem('auth_token') || '';
  } catch {
    return '';
  }
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const t = token();
  if (t) headers.set('Authorization', `Bearer ${t}`);

  const res = await fetch(getApiUrl(path), { ...options, headers });
  const text = await res.text().catch(() => '');
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const error = new Error(typeof data === 'string' ? data : JSON.stringify(data || { status: res.status }));
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data;
}

export async function getProjects() {
  const data = await request('/api/v1/projects');
  return normalizeArray(data).map((p) => ({
    id: p.id || p.project_id || p.uuid || '',
    nummer: p.code || p.project_code || p.nummer || '',
    naam: p.name || p.project_name || p.naam || '',
    opdrachtgever: p.client_name || p.customer_name || p.opdrachtgever || '',
    executieklasse: p.execution_class || p.exc_class || p.executieklasse || '',
    acceptatieklasse: p.acceptance_class || p.iso_5817_class || p.acceptatieklasse || '',
    status: p.status || (p.locked ? 'blocked' : 'in_controle'),
    locked: !!p.locked,
    updated_at: p.updated_at || p.modified_at || p.created_at || ''
  }));
}

export async function getDashboardMetrics() {
  return request('/api/v1/ops/metrics-lite');
}

export async function getWelds(projectId = '') {
  const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  const data = await request(`/api/v1/welds${qs}`);
  return normalizeArray(data).map((w) => ({
    id: w.id || w.weld_id || '',
    weld_number: w.weld_number || w.number || w.code || '',
    project_name: w.project_name || w.project?.name || w.project || '',
    material: w.material || w.material_grade || '-',
    inspection: w.inspection_type || w.inspection || '-',
    status: w.status || 'in_controle',
    segment: w.segment || w.location || w.part_name || ''
  }));
}

export async function getCePreview(projectId) {
  if (!projectId) return null;
  return request(`/api/v1/projects/${encodeURIComponent(projectId)}/ce-dossier/preview`);
}

export async function getTenantStatus() {
  try { return await request('/api/v1/tenant-status'); } catch { return null; }
}

export function pickActiveProjectId(projects = []) {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('project');
    if (fromQuery) return fromQuery;
  } catch {}
  try {
    const state = window.CWS?.getState?.();
    if (state?.ui?.activeProjectId) return state.ui.activeProjectId;
  } catch {}
  return projects[0]?.id || '';
}
