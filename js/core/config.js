/**
 * Centrale runtime config voor de app + Pages proxy.
 * Voorkeur: same-origin /api via Cloudflare Pages Functions.
 * Fallback lokaal/live: directe Azure API.
 */
const LIVE_API = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';
const LS_KEYS = ['nen1090.api.baseUrl', 'API_BASE_URL'];

function normalize(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function hostName() {
  try { return String(window.location.hostname || '').toLowerCase(); } catch { return ''; }
}

function isLocal(host) {
  return host === '127.0.0.1' || host === 'localhost';
}

function getStoredBaseUrl() {
  for (const key of LS_KEYS) {
    try {
      const value = normalize(localStorage.getItem(key));
      if (value) return value;
    } catch {}
  }
  return '';
}

export function getApiBaseUrl() {
  const host = hostName();
  const fromWindow = normalize(window.__API_BASE_URL__);
  const fromStorage = getStoredBaseUrl();
  const fallback = isLocal(host) ? LIVE_API : '/api';
  return normalize(fromWindow || fromStorage || fallback);
}

export function setApiBaseUrl(value) {
  const normalized = normalize(value);
  if (!normalized) return getApiBaseUrl();
  window.__API_BASE_URL__ = normalized;
  for (const key of LS_KEYS) {
    try { localStorage.setItem(key, normalized); } catch {}
  }
  return normalized;
}

export function getApiUrl(path = '') {
  const base = getApiBaseUrl();
  const suffix = String(path || '').startsWith('/') ? String(path || '') : `/${String(path || '')}`;
  return `${base}${suffix}`.replace(/\/api\/api\//g, '/api/');
}

window.__API_BASE_URL__ = window.__API_BASE_URL__ || getStoredBaseUrl() || (isLocal(hostName()) ? LIVE_API : '/api');
