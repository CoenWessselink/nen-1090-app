import { expect, Locator, Page, Route } from '@playwright/test';

export type SessionSeedOptions = {
  tenant?: string;
  email?: string;
  role?: string;
  accessToken?: string;
  refreshToken?: string;
};

export const DEFAULT_PROJECT_ID = 'e8e89d84-c24d-4334-a56c-61370665a7cf';
export const DEFAULT_WELD_ID = 'weld-001';

export const seededProjects = [
  {
    id: DEFAULT_PROJECT_ID,
    projectnummer: 'P-2026-001',
    name: 'Demo project',
    client_name: 'Demo klant',
    execution_class: 'EXC2',
    status: 'in-uitvoering',
    description: 'Demo project voor E2E',
  },
];

function sessionPayload(options: Required<SessionSeedOptions>) {
  const { tenant, email, role, accessToken, refreshToken } = options;
  return {
    token: accessToken,
    accessToken,
    refreshToken,
    tenant,
    role,
    user: { email, tenant, role },
    impersonation: null,
  };
}

export async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
}

export async function seedSession(page: Page, options: SessionSeedOptions | string = {}) {
  const normalized: SessionSeedOptions = typeof options === 'string' ? { role: options } : options;
  const resolved: Required<SessionSeedOptions> = {
    tenant: normalized.tenant ?? 'demo',
    email: normalized.email ?? 'admin@demo.com',
    role: normalized.role ?? 'ADMIN',
    accessToken: normalized.accessToken ?? 'playwright-access-token',
    refreshToken: normalized.refreshToken ?? 'playwright-refresh-token',
  };

  await page.addInitScript((payload) => {
    const raw = JSON.stringify(payload);
    const keys = [
      'nen1090.session',
      'nen1090.auth',
      'auth.session',
      'auth',
      'session',
      'tenant.session',
      'auth:user',
      'user',
      'access_token',
      'refresh_token',
      'tenant',
    ];

    for (const key of keys) {
      if (key === 'auth:user' || key === 'user') {
        window.localStorage.setItem(key, JSON.stringify(payload.user));
        window.sessionStorage.setItem(key, JSON.stringify(payload.user));
      } else if (key === 'access_token') {
        window.localStorage.setItem(key, payload.accessToken);
        window.sessionStorage.setItem(key, payload.accessToken);
      } else if (key === 'refresh_token') {
        window.localStorage.setItem(key, payload.refreshToken);
        window.sessionStorage.setItem(key, payload.refreshToken);
      } else if (key === 'tenant') {
        window.localStorage.setItem(key, payload.tenant);
        window.sessionStorage.setItem(key, payload.tenant);
      } else {
        window.localStorage.setItem(key, raw);
        window.sessionStorage.setItem(key, raw);
      }
    }
  }, sessionPayload(resolved));

  for (const domain of ['127.0.0.1', 'localhost']) {
    await page.context().addCookies([
      {
        name: 'access_token',
        value: resolved.accessToken,
        domain,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'refresh_token',
        value: resolved.refreshToken,
        domain,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  }
}

export async function stubAuthApi(page: Page, options: SessionSeedOptions | string = {}) {
  const normalized: SessionSeedOptions = typeof options === 'string' ? { role: options } : options;
  const resolved: Required<SessionSeedOptions> = {
    tenant: normalized.tenant ?? 'demo',
    email: normalized.email ?? 'admin@demo.com',
    role: normalized.role ?? 'ADMIN',
    accessToken: normalized.accessToken ?? 'playwright-access-token',
    refreshToken: normalized.refreshToken ?? 'playwright-refresh-token',
  };

  await page.route('**/api/v1/auth/login', async (route) => {
    return fulfillJson(route, {
      access_token: resolved.accessToken,
      refresh_token: resolved.refreshToken,
      token_type: 'bearer',
      user: { email: resolved.email, tenant: resolved.tenant, role: resolved.role },
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    return fulfillJson(route, {
      email: resolved.email,
      tenant: resolved.tenant,
      role: resolved.role,
    });
  });

  await page.route('**/api/v1/auth/refresh', async (route) => {
    return fulfillJson(route, {
      access_token: resolved.accessToken,
      refresh_token: resolved.refreshToken,
      token_type: 'bearer',
    });
  });

  await page.route('**/api/v1/auth/logout', async (route) => {
    return fulfillJson(route, { ok: true });
  });
}

export async function stubCommonApi(page: Page) {
  await page.route('**/api/v1/notifications**', async (route) => fulfillJson(route, { items: [], unread: 0 }));
  await page.route('**/api/v1/dashboard/summary**', async (route) => {
    return fulfillJson(route, {
      open_projects: 1,
      open_weld_defects: 0,
      open_inspections: 1,
      ce_dossier_ready: 0,
      recent_activity: [{ id: 'act-1', project_id: DEFAULT_PROJECT_ID, label: 'Project bijgewerkt' }],
    });
  });
}

export async function ensureAuthenticated(page: Page, options: SessionSeedOptions | string = {}) {
  await seedSession(page, options);
  await stubAuthApi(page, options);

  await page.goto('/projecten');

  if (!/login/i.test(page.url())) {
    return;
  }

  const normalized: SessionSeedOptions = typeof options === 'string' ? { role: options } : options;
  const tenant = normalized.tenant ?? 'demo';
  const email = normalized.email ?? 'admin@demo.com';
  const password = 'Admin123!';

  const tenantInput = page.locator('input[name="tenant"], input[placeholder*="tenant" i], input[aria-label*="tenant" i]').first();
  if (await tenantInput.count()) {
    await tenantInput.fill(tenant);
  }

  const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="username"]').first();
  await emailInput.fill(email);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  const loginButton = page.getByRole('button', { name: /inloggen|login|aanmelden/i }).first();
  await loginButton.click();

  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/login/i);
}

async function visibleFirst(locators: Locator[]): Promise<Locator> {
  for (const locator of locators) {
    if (await locator.count()) {
      const first = locator.first();
      if (await first.isVisible().catch(() => false)) {
        return first;
      }
    }
  }
  throw new Error('Geen bruikbare locator gevonden');
}

export async function fillProjectForm(page: Page, values: {
  projectnummer: string;
  opdrachtgever: string;
  omschrijving: string;
  executieklasse?: string;
  status?: string;
}) {
  const nummer = await visibleFirst([
    page.getByLabel(/projectnummer/i),
    page.locator('input[name="projectnummer"], input[name="project_number"]'),
  ]);
  await nummer.fill(values.projectnummer);

  const opdrachtgever = await visibleFirst([
    page.getByLabel(/opdrachtgever/i),
    page.locator('input[name="client_name"], input[name="opdrachtgever"]'),
  ]);
  await opdrachtgever.fill(values.opdrachtgever);

  const omschrijving = await visibleFirst([
    page.getByLabel(/omschrijving|projectnaam|naam/i),
    page.locator('input[name="name"], textarea[name="description"], input[name="description"]'),
  ]);
  await omschrijving.fill(values.omschrijving);

  const excLocators = [
    page.getByLabel(/executieklasse/i),
    page.locator('select[name="execution_class"], [name="execution_class"]'),
  ];
  for (const locator of excLocators) {
    if (await locator.count()) {
      await locator.first().selectOption(values.executieklasse ?? 'EXC3').catch(async () => {
        await locator.first().click();
        await page.getByRole('option', { name: values.executieklasse ?? 'EXC3' }).click().catch(() => {});
      });
      break;
    }
  }

  const statusLocators = [
    page.getByLabel(/^status$/i),
    page.locator('select[name="status"], [name="status"]'),
  ];
  for (const locator of statusLocators) {
    if (await locator.count()) {
      await locator.first().selectOption(values.status ?? 'in-uitvoering').catch(async () => {
        await locator.first().click();
        await page.getByRole('option', { name: new RegExp(values.status ?? 'in-uitvoering', 'i') }).click().catch(() => {});
      });
      break;
    }
  }
}

export async function clickSave(page: Page) {
  const saveButton = await visibleFirst([
    page.getByRole('button', { name: /^opslaan$/i }),
    page.getByRole('button', { name: /bewaar|opslaan/i }),
    page.locator('button[type="submit"]'),
  ]);
  await saveButton.click();
}

export async function confirmDelete(page: Page) {
  const confirmButton = await visibleFirst([
    page.getByRole('button', { name: /project verwijderen|verwijderen|bevestig|ja,? verwijder/i }),
    page.locator('button[data-variant="destructive"]'),
  ]);
  await confirmButton.click();
}
