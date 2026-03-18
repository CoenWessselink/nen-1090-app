import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.LIVE_AUTH_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
const tenant = process.env.LIVE_AUTH_TENANT || process.env.PLAYWRIGHT_AUTH_TENANT || 'demo';
const email = process.env.LIVE_AUTH_EMAIL || process.env.PLAYWRIGHT_AUTH_EMAIL || 'admin@demo.com';
const password = process.env.LIVE_AUTH_PASSWORD || process.env.PLAYWRIGHT_AUTH_PASSWORD || 'Admin123!';
const newPassword = process.env.LIVE_AUTH_NEW_PASSWORD || process.env.PLAYWRIGHT_AUTH_NEW_PASSWORD || 'Admin1234!';
const suppliedResetToken = process.env.LIVE_AUTH_RESET_TOKEN || process.env.PLAYWRIGHT_AUTH_RESET_TOKEN || '';
const outDir = path.resolve(process.cwd(), 'auth-release-evidence');
const outFile = path.join(outDir, 'live-auth-matrix.json');

fs.mkdirSync(outDir, { recursive: true });

const report = {
  generated_at: new Date().toISOString(),
  base_url: baseUrl,
  tenant,
  email,
  steps: [],
  overall_status: 'pending',
};

function sanitizeHeaders(headers = {}) {
  const clone = { ...headers };
  if (clone.Authorization) clone.Authorization = 'Bearer ***';
  return clone;
}

async function callApi(label, url, { method = 'GET', headers = {}, body, expectedStatus, acceptableStatuses } = {}) {
  const allowedStatuses = Array.isArray(acceptableStatuses)
    ? acceptableStatuses
    : expectedStatus === undefined
      ? null
      : [expectedStatus];
  const step = {
    label,
    method,
    url,
    request_headers: sanitizeHeaders(headers),
    expected_statuses: allowedStatuses || ['2xx'],
    status: 'pending',
  };
  report.steps.push(step);
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    step.http_status = response.status;
    step.response = payload;
    const passed = allowedStatuses ? allowedStatuses.includes(response.status) : response.ok;
    step.status = passed ? 'ok' : 'failed';
    return { response, payload, step, passed };
  } catch (error) {
    step.status = 'error';
    step.error = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  let login1;
  let refresh1;
  let resetToken = suppliedResetToken;

  login1 = await callApi('login_initial', `${baseUrl}/auth/login`, {
    method: 'POST',
    body: { tenant, email, password },
  });
  assert(login1.passed, 'Login mislukt');
  assert(login1.payload?.access_token && login1.payload?.refresh_token, 'Login response mist tokens');

  const me1 = await callApi('me_after_login', `${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${login1.payload.access_token}` },
  });
  assert(me1.passed, '/auth/me na login mislukt');

  refresh1 = await callApi('refresh_rotate', `${baseUrl}/auth/refresh`, {
    method: 'POST',
    body: { refresh_token: login1.payload.refresh_token },
  });
  assert(refresh1.passed, 'Refresh mislukt');
  assert(refresh1.payload?.refresh_token && refresh1.payload.refresh_token !== login1.payload.refresh_token, 'Refresh roteerde token niet');

  const refreshReplay = await callApi('refresh_replay_old_token_rejected', `${baseUrl}/auth/refresh`, {
    method: 'POST',
    body: { refresh_token: login1.payload.refresh_token },
    acceptableStatuses: [401],
  });
  assert(refreshReplay.passed, 'Oude refresh token werd niet geweigerd');

  const logout1 = await callApi('logout_current_session', `${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${refresh1.payload.access_token}` },
    body: { refresh_token: refresh1.payload.refresh_token },
  });
  assert(logout1.passed, 'Logout mislukt');

  const refreshAfterLogout = await callApi('refresh_after_logout_rejected', `${baseUrl}/auth/refresh`, {
    method: 'POST',
    body: { refresh_token: refresh1.payload.refresh_token },
    acceptableStatuses: [401],
  });
  assert(refreshAfterLogout.passed, 'Refresh token bleef geldig na logout');

  const forgot = await callApi('forgot_password_request', `${baseUrl}/auth/reset-password/request`, {
    method: 'POST',
    body: { tenant, email },
  });
  assert(forgot.passed, 'Forgot password request mislukt');
  assert(typeof forgot.payload?.message === 'string', 'Forgot password response mist bericht');

  if (!resetToken && typeof forgot.payload?.reset_token === 'string' && forgot.payload.reset_token) {
    resetToken = forgot.payload.reset_token;
  }

  if (resetToken) {
    const reset = await callApi('reset_password_confirm', `${baseUrl}/auth/reset-password/confirm`, {
      method: 'POST',
      body: { token: resetToken, password: newPassword },
    });
    assert(reset.passed, 'Reset password confirm mislukt');

    const loginNewPassword = await callApi('login_with_new_password', `${baseUrl}/auth/login`, {
      method: 'POST',
      body: { tenant, email, password: newPassword },
    });
    assert(loginNewPassword.passed, 'Login met nieuw wachtwoord mislukt');

    const changePassword = await callApi('change_password_back_to_original', `${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginNewPassword.payload.access_token}` },
      body: { current_password: newPassword, new_password: password },
    });
    assert(changePassword.passed, 'Change password terug naar origineel mislukt');

    const refreshAfterChange = await callApi('refresh_after_change_password_rejected', `${baseUrl}/auth/refresh`, {
      method: 'POST',
      body: { refresh_token: loginNewPassword.payload.refresh_token },
      acceptableStatuses: [401],
    });
    assert(refreshAfterChange.passed, 'Refresh token bleef geldig na change password');

    const loginOriginalAgain = await callApi('login_with_original_password_restored', `${baseUrl}/auth/login`, {
      method: 'POST',
      body: { tenant, email, password },
    });
    assert(loginOriginalAgain.passed, 'Herlogin met origineel wachtwoord mislukt');
  } else {
    report.steps.push({
      label: 'reset_change_password_skipped',
      status: 'skipped',
      reason: 'Geen reset token beschikbaar. Zet LIVE_AUTH_RESET_TOKEN of gebruik een non-prod API die reset_token teruggeeft.',
    });
  }

  report.overall_status = report.steps.some((step) => step.status === 'failed' || step.status === 'error') ? 'failed' : 'ok';
}

main()
  .catch((error) => {
    report.overall_status = 'failed';
    report.error = error instanceof Error ? error.message : String(error);
  })
  .finally(() => {
    fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    if (report.overall_status !== 'ok') {
      console.error(`Live auth matrix mislukt. Zie ${outFile}`);
      process.exitCode = 1;
    } else {
      console.log(`Live auth matrix geslaagd. Zie ${outFile}`);
    }
  });
