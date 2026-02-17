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

test('Projects: seed demo + list + create + update + delete', async ({ request }) => {
  const { base, token } = await login(request);

  // Seed demo
  const seed = await request.post(`${base}/api/v1/projects/seed_demo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(seed.ok()).toBeTruthy();

  // List
  const list1 = await request.get(`${base}/api/v1/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(list1.ok()).toBeTruthy();
  const arr1 = await list1.json();
  expect(Array.isArray(arr1)).toBeTruthy();

  // Create
  const create = await request.post(`${base}/api/v1/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      code: 'P-9999',
      name: 'Playwright Test Project',
      client_name: 'Test Client',
      execution_class: 'EXC2',
      acceptance_class: 'B',
      status: 'in_controle',
      locked: false,
    },
  });
  expect(create.ok()).toBeTruthy();
  const created = await create.json();
  expect(created.id).toBeTruthy();

  // Update
  const upd = await request.put(`${base}/api/v1/projects/${created.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Playwright Test Project (updated)', status: 'conform' },
  });
  expect(upd.ok()).toBeTruthy();
  const updated = await upd.json();
  expect(updated.name).toContain('updated');
  expect(updated.status).toBe('conform');

  // Delete
  const del = await request.delete(`${base}/api/v1/projects/${created.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(del.ok()).toBeTruthy();
});
