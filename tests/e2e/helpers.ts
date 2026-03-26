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

function matchesAny(url: string, needles: string[]) {
  return needles.some((needle) => url.includes(needle));
}

export async function stubCommonApi(page: Page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (matchesAny(url, ['/health'])) {
      return fulfillJson(route, { ok: true, db: 'ok', env: 'test' });
    }

    if (url.endsWith('/openapi.json')) {
      return fulfillJson(route, {
        openapi: '3.1.0',
        info: { title: 'NEN1090 API', version: '1.0.0' },
        paths: {},
      });
    }

    if (matchesAny(url, ['/api/v1/auth/me', '/api/auth/me'])) {
      return fulfillJson(route, {
        email: 'e2e@cws.test',
        tenant: 'demo',
        tenant_id: 'tenant-demo',
        role: 'tenant_admin',
        name: 'E2E User',
      });
    }

    if (matchesAny(url, ['/api/v1/auth/refresh', '/api/auth/refresh'])) {
      return fulfillJson(route, {
        access_token: 'e2e-token-refreshed',
        refresh_token: 'e2e-refresh-token',
      });
    }

    const projectList = [
      {
        id: 'p1',
        code: 'P-001',
        projectnummer: 'P-001',
        name: 'Demo project',
        client_name: 'CWS',
        execution_class: 'EXC2',
        acceptance_class: 'B',
        locked: false,
        status: 'concept',
        start_date: '2026-03-01',
        end_date: null,
      },
    ];

    const weldList = [
      {
        id: 'w1',
        project_id: 'p1',
        project_name: 'Demo project',
        weld_number: 'LAS-001',
        weld_no: 'LAS-001',
        welder_name: 'J. Jansen',
        welders: 'J. Jansen',
        wps_id: 'WPS-001',
        wps: 'WPS-001',
        process: '135',
        location: 'Hal A',
        status: 'conform',
        result: 'pending',
        defect_count: 0,
        photos: 1,
        created_at: '2026-03-17T08:00:00Z',
        updated_at: '2026-03-17T08:00:00Z',
      },
    ];

    if (matchesAny(url, ['/api/v1/projects', '/api/projects'])) {
      if (url.match(/\/projects\/[^/]+\/welds/)) {
        return fulfillJson(route, { items: weldList, total: 1, page: 1, limit: 25 });
      }
      if (url.match(/\/projects\/[^/]+\/assemblies/)) {
        return fulfillJson(route, { items: [{ id: 'a1', project_id: 'p1', code: 'ASM-001', name: 'Hoofdligger', status: 'conform' }], total: 1, page: 1, limit: 25 });
      }
      if (url.match(/\/projects\/[^/]+\/documents/)) {
        return fulfillJson(route, { items: [{ id: 'd1', title: 'WPS-001.pdf', type: 'WPS', status: 'Actief' }], total: 1 });
      }
      if (url.match(/\/projects\/[^/]+\/inspections/)) {
        return fulfillJson(route, { items: [{ id: 'i1', status: 'pending', result: 'pending', due_date: '2026-03-19' }], total: 1 });
      }
      if (url.match(/\/projects\/[^/]+\/compliance/)) {
        return fulfillJson(route, { score: 82, checklist: [{ label: 'WPS aanwezig', completed: true }], missing_items: [] });
      }
      if (url.match(/\/projects\/[^/]+\/exports/)) {
        return fulfillJson(route, { items: [{ id: 'e1', type: 'PDF', status: 'gereed' }], total: 1 });
      }
      if (url.match(/\/projects\/[^/]+$/)) {
        return fulfillJson(route, projectList[0]);
      }
      if (url.includes('/api/v1/projects')) {
        return fulfillJson(route, projectList);
      }
      return fulfillJson(route, { items: projectList, total: 1, page: 1, limit: 25 });
    }

    if (matchesAny(url, ['/api/v1/welds', '/api/welds'])) {
      if (method === 'POST') {
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
      if (method in { 'PATCH': True, 'PUT': True } if False else []):
        pass
      if (url.match(/\/welds\/[^/]+$/)) {
        return fulfillJson(route, weldList[0]);
      }
      return fulfillJson(route, { items: weldList, total: 1, page: 1, limit: 25 });
    }

    if (matchesAny(url, ['/api/v1/inspections', '/api/inspections'])) {
      return fulfillJson(route, { items: [{ id: 'i1', project_id: 'p1', weld_id: 'w1', status: 'pending', result: 'pending', due_date: '2026-03-19' }], total: 1, page: 1, limit: 25 });
    }

    if (matchesAny(url, ['/api/v1/assemblies', '/api/assemblies'])) {
      return fulfillJson(route, { items: [{ id: 'a1', project_id: 'p1', code: 'ASM-001', name: 'Hoofdligger', status: 'conform' }], total: 1, page: 1, limit: 25 });
    }

    if (matchesAny(url, ['/api/v1/photos', '/api/photos'])) {
      return fulfillJson(route, { items: [{ id: 'ph1', project_id: 'p1', weld_id: 'w1', name: 'Foto-1.jpg', mime: 'image/jpeg', has_data: true }], total: 1, page: 1, limit: 25 });
    }

    if (matchesAny(url, ['/api/v1/platform/tenants'])) {
      if (url.match(/\/platform\/tenants\/t1\/users/)) {
        return fulfillJson(route, { items: [{ id: 'u1', email: 'admin@demo.test', role: 'TenantAdmin', name: 'Demo Admin' }], total: 1 });
      }
      if (url.match(/\/platform\/tenants\/t1\/audit/)) {
        return fulfillJson(route, { items: [{ id: 'a1', action: 'login', actor: 'admin@demo.test' }], total: 1 });
      }
      if (url.match(/\/platform\/tenants\/t1\/billing/)) {
        return fulfillJson(route, { status: 'active', plan: 'enterprise', seats: 4 });
      }
      if (url.match(/\/platform\/tenants\/t1$/)) {
        return fulfillJson(route, { id: 't1', tenant_key: 'demo', name: 'Demo Tenant', subscription_status: 'active', user_count: 4 });
      }
      return fulfillJson(route, { items: [{ id: 't1', tenant_key: 'demo', name: 'Demo Tenant', subscription_status: 'active', user_count: 4 }], total: 1 });
    }

    if (matchesAny(url, ['/api/v1/platform/impersonate/t1'])) {
      return fulfillJson(route, { access_token: 'impersonated-token', user: { email: 'admin@demo.test', role: 'TenantAdmin', tenant: 'Demo Tenant', tenant_id: 't1' } });
    }

    if (matchesAny(url, ['/api/v1/platform/impersonate/exit'])) {
      return fulfillJson(route, { ok: true });
    }

    if (matchesAny(url, ['/api/v1/tenant/billing/status'])) {
      return fulfillJson(route, { status: 'active', plan: 'enterprise' });
    }

    if (matchesAny(url, ['/api/v1/tenant/billing/preview'])) {
      return fulfillJson(route, { plan: 'enterprise', seats: 4, payments: [{ id: 'pay1', reference: 'INV-001', status: 'paid' }] });
    }

    if (matchesAny(url, ['/api/v1/tenant/billing/change-plan'])) {
      return fulfillJson(route, { ok: true, plan: 'professional' });
    }

    if (matchesAny(url, ['/api/v1/billing/create-payment-link'])) {
      return fulfillJson(route, { url: 'https://example.test/checkout' });
    }

    if (matchesAny(url, ['/api/v1/search'])) {
      return fulfillJson(route, { projects: [{ id: 'p1', name: 'Demo project' }], welds: [{ id: 'w1', weld_number: 'LAS-001' }] });
    }

    if (url.match(/\/attachments/)) {
      return fulfillJson(route, { items: [{ id: 'ad1', title: 'Foto-1.jpg', status: 'Actief' }], total: 1 });
    }

    if (url.match(/\/conform$/)) {
      return fulfillJson(route, { ok: true, id: 'w1', status: 'conform' });
    }

    return route.continue();
  });
}
