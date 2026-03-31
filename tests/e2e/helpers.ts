import { expect, Page, Route } from '@playwright/test';

export type SeedRole = 'ADMIN' | 'SUPERADMIN' | 'VIEWER' | 'tenant_admin' | 'tenant_user';
export type SeedOptions = {
  tenant?: string;
  email?: string;
  role?: SeedRole;
  accessToken?: string;
  refreshToken?: string;
};

export const DEFAULT_PROJECT_ID = '32220add-082a-46dc-8114-6279a04a3e03';
export const SECOND_PROJECT_ID = '28f315ec-626e-4c5a-aca0-15c762287334';

const nowIso = new Date().toISOString();

const projects = [
  {
    id: DEFAULT_PROJECT_ID,
    projectnummer: 'P-2026-001',
    name: 'Demo project',
    description: 'Operationele projecthub met directe doorgang naar Project 360.',
    client_name: 'Demo klant',
    execution_class: 'EXC2',
    status: 'in-uitvoering',
    updated_at: nowIso,
  },
  {
    id: SECOND_PROJECT_ID,
    projectnummer: 'JK-TEST',
    name: 'JK TEST',
    description: 'Volledige projectinterne werkcontainer voor overzicht, assemblies, lassen, lascontrole, documenten en historie.',
    client_name: 'Demo opdrachtgever',
    execution_class: 'EXC3',
    status: 'concept',
    updated_at: nowIso,
  },
];

const assemblies = [
  {
    id: 'asm-22-03-1',
    project_id: DEFAULT_PROJECT_ID,
    code: 'ASM-22-03-1',
    description: 'Hoofdframe',
    status: 'open',
    created_at: nowIso,
    updated_at: nowIso,
  },
];

const welds = [
  {
    id: 'weld-001',
    project_id: DEFAULT_PROJECT_ID,
    assembly_id: 'asm-22-03-1',
    weld_number: 'Las 2-kopie',
    description: 'asdff',
    status: 'conform',
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'weld-002',
    project_id: DEFAULT_PROJECT_ID,
    assembly_id: 'asm-22-03-1',
    weld_number: 'Las 2-kopie-kopie',
    description: 'asdff',
    status: 'open',
    created_at: nowIso,
    updated_at: nowIso,
  },
];

const inspections = Array.from({ length: 4 }, (_, i) => ({
  id: `insp-${i + 1}`,
  project_id: DEFAULT_PROJECT_ID,
  weld_id: welds[i % welds.length].id,
  result: i % 2 === 0 ? 'conform' : 'ok',
  status: i % 2 === 0 ? 'afgerond' : 'in-controle',
  created_at: nowIso,
}));

const documents = [
  {
    id: 'doc-1',
    project_id: DEFAULT_PROJECT_ID,
    title: 'WPS-001.pdf',
    filename: 'WPS-001.pdf',
    type: 'WPS',
    status: 'actief',
    created_at: nowIso,
  },
  {
    id: 'doc-2',
    project_id: DEFAULT_PROJECT_ID,
    title: 'CE-notitie.pdf',
    filename: 'CE-notitie.pdf',
    type: 'Overig',
    status: 'actief',
    created_at: nowIso,
  },
];

const exportsFeed = [
  {
    id: 'exp-pdf-1',
    project_id: DEFAULT_PROJECT_ID,
    type: 'PDF',
    name: 'NEN1090 App.pdf',
    status: 'completed',
    created_at: nowIso,
    direct_download: false,
  },
  {
    id: 'exp-ce-1',
    project_id: DEFAULT_PROJECT_ID,
    type: 'CE rapport',
    name: 'CE rapport',
    status: 'completed',
    created_at: nowIso,
    direct_download: true,
  },
];

const auditItems = [
  { id: 'audit-1', entity_type: 'project', action: 'created', label: 'Demo project', created_at: nowIso },
  { id: 'audit-2', entity_type: 'assembly', action: 'updated', label: 'ASM-22-03-1', created_at: nowIso },
];

export function isLiveMode() {
  return process.env.PLAYWRIGHT_LIVE_MODE === '1';
}

export async function seedSession(page: Page, options: SeedOptions = {}) {
  const {
    tenant = 'demo',
    email = 'admin@demo.com',
    role = 'ADMIN',
    accessToken = 'playwright-access-token',
    refreshToken = 'playwright-refresh-token',
  } = options;

  await page.addInitScript(
    ({ tenant, email, role, accessToken, refreshToken }) => {
      const normalizedRole = role === 'tenant_admin' ? 'ADMIN' : role === 'tenant_user' ? 'VIEWER' : role;
      const session = {
        token: accessToken,
        refreshToken,
        user: { email, tenant, role: normalizedRole },
        impersonation: null,
      };
      window.localStorage.setItem('nen1090.session', JSON.stringify(session));
      window.localStorage.setItem('auth_token', accessToken);
      window.localStorage.setItem('refresh_token', refreshToken);
      window.localStorage.setItem('user', JSON.stringify(session.user));
      window.sessionStorage.setItem('nen1090.session', JSON.stringify(session));
    },
    { tenant, email, role, accessToken, refreshToken },
  );
}

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
}

async function fulfillEmptyList(route: Route) {
  await fulfillJson(route, { items: [], total: 0, page: 1, limit: 25 });
}

export async function installEnterpriseApiStubs(page: Page) {
  if (isLiveMode()) return;

  let mutableAssemblies = [...assemblies];
  let mutableWelds = [...welds];
  let mutableDocuments = [...documents];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;

    if (path.endsWith('/auth/me')) {
      return fulfillJson(route, { email: 'admin@demo.com', tenant: 'demo', role: 'ADMIN' });
    }
    if (path.endsWith('/auth/refresh')) {
      return fulfillJson(route, { access_token: 'playwright-access-token', refresh_token: 'playwright-refresh-token', token_type: 'bearer' });
    }
    if (path.endsWith('/dashboard/summary')) {
      return fulfillJson(route, {
        open_projects: 2,
        pending_inspections: 1,
        open_defects: 0,
        dossier_ready: 1,
        recent_activity: auditItems,
      });
    }
    if (/\/api\/v1\/projects$/.test(path)) {
      if (method === 'POST') {
        const payload = JSON.parse(request.postData() || '{}');
        const created = {
          id: 'project-created',
          projectnummer: payload.projectnummer || 'P-NEW-001',
          name: payload.name || payload.omschrijving || 'Nieuw project',
          description: payload.description || payload.omschrijving || 'Nieuw project via Playwright',
          client_name: payload.client_name || payload.opdrachtgever || 'Nieuwe klant',
          execution_class: payload.execution_class || payload.executieklasse || 'EXC2',
          status: payload.status || 'concept',
          updated_at: nowIso,
        };
        projects.unshift(created);
        return fulfillJson(route, created, 201);
      }
      return fulfillJson(route, { items: projects, total: projects.length, page: 1, limit: 25 });
    }
    const projectMatch = path.match(/\/api\/v1\/projects\/([^/]+)$/);
    if (projectMatch) {
      const project = projects.find((item) => item.id === projectMatch[1]) ?? projects[0];
      if (method === 'PUT') {
        const payload = JSON.parse(request.postData() || '{}');
        Object.assign(project, payload);
      }
      return fulfillJson(route, project);
    }
    const projectAssembliesMatch = path.match(/\/api\/v1\/projects\/([^/]+)\/assemblies$/);
    if (projectAssembliesMatch) {
      if (method === 'POST') {
        const payload = JSON.parse(request.postData() || '{}');
        const created = {
          id: `asm-${mutableAssemblies.length + 1}`,
          project_id: projectAssembliesMatch[1],
          code: payload.code || 'ASM-E2E',
          description: payload.description || 'Playwright assembly',
          status: payload.status || 'open',
          created_at: nowIso,
          updated_at: nowIso,
        };
        mutableAssemblies.unshift(created);
        return fulfillJson(route, created, 201);
      }
      const filtered = mutableAssemblies.filter((item) => item.project_id === projectAssembliesMatch[1]);
      return fulfillJson(route, { items: filtered, total: filtered.length, page: 1, limit: 25 });
    }
    const projectAssemblyDetailMatch = path.match(/\/api\/v1\/projects\/([^/]+)\/assemblies\/([^/]+)$/);
    if (projectAssemblyDetailMatch) {
      const assembly = mutableAssemblies.find((item) => item.id === projectAssemblyDetailMatch[2]) ?? mutableAssemblies[0];
      if (method === 'PUT') {
        const payload = JSON.parse(request.postData() || '{}');
        Object.assign(assembly, payload);
        return fulfillJson(route, assembly);
      }
      if (method === 'DELETE') {
        mutableAssemblies = mutableAssemblies.filter((item) => item.id !== projectAssemblyDetailMatch[2]);
        return route.fulfill({ status: 204, body: '' });
      }
      return fulfillJson(route, assembly);
    }
    if (/\/api\/v1\/assemblies$/.test(path)) {
      if (method === 'POST') {
        const payload = JSON.parse(request.postData() || '{}');
        const created = {
          id: `asm-${mutableAssemblies.length + 1}`,
          project_id: payload.project_id || DEFAULT_PROJECT_ID,
          code: payload.code || 'ASM-E2E',
          description: payload.description || 'Playwright assembly',
          status: payload.status || 'open',
          created_at: nowIso,
          updated_at: nowIso,
        };
        mutableAssemblies.unshift(created);
        return fulfillJson(route, created, 201);
      }
      return fulfillJson(route, { items: mutableAssemblies, total: mutableAssemblies.length, page: 1, limit: 25 });
    }
    const projectWeldsMatch = path.match(/\/api\/v1\/projects\/([^/]+)\/(welds|lassen)$/);
    if (projectWeldsMatch) {
      if (method === 'POST') {
        const payload = JSON.parse(request.postData() || '{}');
        const created = {
          id: `weld-${mutableWelds.length + 1}`,
          project_id: projectWeldsMatch[1],
          assembly_id: payload.assembly_id || mutableAssemblies[0]?.id || 'asm-22-03-1',
          weld_number: payload.weld_number || payload.code || 'LAS-E2E',
          description: payload.description || 'Playwright las',
          status: payload.status || 'open',
          created_at: nowIso,
          updated_at: nowIso,
        };
        mutableWelds.unshift(created);
        return fulfillJson(route, created, 201);
      }
      const filtered = mutableWelds.filter((item) => item.project_id === projectWeldsMatch[1]);
      return fulfillJson(route, { items: filtered, total: filtered.length, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/welds/.test(path)) {
      return fulfillJson(route, { items: mutableWelds, total: mutableWelds.length, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/inspections/.test(path)) {
      return fulfillJson(route, { items: inspections, total: inspections.length, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/weld-defects/.test(path)) {
      return fulfillJson(route, { items: [], total: 0, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/documents$/.test(path)) {
      return fulfillJson(route, { items: mutableDocuments, total: mutableDocuments.length, page: 1, limit: 25 });
    }
    const projectDocumentsMatch = path.match(/\/api\/v1\/projects\/([^/]+)\/documents$/);
    if (projectDocumentsMatch) {
      if (method === 'POST') {
        const created = {
          id: `doc-${mutableDocuments.length + 1}`,
          project_id: projectDocumentsMatch[1],
          title: 'Certificaat.pdf',
          filename: 'Certificaat.pdf',
          type: 'Upload',
          status: 'actief',
          created_at: nowIso,
        };
        mutableDocuments.unshift(created);
        return fulfillJson(route, created, 201);
      }
      const filtered = mutableDocuments.filter((item) => item.project_id === projectDocumentsMatch[1]);
      return fulfillJson(route, { items: filtered, total: filtered.length, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/attachments\/upload$/.test(path) || /\/api\/v1\/documents\/upload$/.test(path)) {
      const created = {
        id: `doc-${mutableDocuments.length + 1}`,
        project_id: DEFAULT_PROJECT_ID,
        title: 'Certificaat.pdf',
        filename: 'Certificaat.pdf',
        type: 'Upload',
        status: 'actief',
        created_at: nowIso,
      };
      mutableDocuments.unshift(created);
      return fulfillJson(route, created, 201);
    }
    if (/\/api\/v1\/projects\/[^/]+\/(compliance|ce-dossier)/.test(path)) {
      return fulfillJson(route, {
        score: 80,
        open_actions: 5,
        status: 'in behandeling',
        checklist_done: 4,
        checklist_total: 5,
        missing_items: [
          'Materialen gekoppeld',
          'WPS gekoppeld',
          'Lassers aanwezig',
          'Inspecties aanwezig',
          'NDT aanwezig',
        ],
        source: 'live-ce-export+assembled-live-api',
      });
    }
    if (/\/api\/v1\/projects\/[^/]+\/exports/.test(path) || /\/api\/v1\/exports/.test(path)) {
      if (method === 'POST') {
        return fulfillJson(route, { id: 'export-new', type: 'PDF', status: 'completed', name: 'NEN1090 App.pdf', created_at: nowIso }, 201);
      }
      return fulfillJson(route, { items: exportsFeed, total: exportsFeed.length, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/reports/.test(path)) {
      return fulfillJson(route, { items: [{ id: 'rep-1', name: 'CE rapport', status: 'completed', created_at: nowIso }], total: 1, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/platform\/tenants/.test(path)) {
      return fulfillJson(route, { items: [{ id: 'tenant-1', slug: 'demo', name: 'Demo tenant', status: 'active' }], total: 1, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/(settings|masterdata|wps|materials|welders)/.test(path)) {
      return fulfillJson(route, { items: [], total: 0, page: 1, limit: 25 });
    }
    if (/\/api\/v1\/search/.test(path)) {
      return fulfillJson(route, { projects, assemblies: mutableAssemblies, welds: mutableWelds, documents: mutableDocuments, inspections });
    }
    if (/\/api\/v1\/projects\/[^/]+\/audit/.test(path) || /\/api\/v1\/audit/.test(path)) {
      return fulfillJson(route, { items: auditItems, total: auditItems.length, page: 1, limit: 25 });
    }

    return fulfillEmptyList(route);
  });
}

export async function bootstrapAuthenticatedPage(page: Page, path = '/dashboard', options: SeedOptions = {}) {
  await seedSession(page, options);
  await installEnterpriseApiStubs(page);
  await page.goto(path);
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function openFirstProject360(page: Page) {
  await bootstrapAuthenticatedPage(page, '/projecten');
  await expect(page.getByRole('heading', { name: 'Projecten' })).toBeVisible();
  const openButton = page.getByRole('button', { name: /open project 360/i }).first();
  await expect(openButton).toBeVisible();
  await openButton.click();
  await expect(page).toHaveURL(/\/projecten\/.+\/overzicht$/);
}
