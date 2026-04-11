import type { ConsoleMessage, Page } from '@playwright/test';

export type BrowserErrorRecord = {
  type: string;
  text: string;
};

export function attachBrowserGuard(page: Page, records: BrowserErrorRecord[]) {
  page.on('pageerror', (error) => {
    records.push({
      type: 'pageerror',
      text: error.message,
    });
  });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    records.push({
      type: 'console.error',
      text: msg.text(),
    });
  });
}

export function assertNoUnexpectedBrowserErrors(records: BrowserErrorRecord[], allowedPatterns: RegExp[] = []) {
  const unexpected = records.filter((item) => !allowedPatterns.some((pattern) => pattern.test(item.text)));
  if (unexpected.length) {
    throw new Error(`Onverwachte browser errors:\n${JSON.stringify(unexpected, null, 2)}`);
  }
}
