// Cloudflare Pages Function — NEN-1090 API proxy
// Eén enkele onRequest export (dubbele definitie verwijderd).
// Gebruikt HttpOnly-cookie sessies voor veilige auth.
//
// Variabelen (stel in via Cloudflare Pages environment variables):
//   AZURE_API_ORIGIN  — bijv. https://nen1090-api-prod-....azurewebsites.net
//   (BACKEND_API_BASE is backwards-compatible alias)

const COOKIE_ACCESS  = "nen1090_access";
const COOKIE_REFRESH = "nen1090_refresh";

// Access token TTL in seconden (moet matchen met backend JWT_ACCESS_TTL_MIN * 60)
const ACCESS_TTL_SEC  = 900;   // 15 minuten
const REFRESH_TTL_SEC = 1209600; // 14 dagen

function getAzureOrigin(env) {
  const origin = (env && (env.AZURE_API_ORIGIN || env.BACKEND_API_BASE)) || "";
  if (!origin) {
    throw new Error("AZURE_API_ORIGIN omgevingsvariabele is niet ingesteld.");
  }
  return origin.replace(/\/+$/, "");
}

function parseCookies(cookieHeader = "") {
  const out = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k.trim()] = decodeURIComponent(v.join("=") || "");
  }
  return out;
}

function isHttps(url) {
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}

function cookieAttrs(reqUrl) {
  const secure = isHttps(reqUrl) ? "; Secure" : "";
  return `; HttpOnly; SameSite=Lax; Path=/${secure}`;
}

function setCookieHeader(name, value, reqUrl, maxAgeSeconds) {
  const base = `${name}=${encodeURIComponent(value || "")}${cookieAttrs(reqUrl)}`;
  return typeof maxAgeSeconds === "number" ? `${base}; Max-Age=${maxAgeSeconds}` : base;
}

function clearCookieHeaders(reqUrl) {
  return [
    setCookieHeader(COOKIE_ACCESS,  "", reqUrl, 0),
    setCookieHeader(COOKIE_REFRESH, "", reqUrl, 0),
  ];
}

async function readJsonSafe(res) {
  const txt = await res.text().catch(() => "");
  try { return { ok: true, json: JSON.parse(txt || "{}"), text: txt }; }
  catch { return { ok: false, json: null, text: txt }; }
}

function buildUpstreamRequest(req, azureOrigin) {
  const u = new URL(req.url);
  const target = new URL(u.pathname + u.search, azureOrigin);
  const h = new Headers(req.headers);
  // Verwijder hop-by-hop headers
  for (const key of ["host", "connection", "content-length", "cf-connecting-ip",
                      "cf-ipcountry", "cf-ray", "x-forwarded-proto", "x-forwarded-host"]) {
    h.delete(key);
  }
  return { target: target.toString(), headers: h };
}

async function forwardWithAuth(req, azureOrigin, accessToken, extraHeaders = {}) {
  const { target, headers } = buildUpstreamRequest(req, azureOrigin);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  for (const [k, v] of Object.entries(extraHeaders)) {
    if (v === null || v === undefined || v === "") headers.delete(k);
    else headers.set(k, v);
  }
  return fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    redirect: "manual",
  });
}

async function refreshTokens(azureOrigin, refreshToken) {
  if (!refreshToken) return null;
  const res = await fetch(`${azureOrigin}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const { json } = await readJsonSafe(res);
  const access  = json?.access_token;
  const refresh = json?.refresh_token || refreshToken;
  if (!access) return null;
  return { access, refresh };
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  let azureOrigin;

  try {
    azureOrigin = getAzureOrigin(env);
  } catch {
    return new Response(
      JSON.stringify({ error: "Backend niet geconfigureerd. Stel AZURE_API_ORIGIN in." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const cookies = parseCookies(request.headers.get("Cookie") || "");
  let access  = cookies[COOKIE_ACCESS]  || "";
  let refresh = cookies[COOKIE_REFRESH] || "";

  // ── CORS preflight ───────────────────────────────────────────────────
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": url.origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers":
          request.headers.get("Access-Control-Request-Headers") ||
          "Content-Type, Authorization, X-Tenant, X-Tenant-Id",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Vary": "Origin",
      },
    });
  }

  // ── Logout: wis cookies lokaal en stuur door naar backend ────────────
  if (url.pathname === "/api/v1/auth/logout") {
    // Stuur logout naar backend (best-effort)
    await forwardWithAuth(request, azureOrigin, access).catch(() => null);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearCookieHeaders(request.url).join(", "),
      },
    });
  }

  // ── Login: verwerk response en zet cookies ───────────────────────────
  if (url.pathname === "/api/v1/auth/login" && request.method === "POST") {
    const upstream = await forwardWithAuth(request, azureOrigin, "");
    if (!upstream.ok) {
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { json } = await readJsonSafe(upstream);
    const newAccess  = json?.access_token;
    const newRefresh = json?.refresh_token;
    const headers = new Headers({ "Content-Type": "application/json" });
    if (newAccess) {
      headers.append("Set-Cookie",
        setCookieHeader(COOKIE_ACCESS, newAccess, request.url, ACCESS_TTL_SEC));
    }
    if (newRefresh) {
      headers.append("Set-Cookie",
        setCookieHeader(COOKIE_REFRESH, newRefresh, request.url, REFRESH_TTL_SEC));
    }
    // Stuur ook tokens terug in body voor JS-clients die ze willen opslaan
    return new Response(JSON.stringify(json), { status: 200, headers });
  }

  // ── Token refresh: hernieuw cookies ─────────────────────────────────
  if (url.pathname === "/api/v1/auth/refresh" && request.method === "POST") {
    // Gebruik refresh-token uit cookie als body leeg is
    let body = await request.text().catch(() => "");
    if (!body || body === "{}") {
      body = JSON.stringify({ refresh_token: refresh });
    }
    const upstream = await fetch(`${azureOrigin}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const { json } = await readJsonSafe(upstream);
    const headers = new Headers({ "Content-Type": "application/json" });
    if (upstream.ok && json?.access_token) {
      headers.append("Set-Cookie",
        setCookieHeader(COOKIE_ACCESS, json.access_token, request.url, ACCESS_TTL_SEC));
      if (json.refresh_token) {
        headers.append("Set-Cookie",
          setCookieHeader(COOKIE_REFRESH, json.refresh_token, request.url, REFRESH_TTL_SEC));
      }
    } else if (!upstream.ok) {
      // Refresh mislukt: wis cookies
      for (const c of clearCookieHeaders(request.url)) {
        headers.append("Set-Cookie", c);
      }
    }
    return new Response(JSON.stringify(json || {}), { status: upstream.status, headers });
  }

  // ── Alle andere requests: injecteer access-token uit cookie ──────────
  // Als access-token ontbreekt maar refresh-token aanwezig: probeer te vernieuwen
  if (!access && refresh) {
    const refreshed = await refreshTokens(azureOrigin, refresh);
    if (refreshed) {
      access  = refreshed.access;
      refresh = refreshed.refresh;
    }
  }

  const upstream = await forwardWithAuth(request, azureOrigin, access);

  // Als 401 én refresh beschikbaar: eenmalig retry met verse tokens
  if (upstream.status === 401 && refresh) {
    const refreshed = await refreshTokens(azureOrigin, refresh);
    if (refreshed) {
      const retried = await forwardWithAuth(request, azureOrigin, refreshed.access);
      const responseHeaders = new Headers(retried.headers);
      responseHeaders.set("Access-Control-Allow-Origin", url.origin);
      responseHeaders.set("Access-Control-Allow-Credentials", "true");
      responseHeaders.append("Vary", "Origin");
      responseHeaders.append("Set-Cookie",
        setCookieHeader(COOKIE_ACCESS, refreshed.access, request.url, ACCESS_TTL_SEC));
      responseHeaders.append("Set-Cookie",
        setCookieHeader(COOKIE_REFRESH, refreshed.refresh, request.url, REFRESH_TTL_SEC));
      return new Response(retried.body, {
        status: retried.status,
        statusText: retried.statusText,
        headers: responseHeaders,
      });
    }
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("Access-Control-Allow-Origin", url.origin);
  responseHeaders.set("Access-Control-Allow-Credentials", "true");
  responseHeaders.append("Vary", "Origin");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
