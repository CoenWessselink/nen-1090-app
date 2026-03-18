import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('projecten ondersteunt create, edit en delete via de frontend-workflow', async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);

  let projects = [
    { id: 'p1', projectnummer: 'P-001', name: 'Demo project', client_name: 'CWS', execution_class: 'EXC2', status: 'Actief', start_date: '2026-03-01', end_date: '2026-03-20' },
  ];

  await page.route('**/api/projects', async (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: projects, total: projects.length }) });
    }
    if (request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      const created = { id: `p${projects.length + 1}`, ...body };
      projects = [created, ...projects];
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
    }
    return route.fallback();
  });

  await page.route('**/api/projects/*', async (route, request) => {
    const id = request.url().split('/').pop() || '';
    if (request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}');
      projects = projects.map((project) => project.id === id ? { ...project, ...body } : project);
      const updated = projects.find((project) => project.id === id);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) });
    }
    if (request.method() === 'DELETE') {
      projects = projects.filter((project) => project.id !== id);
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fallback();
  });

  await page.goto('/projecten');
  await expect(page.getByRole('heading', { name: 'Projecten' })).toBeVisible();
  await expect(page.getByText('Demo project')).toBeVisible();

  await page.getByRole('button', { name: /nieuw project/i }).click();
  await page.getByLabel('Projectnummer').fill('P-002');
  await page.getByLabel('Opdrachtgever').fill('Nieuwe klant');
  await page.getByLabel('Omschrijving').fill('Nieuw fase G project');
  await page.getByLabel('Executieklasse').selectOption('EXC3');
  await page.getByLabel('Status').selectOption('in-uitvoering');
  await page.getByRole('button', { name: /^opslaan$/i }).click();
  await expect(page.getByText('Nieuw fase G project')).toBeVisible();

  await page.getByRole('button', { name: 'Bewerken' }).first().click();
  await page.getByLabel('Omschrijving').fill('Nieuw fase G project bijgewerkt');
  await page.getByRole('button', { name: /^opslaan$/i }).click();
  await expect(page.getByText('Nieuw fase G project bijgewerkt')).toBeVisible();

  await page.getByRole('button', { name: 'Verwijderen' }).first().click();
  await page.getByRole('button', { name: /project verwijderen/i }).click();
  await expect(page.getByText('Nieuw fase G project bijgewerkt')).toHaveCount(0);
});
