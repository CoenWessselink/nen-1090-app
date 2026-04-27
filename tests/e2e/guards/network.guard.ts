import type { Page, Request, Response } from '@playwright/test';

export type NetworkErrorRecord = {
  url: string;
  method: string;
  status: number | null;
  stage: 'requestfailed' | 'response';
  failureText?: string;
};

const CRITICAL_CODES = new Set([401, 403, 404, 422, 500]);

export function attachNetworkGuard(page: Page, records: NetworkErrorRecord[]) {
  page.on('requestfailed', (request: Request) => {
    if (!request.url().includes('/api/v1/')) return;
    records.push({
      url: request.url(),
      method: request.method(),
      status: null,
      stage: 'requestfailed',
      failureText: request.failure()?.errorText,
    });
  });

  page.on('response', async (response: Response) => {
    const url = response.url();
    if (!url.includes('/api/v1/')) return;
    const status = response.status();
    if (!CRITICAL_CODES.has(status)) return;
    records.push({
      url,
      method: response.request().method(),
      status,
      stage: 'response',
    });
  });
}

export function assertNoUnexpectedNetworkErrors(records: NetworkErrorRecord[], allowedPatterns: RegExp[] = []) {
  const unexpected = records.filter((item) => !allowedPatterns.some((pattern) => pattern.test(item.url)));
  if (unexpected.length) {
    throw new Error(`Onverwachte API errors:\n${JSON.stringify(unexpected, null, 2)}`);
  }
}
