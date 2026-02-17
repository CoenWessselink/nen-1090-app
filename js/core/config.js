/**
 * Runtime config for API base URL.
 * - Cloudflare Pages: set window.__API_BASE_URL__ via <script> in index.html if desired
 * - Prod default: https://api.nen1090.nl (zet localStorage.API_BASE_URL voor dev/staging)
 */
export function getApiBaseUrl() {
  return (window.__API_BASE_URL__ || localStorage.getItem("API_BASE_URL") || "").replace(/\/+$/, "");
}
