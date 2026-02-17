const { test, expect } = require('@playwright/test');

test('Backend health endpoint reachable', async ({ request }) => {
  const base = process.env.API_BASE_URL || 'https://api.nen1090.nl';
  const r = await request.get(`${base}/api/health`);
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  expect(j.ok).toBeTruthy();
});

test('Login returns tokens (after seeding)', async ({ request }) => {
  const base = process.env.API_BASE_URL || 'https://api.nen1090.nl';
  const r = await request.post(`${base}/api/v1/auth/login`, {
    data: { email: process.env.ADMIN_EMAIL || 'admin@demo.com', password: process.env.ADMIN_PASSWORD || 'Admin123!', tenant: process.env.TENANT_NAME || 'demo' }
  });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  expect(j.access_token).toBeTruthy();
  expect(j.refresh_token).toBeTruthy();
});
