import { expect, test } from '@playwright/test';

const liveEnabled = process.env.PLAYWRIGHT_LIVE_AUTH === '1';
const apiUrl = process.env.PLAYWRIGHT_API_URL || 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net/api/v1';

test.describe('live ce export', () => {
  test.skip(!liveEnabled, 'Live CE export alleen draaien met PLAYWRIGHT_LIVE_AUTH=1.');

  test('@e2e-live @ce exporteert pdf via live API', async ({ request }) => {
    const tenant = process.env.PLAYWRIGHT_AUTH_TENANT || 'demo';
    const email = process.env.PLAYWRIGHT_AUTH_EMAIL || 'admin@demo.com';
    const password = process.env.PLAYWRIGHT_AUTH_PASSWORD || 'Admin123!';

    const login = await request.post(`${apiUrl}/auth/login`, {
      data: { tenant, email, password },
    });
    expect(login.ok()).toBeTruthy();

    const auth = await login.json();
    const token = auth.access_token as string;
    const headers = { Authorization: `Bearer ${token}` };

    const projectsResponse = await request.get(`${apiUrl}/projects?page=1&limit=10`, { headers });
    expect(projectsResponse.ok()).toBeTruthy();
    const projectsPayload = await projectsResponse.json();
    const items = Array.isArray(projectsPayload) ? projectsPayload : (projectsPayload.items || []);
    expect(items.length).toBeGreaterThan(0);

    const projectId = items[0].id;
    const exportResponse = await request.post(`${apiUrl}/projects/${projectId}/exports/pdf`, { headers });
    expect(exportResponse.ok()).toBeTruthy();
    const exportPayload = await exportResponse.json();
    const exportId = exportPayload.export_id || exportPayload.id;
    expect(exportId).toBeTruthy();

    const downloadResponse = await request.get(`${apiUrl}/exports/${exportId}/download`, { headers });
    expect(downloadResponse.ok()).toBeTruthy();
    const buffer = await downloadResponse.body();
    expect(buffer.length).toBeGreaterThan(0);
  });
});
