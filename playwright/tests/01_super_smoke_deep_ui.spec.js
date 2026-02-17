const { test, expect } = require('@playwright/test');

// Super-smoke = deeper UI validation (still stable + strict).
// Gates ON everywhere (console/pageerror/requestfailed/4xx/5xx).

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
  await expect(page.locator('.headerbar')).toBeVisible();
}

async function assertViewHasContent(page, rootSelector){
  const root = page.locator(rootSelector);
  await expect(root).toBeVisible();
  // At least *something* meaningful should be visible (table/cards/tiles/forms)
  const meaningful = root.locator('table, .card, .tiles, .formgrid, .grid, .modal, .footerbar, .panel-head').first();
  await expect(meaningful).toBeVisible({ timeout: 15000 });
}

async function clickTabByText(page, tabsRootSelector, tabText){
  const tabsRoot = page.locator(tabsRootSelector);
  await expect(tabsRoot).toBeVisible();
  await tabsRoot.getByText(tabText, { exact: true }).click();
  await expect(tabsRoot.locator('.tab.active').getByText(tabText, { exact: true })).toBeVisible();
}

function dumpGateFailures(gates){
  if(gates.consoleErrors.length) {
    console.log('\n=== Console/page errors ===\n' + gates.consoleErrors.join('\n'));
  }
  if(gates.badResponses.length) {
    console.log('\n=== Bad responses (>=400) ===\n' + gates.badResponses.map(x => `${x.status} ${x.url}\n${x.body}`).join('\n---\n'));
  }
  if(gates.requestFailures.length) {
    console.log('\n=== requestfailed ===\n' + gates.requestFailures.map(x => `${x.url}\n${x.failure}`).join('\n---\n'));
  }
}

function expectGatesClean(gates){
  dumpGateFailures(gates);
  expect(gates.consoleErrors, 'Geen console/page errors toegestaan').toEqual([]);
  expect(gates.badResponses, 'Geen 4xx/5xx responses toegestaan (behalve 401 /auth/me)').toEqual([]);
  expect(gates.requestFailures, 'Geen requestfailed toegestaan').toEqual([]);
}

test('Super-smoke: diepe UI check (Projecten + Lascontrole tabs + Instellingen tabs)', async ({ page }) => {
  const gates = installGates(page);

  // 1) Projecten
  await page.goto('/layers/projecten.html?r=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await expect(page.locator('body[data-title="Projecten"]')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();

  // Open "Nieuw project" modal and close it (basic interactivity)
  const newBtn = page.locator('#btnNew');
  await expect(newBtn).toBeVisible();
  await newBtn.click();
  // Modal should appear (UI.modal uses .modal overlay)
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();
  // Close via Escape (stable)
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);

  // Navigate to Lascontrole via Shell menu (real user path)
  await page.getByRole('button', { name: /^Menu$/ }).click();
  await expect(page.getByText('Menu')).toBeVisible();
  await page.getByText('Lascontrole').click();

  // 2) Lascontrole + iterate main tabs
  await waitAppReady(page);
  await expect(page.locator('body[data-title="Lascontrole (NEN 1090)"]')).toBeVisible();
  await assertViewHasContent(page, '#view');

  const lasTabs = [
    'Lassen',
    'Controles',
    'Lasplan (WPS/WPQR)',
    'NDO plan',
    'Materialen',
    'Lassers',
    'Documenten & Foto’s',
    'Certificaten',
    'Checklist & Conform',
    'Rapportage',
    'Revisies / Historie'
  ];

  for(const t of lasTabs){
    await clickTabByText(page, '#tabs', t);
    await assertViewHasContent(page, '#view');
  }

  // 3) Instellingen + iterate tabs
  await page.getByRole('button', { name: /^Menu$/ }).click();
  await expect(page.getByText('Menu')).toBeVisible();
  await page.getByText('Instellingen').click();

  await waitAppReady(page);
  await expect(page.locator('body[data-title="Instellingen"]')).toBeVisible();

  const instTabs = ['Bedrijf', 'Werknemers', 'Certificaten', 'Lassen', 'Keuzelijsten'];
  for(const t of instTabs){
    await clickTabByText(page, '#tabs', t);
    await assertViewHasContent(page, '#content');
  }

  // Gates must be clean
  expectGatesClean(gates);
});
