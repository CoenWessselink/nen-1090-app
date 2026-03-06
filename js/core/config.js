/**
 * Runtime config for API base URL.
 *
 * Default (Cloudflare Pages): same-origin proxy via Pages Functions at `/api`.
 * Override:
 *  - localStorage.API_BASE_URL (via set_api.html)
 *  - window.__API_BASE_URL__ (inline script)
 */
export function getApiBaseUrl() {
  const fromLS = localStorage.getItem("API_BASE_URL");
  const fromWindow = window.__API_BASE_URL__;
  const base = fromLS || fromWindow || "/api";
  return String(base).replace(/\/+$/, "");
}
