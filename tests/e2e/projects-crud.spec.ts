import { expect, test } from '@playwright/test';
import {
  clickSave,
  confirmDelete,
  ensureAuthenticated,
  fillProjectForm,
  fulfillJson,
  seededProjects,
  stubCommonApi,
} from './helpers';

test('projecten ondersteunt create, edit en delete via de nieuwe projectentabel', async ({ page }) => {
  let projects = [...seededProjects];

  await stubCommonApi(page);
  await page.route('**/api/v1/projects**', async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method().toUpperCase();

    if (/\/api\/v1\/projects(\?|$)/.test(url)) {
      if (method === 'GET') {
        return fulfillJson(route, { items: projects, total: projects.length, page: 1, limit: 25 });
      }
      if (method === 'POST') {
        const body = JSON.parse(request.postData() || '{}');
        const created = {
          id: `project-${projects.length + 1}`,
          projectnummer: body.projectnummer ?? body.project_number ?? `P-2026-00${projects.length + 1}`,
          name: body.name ?? body.omschrijving ?? body.description ?? 'Nieuw project',
          client_name: body.client_name ?? body.opdrachtgever ?? 'Nieuwe klant',
          execution_class: body.execution_class ?? 'EXC3',
          status: body.status ?? 'in-uitvoering',
          description: body.description ?? body.omschrijving ?? body.name ?? 'Nieuw project',
        };
        projects = [created, ...projects];
        return fulfillJson(route, created, 201);
      }
    }

    const idMatch = url.match(/\/api\/v1\/projects\/([^/?#]+)/);
    if (idMatch) {
      const id = idMatch[1];
      if (method === 'GET') {
        const found = projects.find((project) => project.id === id) ?? projects[0];
        return fulfillJson(route, found);
      }
      if (method === 'PUT' || method === 'PATCH') {
        const body = JSON.parse(request.postData() || '{}');
        projects = projects.map((project) =>
          project.id === id
            ? {
                ...project,
                ...body,
                name: body.name ?? body.omschrijving ?? project.name,
                description: body.description ?? body.omschrijving ?? project.description,
                client_name: body.client_name ?? body.opdrachtgever ?? project.client_name,
                projectnummer: body.projectnummer ?? body.project_number ?? project.projectnummer,
              }
            : project,
        );
        return fulfillJson(route, projects.find((project) => project.id === id) ?? projects[0]);
      }
      if (method === 'DELETE') {
        projects = projects.filter((project) => project.id !== id);
        return route.fulfill({ status: 204, body: '' });
      }
    }

    return fulfillJson(route, { items: [], total: 0, page: 1, limit: 25 });
  });

  await ensureAuthenticated(page, { role: 'ADMIN' });
  await page.goto('/projecten');

  await expect(page).not.toHaveURL(/login/i);
  await expect(page.getByRole('heading', { name: 'Projecten' })).toBeVisible();
  await expect(page.getByText('Demo project')).toBeVisible();

  await page.getByRole('button', { name: /nieuw project/i }).click();
  await fillProjectForm(page, {
    projectnummer: 'P-2026-002',
    opdrachtgever: 'Nieuwe klant',
    omschrijving: 'Nieuw fase G project',
    executieklasse: 'EXC3',
    status: 'in-uitvoering',
  });
  await clickSave(page);
  await expect(page.getByText('Nieuw fase G project')).toBeVisible();

  const createdRow = page.locator('tr').filter({ hasText: 'Nieuw fase G project' }).first();
  await expect(createdRow).toBeVisible();
  await createdRow.getByRole('button', { name: /bewerken/i }).click();
  await fillProjectForm(page, {
    projectnummer: 'P-2026-002',
    opdrachtgever: 'Nieuwe klant',
    omschrijving: 'Nieuw fase G project bijgewerkt',
    executieklasse: 'EXC3',
    status: 'in-uitvoering',
  });
  await clickSave(page);
  await expect(page.getByText('Nieuw fase G project bijgewerkt')).toBeVisible();

  const updatedRow = page.locator('tr').filter({ hasText: 'Nieuw fase G project bijgewerkt' }).first();
  await expect(updatedRow).toBeVisible();

  await page.goto('/projecten');
  const deleteRow = page.locator('tr').filter({ hasText: 'Nieuw fase G project bijgewerkt' }).first();
  await deleteRow.getByRole('button', { name: /verwijderen/i }).click();
  await confirmDelete(page);
  await expect(page.getByText('Nieuw fase G project bijgewerkt')).toHaveCount(0);
});
