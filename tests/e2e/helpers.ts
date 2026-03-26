import type { Page, Route } from '@playwright/test';

export async function seedSession(
  page: Page,
  role: 'ADMIN' | 'PLANNER' | 'USER' | 'VIEWER' | 'SUPERADMIN' = 'ADMIN',
) {
  await page.addInitScript(({ currentRole }) => {
    window.localStorage.setItem(
      'nen1090.session',
      JSON.stringify({
        token: 'e2e-token',
        refreshToken: 'e2e-refresh-token',
        user: {
          email: 'e2e@cws.test',
          tenant: 'demo',
          tenantId: 'tenant-demo',
          role: currentRole,
          name: 'E2E User',
        },
      }),
    );
  }, { currentRole: role });
}

const fulfillJson = async (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

export async function stubCommonApi(page: Page) {
  await page.route('**/health**', async (route) =>
    fulfillJson(route, { ok: true, db: 'ok', env: 'test' }),
  );

  await page.route('**/openapi.json', async (route) =>
    fulfillJson(route, { openapi: '3.1.0', info: { title: 'NEN1090 API', version: '1.0.0' } }),
  );

  await page.route('**/api/projects**', async (route) =>
    fulfillJson(route, {
      items: [
        {
          id: 'p1',
          code: 'P-001',
          projectnummer: 'P-001',
          name: 'Demo project',
          client_name: 'CWS',
          execution_class: 'EXC2',
          acceptance_class: 'B',
          status: 'concept',
          start_date: '2026-03-01',
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    }),
  );

  await page.route('**/api/v1/projects', async (route) =>
    fulfillJson(route, [
      {
        id: 'p1',
        code: 'P-001',
        name: 'Demo project',
        client_name: 'CWS',
        execution_class: 'EXC2',
        acceptance_class: 'B',
        locked: false,
        status: 'concept',
        start_date: '2026-03-01',
        end_date: null,
      },
    ]),
  );

  await page.route('**/api/welds**', async (route) =>
    fulfillJson(route, {
      items: [
        {
          id: 'w1',
          weld_number: 'LAS-001',
          weld_no: 'LAS-001',
          project_id: 'p1',
          project_name: 'Demo project',
          wps_id: 'WPS-001',
          wps: 'WPS-001',
          welder_name: 'J. Jansen',
          welders: 'J. Jansen',
          process: '135',
          location: 'Hal A',
          status: 'conform',
          result: 'pending',
          defect_count: 0,
          created_at: '2026-03-17T08:00:00Z',
          updated_at: '2026-03-17T08:00:00Z',
          photos: 1,
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    }),
  );

  await page.route('**/api/v1/welds', async (route) => {
    if (route.request().method() === 'POST') {
      return fulfillJson(route, {
        id: 'new-weld-001',
        project_id: 'p1',
        project_name: 'Demo project',
        weld_no: 'LAS-NEW-001',
        weld_number: 'LAS-NEW-001',
        wps: 'WPS-001',
        wps_id: 'WPS-001',
        process: '135',
        location: 'Hal A',
        status: 'open',
        result: 'pending',
        defect_count: 0,
        photos: 0,
      });
    }
    return fulfillJson(route, {
      items: [
        {
          id: 'w1',
          weld_number: 'LAS-001',
          weld_no: 'LAS-001',
          project_id: 'p1',
          project_name: 'Demo project',
          wps_id: 'WPS-001',
          wps: 'WPS-001',
          welder_name: 'J. Jansen',
          welders: 'J. Jansen',
          process: '135',
          location: 'Hal A',
          status: 'conform',
          result: 'pending',
          defect_count: 0,
          created_at: '2026-03-17T08:00:00Z',
          updated_at: '2026-03-17T08:00:00Z',
          photos: 1,
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    });
  });

  await page.route('**/api/documents**', async (route) =>
    fulfillJson(route, { items: [], total: 0 }),
  );
  await page.route('**/api/documents/upload**', async (route) =>
    fulfillJson(route, { ok: true }, 201),
  );
  await page.route('**/api/planning**', async (route) =>
    fulfillJson(route, { items: [], total: 0 }),
  );
  await page.route('**/api/reports**', async (route) =>
    fulfillJson(route, { items: [], total: 0 }),
  );
  await page.route('**/api/settings**', async (route) =>
    fulfillJson(route, { branding: { app_name: 'CWS NEN-1090' }, integrations: { api: 'connected' } }),
  );
  await page.route('**/api/v1/platform/tenants', async (route) =>
    fulfillJson(route, {
      items: [
        {
          id: 't1',
          tenant_key: 'demo',
          name: 'Demo Tenant',
          subscription_status: 'active',
          user_count: 4,
          created_at: '2026-03-01T08:00:00Z',
        },
      ],
      total: 1,
    }),
  );
  await page.route('**/api/v1/platform/tenants/t1', async (route) =>
    fulfillJson(route, {
      id: 't1',
      tenant_key: 'demo',
      name: 'Demo Tenant',
      subscription_status: 'active',
      user_count: 4,
      created_at: '2026-03-01T08:00:00Z',
    }),
  );
  await page.route('**/api/v1/platform/tenants/t1/users', async (route) =>
    fulfillJson(route, {
      items: [{ id: 'u1', email: 'admin@demo.test', role: 'TenantAdmin', name: 'Demo Admin' }],
      total: 1,
    }),
  );
  await page.route('**/api/v1/platform/tenants/t1/audit', async (route) =>
    fulfillJson(route, {
      items: [{ id: 'a1', action: 'login', actor: 'admin@demo.test', created_at: '2026-03-17T10:00:00Z' }],
      total: 1,
    }),
  );
  await page.route('**/api/v1/platform/tenants/t1/billing', async (route) =>
    fulfillJson(route, { status: 'active', plan: 'enterprise', seats: 4 }),
  );
  await page.route('**/api/v1/platform/impersonate/t1', async (route) =>
    fulfillJson(route, {
      access_token: 'impersonated-token',
      user: { email: 'admin@demo.test', role: 'TenantAdmin', tenant: 'Demo Tenant', tenant_id: 't1' },
    }),
  );
  await page.route('**/api/v1/platform/impersonate/exit', async (route) =>
    fulfillJson(route, { ok: true }, 200),
  );
  await page.route('**/api/v1/tenant/billing/status', async (route) =>
    fulfillJson(route, { status: 'active', plan: 'enterprise', next_billing_date: '2026-04-01T08:00:00Z' }),
  );
  await page.route('**/api/v1/tenant/billing/preview', async (route) =>
    fulfillJson(route, {
      plan: 'enterprise',
      seats: 4,
      payments: [{ id: 'pay1', reference: 'INV-001', status: 'paid', amount: '€199,00', created_at: '2026-03-15T08:00:00Z' }],
    }),
  );
  await page.route('**/api/v1/tenant/billing/change-plan', async (route) =>
    fulfillJson(route, { ok: true, plan: 'professional' }),
  );
  await page.route('**/api/v1/billing/create-payment-link', async (route) =>
    fulfillJson(route, { url: 'https://example.test/checkout' }),
  );
  await page.route('**/api/v1/search', async (route) =>
    fulfillJson(route, {
      projects: [{ id: 'p1', name: 'Demo project', status: 'Actief' }],
      welds: [{ id: 'w1', weld_number: 'LAS-001', status: 'conform' }],
    }),
  );

  await page.route('**/api/projects/*/assemblies**', async (route) =>
    fulfillJson(route, { items: [{ id: 'a1', code: 'ASM-001', name: 'Hoofdligger', status: 'conform' }], total: 1 }),
  );
  await page.route('**/api/v1/assemblies**', async (route) =>
    fulfillJson(route, { items: [{ id: 'a1', project_id: 'p1', code: 'ASM-001', name: 'Hoofdligger', status: 'conform' }], total: 1, page: 1, limit: 25 }),
  );
  await page.route('**/api/projects/*/welds', async (route) =>
    fulfillJson(route, {
      items: [{ id: 'w1', weld_number: 'LAS-001', weld_no: 'LAS-001', wps_id: 'WPS-001', welder_name: 'J. Jansen', process: '135', status: 'conform', defect_count: 0, created_at: '2026-03-17T08:00:00Z' }],
      total: 1,
    }),
  );
  await page.route('**/api/projects/*/documents', async (route) =>
    fulfillJson(route, {
      items: [{ id: 'd1', title: 'WPS-001.pdf', type: 'WPS', status: 'Actief', project_name: 'Demo project', uploaded_at: '2026-03-17T09:00:00Z', download_url: 'https://example.test/WPS-001.pdf' }],
      total: 1,
    }),
  );
  await page.route('**/api/projects/*/inspections', async (route) =>
    fulfillJson(route, { items: [{ id: 'i1', status: 'pending', result: 'pending', due_date: '2026-03-19' }], total: 1 }),
  );
  await page.route('**/api/v1/inspections**', async (route) =>
    fulfillJson(route, {
      items: [{ id: 'i1', project_id: 'p1', weld_id: 'w1', status: 'pending', result: 'pending', due_date: '2026-03-19' }],
      total: 1,
      page: 1,
      limit: 25,
    }),
  );
  await page.route('**/api/projects/*/compliance', async (route) =>
    fulfillJson(route, { score: 82, checklist: [{ label: 'WPS aanwezig', completed: true }], missing_items: [{ label: 'Foto las 12', description: 'Upload ontbreekt' }] }),
  );
  await page.route('**/api/projects/*/compliance/missing-items', async (route) =>
    fulfillJson(route, { missing_items: [{ label: 'Foto las 12', description: 'Upload ontbreekt' }] }),
  );
  await page.route('**/api/projects/*/compliance/checklist', async (route) =>
    fulfillJson(route, { checklist: [{ label: 'WPS aanwezig', completed: true }] }),
  );
  await page.route('**/api/projects/*/exports', async (route) =>
    fulfillJson(route, { items: [{ id: 'e1', type: 'PDF', status: 'gereed', created_at: '2026-03-17T10:00:00Z' }], total: 1 }),
  );
  await page.route('**/api/projects/*/exports/**', async (route) =>
    fulfillJson(route, { ok: true }, 201),
  );
  await page.route('**/api/projects/*/welds/*/inspections', async (route) =>
    fulfillJson(route, { items: [{ id: 'i1', status: 'pending' }], total: 1 }),
  );
  await page.route('**/api/projects/*/welds/*/defects', async (route) =>
    fulfillJson(route, { items: [{ id: 'def1', status: 'open', severity: 'high' }], total: 1 }),
  );
  await page.route('**/api/projects/*/welds/*/attachments', async (route) =>
    fulfillJson(route, { items: [{ id: 'ad1', title: 'Foto-1.jpg', status: 'Actief' }], total: 1 }),
  );
  await page.route('**/api/v1/photos**', async (route) =>
    fulfillJson(route, { items: [{ id: 'ph1', project_id: 'p1', weld_id: 'w1', name: 'Foto-1.jpg', mime: 'image/jpeg', has_data: true }], total: 1, page: 1, limit: 25 }),
  );
  await page.route('**/api/projects/*/welds/*/conform', async (route) =>
    fulfillJson(route, { ok: true, id: 'w1', status: 'conform' }, 200),
  );
}
