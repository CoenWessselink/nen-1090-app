import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('ce-dossier uploadflow en contractvalidatie in instellingen werken in de releasevalidatie', async ({ page }) => {
  await seedSession(page, 'SUPERADMIN');
  await stubCommonApi(page);

  let documents = [
    { id: 'd1', title: 'WPS-001.pdf', type: 'WPS', status: 'Actief', project_name: 'Demo project', uploaded_at: '2026-03-17T09:00:00Z' },
  ];

  await page.route('**/api/documents', async (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: documents, total: documents.length }) });
    }
    return route.fallback();
  });

  await page.route('**/api/documents/upload', async (route, request) => {
    if (request.method() === 'POST') {
      documents = [{ id: 'd2', title: 'Certificaat.pdf', type: 'Upload', status: 'Verwerkt', project_name: 'Demo project', uploaded_at: '2026-03-17T10:00:00Z' }, ...documents];
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    return route.fallback();
  });

  await page.goto('/ce-dossier');
  await expect(page.getByRole('heading', { name: /ce-dossier/i })).toBeVisible();
  await expect(page.getByText('WPS-001.pdf')).toBeVisible();
  await page.getByRole('button', { name: /document uploaden/i }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Certificaat.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('dummy-pdf-content'),
  });
  await expect(page.getByText('Certificaat.pdf')).toBeVisible();

  await page.goto('/instellingen');
  await page.getByRole('button', { name: /contractvalidatie/i }).click();
  await expect(page.getByText('/projects')).toBeVisible();
  await expect(page.getByText('/admin/tenants')).toBeVisible();
  await expect(page.getByText('Bevestigd').first()).toBeVisible();
  await page.getByRole('button', { name: /hercontrole/i }).click();
  await expect(page.getByText('Contractvalidatie opnieuw uitgevoerd.')).toBeVisible();
});
