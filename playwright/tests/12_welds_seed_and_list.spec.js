const { test, expect } = require('@playwright/test');

async function login(request) {
  const base = process.env.API_BASE_URL || 'https://api.nen1090.nl';
  const r = await request.post(`${base}/api/v1/auth/login`, {
    data: {
      email: process.env.ADMIN_EMAIL || 'admin@demo.com',
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      tenant: process.env.TENANT_NAME || 'demo',
    },
  });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  expect(j.access_token).toBeTruthy();
  return { base, token: j.access_token };
}

test('Welds: seed demo + list welds for P-1001', async ({ request }) => {
  const { base, token } = await login(request);

  // Ensure demo projects exist
  await request.post(`${base}/api/v1/projects/seed_demo`, { headers: { Authorization: `Bearer ${token}` } });

  // Seed demo welds (idempotent)
  const seed = await request.post(`${base}/api/v1/welds/seed_demo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(seed.ok()).toBeTruthy();

  // Find project id for P-1001
  const listP = await request.get(`${base}/api/v1/projects`, { headers: { Authorization: `Bearer ${token}` } });
  expect(listP.ok()).toBeTruthy();
  const projects = await listP.json();
  const p = projects.find(x => (x.code || '') === 'P-1001');
  expect(p).toBeTruthy();

  // List welds
  const listW = await request.get(`${base}/api/v1/projects/${p.id}/welds`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(listW.ok()).toBeTruthy();
  const welds = await listW.json();
  expect(Array.isArray(welds)).toBeTruthy();
  expect(welds.length).toBeGreaterThan(0);
  expect(welds.some(w => w.weld_no === 'W-001')).toBeTruthy();
});
