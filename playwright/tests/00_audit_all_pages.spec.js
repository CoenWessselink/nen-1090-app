const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';

async function captureConsoleAndNetwork(page) {
  const consoleErrors = [];
  const failedRequests = [];
  const requestFailures = [];

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(String(err && err.message ? err.message : err));
  });

  page.on('requestfailed', (req) => {
    try{
      const url = req.url();
      // Ignore favicon noise
      if (url.includes('favicon')) return;
      requestFailures.push({ url, failure: String(req.failure()?.errorText || 'requestfailed') });
    }catch(_){ }
  });

  page.on('response', async (res) => {
    const status = res.status();
    if (status >= 400) {
      const url = res.url();
      // Ignore favicon noise
      if (url.includes('favicon')) return;
      // Ignore expected 401 on /auth/me when not logged in
      if (status === 401 && url.includes('/api/v1/auth/me')) return;

      let body = '';
      try { body = await res.text(); } catch (_) {}
      failedRequests.push({ status, url, body: body.slice(0, 400) });
    }
  });

  return { consoleErrors, failedRequests, requestFailures };
}

test('Audit: alle hoofdschermen laden zonder console errors en zonder 404/500', async ({ page }) => {
  const { consoleErrors, failedRequests, requestFailures } = await captureConsoleAndNetwork(page);

  // Start at home
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body[data-app-ready="1"]', { timeout: 15000 });

  // Open each layer directly (robust; avoids relative-link issues)
  const pages = [
    '/layers/projecten.html',
    '/layers/instellingen.html',
    '/layers/lascontrole.html'
  ];

  for (const p of pages) {
    await page.goto(BASE + p + '?r=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body[data-app-ready="1"]', { timeout: 15000 });
    await expect(page.locator('table')).toBeVisible();
  }

  // Report (in test output)
  if (consoleErrors.length) {
    console.log('\n=== Console errors ===\n' + consoleErrors.join('\n'));
  }
  if (failedRequests.length) {
    console.log('\n=== Failed network responses (>=400) ===\n' + failedRequests.map(x => `${x.status} ${x.url}\n${x.body}`).join('\n---\n'));
  }
  if (requestFailures.length) {
    console.log('\n=== Failed requests (requestfailed) ===\n' + requestFailures.map(x => `${x.url}\n${x.failure}`).join('\n---\n'));
  }

  expect(consoleErrors, 'Geen console errors toegestaan').toEqual([]);
  // Allow 401 if not logged in, but no 404/500 should remain
  const bad = failedRequests.filter(x => x.status !== 401);
  expect(bad, 'Geen 404/500 responses toegestaan (behalve 401 indien niet ingelogd)').toEqual([]);

  expect(requestFailures, 'Geen requestfailed toegestaan').toEqual([]);
});
