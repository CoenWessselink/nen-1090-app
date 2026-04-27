import type { ConsoleMessage, Page } from '@playwright/test';

export type BrowserErrorRecord = {
  type: string;
  text: string;
};

const DEFAULT_ALLOWED_CONSOLE_ERROR_PATTERNS: RegExp[] = [
  /Failed to load resource: the server responded with a status of 401 .*\/api\/v1\/auth\/me/i,
  /Failed to load resource: the server responded with a status of 404 .*\/api\/v1\/projects\/[^\s/]+\/welds\/[^\s/]+\/inspections/i,
  /Failed to load resource: the server responded with a status of 405 .*\/api\/v1\/projects\/[^\s/]+\/welds\/[^\s/]+\/inspections/i,
  /Failed to load resource: the server responded with a status of 404 .*\/api\/v1\/inspections\?/i,
  /Failed to load resource: the server responded with a status of 405 .*\/api\/v1\/inspections\?/i,
  /favicon\.ico/i,
];

function isAllowedConsoleError(text: string, extraAllowedPatterns: RegExp[] = []) {
  return [...DEFAULT_ALLOWED_CONSOLE_ERROR_PATTERNS, ...extraAllowedPatterns].some((pattern) => pattern.test(text));
}

export function attachBrowserGuard(page: Page, records: BrowserErrorRecord[]) {
  page.on('pageerror', (error) => {
    records.push({
      type: 'pageerror',
      text: error.message,
    });
  });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isAllowedConsoleError(text)) return;
    records.push({
      type: 'console.error',
      text,
    });
  });
}

export function assertNoUnexpectedBrowserErrors(records: BrowserErrorRecord[], allowedPatterns: RegExp[] = []) {
  const unexpected = records.filter((item) => !isAllowedConsoleError(item.text, allowedPatterns));
  if (unexpected.length) {
    throw new Error(`Onverwachte browser errors:\n${JSON.stringify(unexpected, null, 2)}`);
  }
}
