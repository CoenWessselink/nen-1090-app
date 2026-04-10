import { test, expect } from '@playwright/test';
import { DEFAULT_PROJECT_ID, ensureAuthenticated, fulfillJson, stubCommonApi } from './helpers';

const project = {
  id: DEFAULT_PROJECT_ID,
  projectnummer: 'P-2026-001',
  name: 'Demo project',
  client_name: 'Demo klant',
  execution_class: 'EXC2',
  status: 'in-uitvoering',
  start_date: '2026-04-01',
  end_date: '2026-05-01',
};

const assemblies = {
  items: [
    { id: 'asm-1', code: 'A-001', name: 'Hoofdligger', status: 'in-uitvoering' },
    { id: 'asm-2', code: 'A-002', name: 'Kolom', status: 'gereed' },
  ],
  total: 2,
  page: 1,
  limit: 25,
};

const welds = {
  items: [
    { id: 'w-1', weld_number: 'W-001', location: 'Nok 1', welder_name: 'J. Lasser', status: 'conform' },
    { id: 'w-2', weld_number: 'W-002', location: 'Nok 2', welder_name: 'P. Tester', status: 'defect' },
  ],
  total: 2,
  page: 1,
  limit: 25,
};

const inspections = {
  items: [
    { id: 'i-1', weld_id: 'w-1', status: 'conform' },
    { id: 'i-2', weld_id: 'w-2', status: 'defect' },
  ],
  total: 2,
  page: 1,
  limit: 25,
};

const documents = {
  items: [
    { id: 'd-1', title: 'WPS 111', type: 'WPS', status: 'gereed', uploaded_at: '2026-04-05T10:00:00Z' },
  ],
  total: 1,
  page: 1,
  limit: 25,
};

const audit = {
  items: [
    { id: 'a-1', title: 'Project aangemaakt', entity: 'project', status: 'gereed', created_at: '2026-04-01T08:00:00Z' },
  ],
  total: 1,
  page: 1,
  limit: 25,
};

async function stubPhase1Api(page: Parameters<typeof test>[0]['page']) {
  await stubCommonApi(page);

  await page.route('**/api/v1/projects**', async (route) => {
    const url = route.request().url();
    if (url.includes(`/projects/${DEFAULT_PROJECT_ID}/assemblies`)) return fulfillJson(route, assemblies);
    if (url.includes(`/projects/${DEFAULT_PROJECT_ID}/welds`) && !url.includes('/inspection')) return fulfillJson(route, welds);
    if (url.includes(`/projects/${DEFAULT_PROJECT_ID}/inspections`)) return fulfillJson(route, inspections);
    if (url.includes(`/projects/${DEFAULT_PROJECT_ID}/documents`)) return fulfillJson(route, documents);
    if (url.endsWith(`/projects/${DEFAULT_PROJECT_ID}`) || url.includes(`/projects/${DEFAULT_PROJECT_ID}?`)) return fulfillJson(route, project);
    return fulfillJson(route, { items: [project], total: 1, page: 1, limit: 25 });
  });

  await page.route('**/api/v1/assemblies**', async (route) => fulfillJson(route, assemblies));
  await page.route('**/api/v1/welds**', async (route) => fulfillJson(route, welds));
  await page.route('**/api/v1/inspections**', async (route) => fulfillJson(route, inspections));
  await page.route('**/api/v1/weld-defects**', async (route) => fulfillJson(route, { items: [{ id: 'def-1', status: 'defect', weld_id: 'w-2' }], total: 1, page: 1, limit: 25 }));
  await page.route('**/api/v1/projects/*/audit**', async (route) => fulfillJson(route, audit));
  await page.route('**/api/v1/reports**', async (route) => fulfillJson(route, {
    items: [{ id: 'r-1', title: 'Projectoverzicht april', type: 'project_summary', status: 'gereed', owner: 'Demo admin', created_at: '2026-04-01T10:00:00Z' }],
    total: 1,
    page: 1,
    limit: 25,
  }));
  await page.route('**/api/v1/projects/*/ce-dossier**', async (route) => fulfillJson(route, {
    status: 'in_behandeling',
    score: 82,
    project,
    counts: { assemblies: 2, welds: 2, inspections: 2, documents: 1, photos: 0 },
    checklist: [{ code: 'PROJECT_DATA', title: 'Projectgegevens compleet', status: 'conform' }],
    missing_items: [{ code: 'DOC_WPS', title: 'WPS document ontbreekt', severity: 'high' }],
    assemblies: assemblies.items,
    welds: welds.items,
    inspections: inspections.items,
    documents: documents.items,
    photos: [],
  }));
  await page.route('**/api/v1/projects/*/compliance', async (route) => fulfillJson(route, {
    status: 'in_behandeling',
    score: 82,
    ready_for_export: false,
    counts: { assemblies: 2, welds: 2, inspections: 2, documents: 1, photos: 0 },
  }));
  await page.route('**/api/v1/projects/*/compliance/checklist**', async (route) => fulfillJson(route, [{ code: 'PROJECT_DATA', title: 'Projectgegevens compleet', status: 'conform' }]));
  await page.route('**/api/v1/projects/*/compliance/missing-items**', async (route) => fulfillJson(route, [{ code: 'DOC_WPS', title: 'WPS document ontbreekt', severity: 'high' }]));
  await page.route('**/api/v1/projects/*/exports/preview**', async (route) => fulfillJson(route, { preview: [{ label: 'Project', value: 'Demo project' }] }));
  await page.route('**/api/v1/projects/*/exports', async (route) => {
    if (route.request().method() === 'POST') {
      return fulfillJson(route, { export_id: 'exp-1', status: 'ready', download_url: 'https://example.com/demo.pdf', filename: 'demo.pdf' });
    }
    return fulfillJson(route, { items: [{ id: 'exp-1', export_type: 'pdf', status: 'ready', filename: 'demo.pdf', created_at: '2026-04-06T12:00:00Z', download_url: 'https://example.com/demo.pdf' }], total: 1, page: 1, limit: 25 });
  });
}

test('Fase 1 shell toont vaste topbar, klikbare KPI\'s en rapportage-inhoud', async ({ page }) => {
  await stubPhase1Api(page);
  await ensureAuthenticated(page);

  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/overzicht`);

  await expect(page.getByText('Vaste hoofdacties op alle Project 360-tabbladen')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terug naar projecten' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nieuw project' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wijzig project' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nieuwe assembly' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nieuwe las' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PDF export' })).toBeDisabled();

  await page.getByTestId('project-kpi-welds').click();
  await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}/lassen$`));
  await expect(page.getByText('W-001')).toBeVisible();

  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lascontrole`);
  await page.getByTestId('lascontrole-kpi-defect').click();
  await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}/lascontrole\?status=defect$`));
  await expect(page.getByText(/Actief statusfilter:/i)).toBeVisible();

  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`);
  await page.getByRole('button', { name: /Checklist gereed/i }).click();
  await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}/lascontrole$`));

  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`);
  await expect(page.getByText('Projectgegevens compleet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'PDF export' }).first()).toBeEnabled();

  await page.goto('/rapportage');
  await expect(page.getByText('Projectoverzicht april')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Rapportage/i })).toBeVisible();
});
