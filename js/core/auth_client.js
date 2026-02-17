/*
  NEN1090 Auth Client (frontend) — Pages-proof (Cloudflare Pages + Functions proxy)

  - Default API base: "/api"  (dus via Pages proxy)
  - Tokens in localStorage (access + refresh)
  - apiFetch voegt automatisch Authorization: Bearer <access> toe
*/

(function () {
  "use strict";

  // ---------- Config / storage keys ----------
  const LS_KEYS = {
    baseUrl: "nen1090.api.baseUrl",     // optional override (no trailing slash)
    tenant: "nen1090.auth.tenant",
    email: "nen1090.auth.email",
    access: "nen1090.auth.access",
    refresh: "nen1090.auth.refresh",
  };

  function _safeGet(key) {
    try { return localStorage.getItem(key) || ""; } catch (_) { return ""; }
  }
  function _safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (_) {}
  }
  function _safeRemove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  function _trimSlashEnd(s) {
    return (s || "").replace(/\/+$/, "");
  }

  // ---------- API base resolution ----------
  // Priority:
  // 1) window.__API_BASE_URL__  (set by config.js or other bootstrap)
  // 2) localStorage overrides
  // 3) default "/api" (Pages proxy)
  function getBaseUrl() {
    const fromWindow = (typeof window !== "undefined" && window.__API_BASE_URL__) ? String(window.__API_BASE_URL__) : "";
    const fromLS = _safeGet("API_BASE_URL") || _safeGet(LS_KEYS.baseUrl);
    const base = _trimSlashEnd(fromWindow || fromLS || "/api");
    return base || "/api";
  }

  function setBaseUrl(url) {
    const clean = _trimSlashEnd(String(url || "").trim());
    if (!clean) return;
    _safeSet(LS_KEYS.baseUrl, clean);
    try { window.__API_BASE_URL__ = clean; } catch (_) {}
  }

  // Ensure global base is set (important for pages like /layers/*)
  try {
    window.__API_BASE_URL__ = window.__API_BASE_URL__ || getBaseUrl();
  } catch (_) {}

  // ---------- Tenant ----------
  function getTenant() {
    return _safeGet(LS_KEYS.tenant) || "demo";
  }
  function setTenant(t) {
    const clean = String(t || "").trim();
    if (clean) _safeSet(LS_KEYS.tenant, clean);
  }

  // ---------- Tokens ----------
  function getAccessToken() {
    // Some legacy scripts may use "auth_token"
    return _safeGet(LS_KEYS.access) || _safeGet("auth_token") || "";
  }
  function getRefreshToken() {
    return _safeGet(LS_KEYS.refresh) || "";
  }

  function setTokens(access, refresh) {
    if (access) {
      _safeSet(LS_KEYS.access, access);
      _safeSet("auth_token", access); // backwards compat
    }
    if (refresh) _safeSet(LS_KEYS.refresh, refresh);
  }

  function clearTokens() {
    _safeRemove(LS_KEYS.access);
    _safeRemove("auth_token");
    _safeRemove(LS_KEYS.refresh);
    _safeRemove(LS_KEYS.email);
  }

  // ---------- Helpers ----------
  function buildUrl(path) {
    const base = getBaseUrl(); // like "/api" or "https://...."
    const p = String(path || "");
    if (!p) return base;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    if (p.startsWith("/")) return base + p;
    return base + "/" + p;
  }

  async function _readJsonOrText(resp) {
    const ct = (resp.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      try { return await resp.json(); } catch (_) { return null; }
    }
    try { return await resp.text(); } catch (_) { return null; }
  }

  // Core fetch wrapper
  async function apiFetch(path, opts) {
    const o = opts || {};
    const headers = new Headers(o.headers || {});
    headers.set("Accept", headers.get("Accept") || "application/json");

    // Attach bearer if we have it
    const token = getAccessToken();
    if (token && !headers.get("Authorization")) {
      headers.set("Authorization", "Bearer " + token);
    }

    // Default JSON body handling
    let body = o.body;
    if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob)) {
      headers.set("Content-Type", headers.get("Content-Type") || "application/json");
      body = JSON.stringify(body);
    }

    const url = buildUrl(path);
    const resp = await fetch(url, {
      method: o.method || "GET",
      headers,
      body,
      credentials: "same-origin", // safe default (cookie not required, but ok)
    });

    return resp;
  }

  // ---------- Auth endpoints ----------
  // Expected endpoints (based on your earlier tests):
  // - POST /api/v1/auth/login
  // - POST /api/v1/auth/logout (optional)
  // - GET  /api/v1/auth/me
  // Some backends may return {access_token, refresh_token} or {access, refresh}.

  function _extractTokens(payload) {
    if (!payload || typeof payload !== "object") return { access: "", refresh: "" };
    const access =
      payload.access_token ||
      payload.accessToken ||
      payload.access ||
      payload.token ||
      "";
    const refresh =
      payload.refresh_token ||
      payload.refreshToken ||
      payload.refresh ||
      "";
    return { access: String(access || ""), refresh: String(refresh || "") };
  }

  async function login(email, password, tenant) {
    const t = tenant || getTenant();
    if (tenant) setTenant(tenant);

    const payload = {
      email: String(email || "").trim(),
      password: String(password || ""),
      tenant: String(t || "demo"),
    };

    // Try /api/v1/auth/login first (your current stack)
    const resp = await apiFetch("/v1/auth/login", { method: "POST", body: payload });

    const data = await _readJsonOrText(resp);
    if (!resp.ok) {
      const msg = (data && data.detail) ? data.detail : (typeof data === "string" ? data : "Login failed");
      throw new Error(msg);
    }

    const toks = _extractTokens(data);
    if (toks.access) setTokens(toks.access, toks.refresh);
    _safeSet(LS_KEYS.email, payload.email);

    return { ok: true, data };
  }

  async function logout() {
    // Try to call backend logout, but always clear local tokens
    try {
      await apiFetch("/v1/auth/logout", { method: "POST" });
    } catch (_) {}
    clearTokens();
    return { ok: true };
  }

  async function me() {
    const resp = await apiFetch("/v1/auth/me", { method: "GET" });
    const data = await _readJsonOrText(resp);
    if (!resp.ok) {
      const msg = (data && data.detail) ? data.detail : (typeof data === "string" ? data : "Not logged in");
      const err = new Error(msg);
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  // ---------- UI helpers (optional) ----------
  function isLoggedIn() {
    return !!getAccessToken();
  }

  // Expose globally so other scripts can call it
  window.NEN1090Auth = {
    // base url
    getBaseUrl,
    setBaseUrl,

    // tenant
    getTenant,
    setTenant,

    // tokens
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,

    // api wrapper
    apiFetch,

    // auth
    login,
    logout,
    me,

    // state
    isLoggedIn,
  };

  // Small console hint for debugging
  try {
    // Only log once
    if (!window.__NEN1090_AUTH_READY__) {
      window.__NEN1090_AUTH_READY__ = true;
      console.log("[NEN1090Auth] ready. API_BASE =", getBaseUrl());
    }
  } catch (_) {}
})();
