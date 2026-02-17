const { test, expect } = require('@playwright/test');

// Smoke test = fast, stable, and strict.
// Gates ON everywhere:
// - console errors
// - pageerror
// - requestfailed
// - any 4xx/5xx responses (except expected 401 /api/v1/auth/me when not logged in)

function installGates(page){
  const consoleErrors = [];
  const requestFailures = [];
  const badResponses = [];

  page.on('console', (msg) => {
    if(msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(String(err && err.message ? err.message : err));
  });

  page.on('requestfailed', (req) => {
    try{
      const url = req.url();
      if(url.includes('favicon')) return;
      requestFailures.push({ url, failure: String(req.failure()?.errorText || 'requestfailed') });
    }catch(_){ }
  });

  page.on('response', async (res) => {
    try{
      const status = res.status();
      if(status < 400) return;
      const url = res.url();
      if(url.includes('favicon')) return;
      if(status === 401 && url.includes('/api/v1/auth/me')) return; // expected when not logged in
      let body = '';
      try{ body = await res.text(); }catch(_){ }
      badResponses.push({ status, url, body: (body||'').slice(0, 400) });
    }catch(_){ }
  });

  return { consoleErrors, requestFailures, badResponses };
}

async function waitAppReady(page){
  await page.waitForSelector('body[data-app-ready="1"]', { timeout: 15000 });
  // also ensure headerbar exists (Shell mounted)
  await expect(page.locator('.headerbar')).toBeVisible();
}

test('Smoke: Projecten → Lascontrole → Instellingen (strict, no flakes)', async ({ page }) => {
  const gates = installGates(page);

  // Start on Projecten directly (index.html auto-redirects)
  await page.goto('/layers/projecten.html?r=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await expect(page.locator('body[data-title="Projecten"]')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();

  // Use Shell menu to navigate (real user path)
  await page.getByRole('button', { name: /^Menu$/ }).click();
  await expect(page.getByText('Menu')).toBeVisible();
  await page.getByText('Lascontrole').click();

  await waitAppReady(page);
  await expect(page.locator('body[data-title="Lascontrole"]')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();

  await page.getByRole('button', { name: /^Menu$/ }).click();
  await expect(page.getByText('Menu')).toBeVisible();
  await page.getByText('Instellingen').click();

  await waitAppReady(page);
  await expect(page.locator('body[data-title="Instellingen"]')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();

  // Final strict assertions
  if(gates.consoleErrors.length) {
    console.log('\n=== Console errors ===\n' + gates.consoleErrors.join('\n'));
  }
  if(gates.badResponses.length) {
    console.log('\n=== Bad responses (>=400) ===\n' + gates.badResponses.map(x => `${x.status} ${x.url}\n${x.body}`).join('\n---\n'));
  }
  if(gates.requestFailures.length) {
    console.log('\n=== requestfailed ===\n' + gates.requestFailures.map(x => `${x.url}\n${x.failure}`).join('\n---\n'));
  }

  expect(gates.consoleErrors, 'Geen console/page errors toegestaan').toEqual([]);
  expect(gates.badResponses, 'Geen 4xx/5xx responses toegestaan (behalve 401 /auth/me)')
    .toEqual([]);
  expect(gates.requestFailures, 'Geen requestfailed toegestaan').toEqual([]);
});
