import { test, expect } from '@playwright/test';

const base = (process.env.PLATFORM_API_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
const tenant = process.env.PLATFORM_ADMIN_TENANT;
const email = process.env.PLATFORM_ADMIN_EMAIL;
const password = process.env.PLATFORM_ADMIN_PASSWORD;

test.describe('superadmin platform api contract', () => {
  test.skip(!base || !tenant || !email || !password, 'Platform admin env vars ontbreken');

  test('summary and tenant filters work', async ({ request }) => {
    const login = await request.post(`${base}/api/v1/auth/login`, {
      data: { tenant, email, password },
    });
    expect(login.ok(), await login.text()).toBeTruthy();
    const token = (await login.json()).access_token as string;
    const headers = { Authorization: `Bearer ${token}` };

    const summary = await request.get(`${base}/api/v1/platform/summary`, { headers });
    expect(summary.ok(), await summary.text()).toBeTruthy();
    const summaryJson = await summary.json();
    expect(summaryJson).toHaveProperty('total_tenants');
    expect(summaryJson).toHaveProperty('active_tenants');

    const listing = await request.get(`${base}/api/v1/platform/tenants`, {
      headers,
      params: { limit: '5', offset: '0' },
    });
    expect(listing.ok(), await listing.text()).toBeTruthy();
    const tenants = (await listing.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(tenants)).toBeTruthy();
    if (tenants.length > 0) {
      expect(tenants[0]).toHaveProperty('id');
      expect(tenants[0]).toHaveProperty('name');
      expect(tenants[0]).toHaveProperty('status');
    }
  });
});
