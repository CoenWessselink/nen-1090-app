const CE_REPORT_PRINT_FLAG = '__wipCeReportPrintAutostartInstalled__';
const CE_REPORT_PRINT_FIRED = '__wipCeReportPrintAutostartFired__';

declare global {
  interface Window {
    [CE_REPORT_PRINT_FLAG]?: boolean;
    [CE_REPORT_PRINT_FIRED]?: boolean;
  }
}

function isCeReportPrintUrl() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const params = new URLSearchParams(window.location.search);
  return path.endsWith('/ce-report') && params.get('print') === '1';
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

async function waitForElement(selector: string, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const element = document.querySelector(selector);
    if (element) return element;
    await wait(100);
  }
  return null;
}

async function waitForReadyAttribute(timeoutMs = 16000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (document.documentElement.getAttribute('data-ce-report-ready') === '1') return;
    await wait(100);
  }
}

async function waitForFonts() {
  try {
    await document.fonts?.ready;
  } catch {
    // Printing should not fail when a browser blocks or delays font readiness.
  }
}

async function waitForImages(root: Element) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const finish = () => resolve();
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
      window.setTimeout(finish, 3000);
    });
  }));
}

async function startCeReportPrintWhenReady() {
  if (window[CE_REPORT_PRINT_FIRED] || !isCeReportPrintUrl()) return;
  window[CE_REPORT_PRINT_FIRED] = true;

  const root = await waitForElement('.rpt-page-wrap');
  if (!root) return;

  await waitForReadyAttribute();
  await waitForFonts();
  await waitForImages(root);
  await wait(350);

  window.print();
}

export function installCeReportPrintAutostart() {
  if (typeof window === 'undefined' || window[CE_REPORT_PRINT_FLAG]) return;
  window[CE_REPORT_PRINT_FLAG] = true;

  const trigger = () => {
    void startCeReportPrintWhenReady();
  };

  window.addEventListener('load', trigger, { once: true });
  window.addEventListener('popstate', trigger);
  window.requestAnimationFrame(trigger);
}
