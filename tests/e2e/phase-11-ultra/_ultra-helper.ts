import { expect, Page, Locator, Request } from '@playwright/test';

export async function collectConsoleIssues(page: Page) {
  const issues: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      issues.push(msg.text());
    }
  });

  return issues;
}

export async function collectApiFailures(page: Page) {
  const issues: string[] = [];

  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();

    if (!url.includes('/api/')) return;

    if (status >= 400) {
      issues.push(`${status} ${url}`);
    }
  });

  return issues;
}

export async function captureAuthRequests(page: Page) {
  const requests: Array<{ url: string; auth: string | null }> = [];

  page.on('request', (request: Request) => {
    const url = request.url();

    if (!url.includes('/api/')) return;

    requests.push({
      url,
      auth: request.headers()['authorization'] || null,
    });
  });

  return requests;
}
