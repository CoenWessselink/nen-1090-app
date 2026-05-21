type DownloadCeReportRouteAsPdfOptions = {
  url: string;
  filename: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function safeFilename(value: string) {
  const cleaned = String(value || 'CE-report.pdf')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned || 'CE-report'}.pdf`;
}

function absoluteUrl(url: string) {
  return new URL(url, window.location.origin).toString();
}

function reportUrlWithDownloadIntent(url: string) {
  const target = new URL(absoluteUrl(url));
  target.searchParams.set('download', '1');
  return target.toString();
}

function openReportWindow(url: string) {
  const targetUrl = reportUrlWithDownloadIntent(url);

  // Open the final CE report route directly. Safari/iOS can leave a tab on about:blank
  // when an intermediate about:blank popup is opened and navigated later.
  const popup = window.open(targetUrl, '_blank');
  if (!popup) {
    window.location.assign(targetUrl);
    return null;
  }

  return popup;
}

async function waitForReportWindowLoad(reportWindow: Window, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (reportWindow.closed) throw new Error('CE-report venster is gesloten.');
    try {
      const doc = reportWindow.document;
      if (doc.readyState === 'complete' || doc.readyState === 'interactive') return doc;
    } catch {
      // Keep retrying while the route is loading.
    }
    await wait(150);
  }
  throw new Error('CE-report pagina laden duurde te lang.');
}

async function waitForReportReady(reportWindow: Window, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (reportWindow.closed) throw new Error('CE-report venster is gesloten.');
    try {
      const doc = reportWindow.document;
      const ready = doc.documentElement.getAttribute('data-ce-report-ready') === '1';
      const pages = doc.querySelectorAll<HTMLElement>('.rpt-page[data-print-section="true"]');
      if (ready && pages.length > 0) {
        await wait(350);
        return doc;
      }
      if (pages.length > 0 && Date.now() - started > 2_500) return doc;
    } catch {
      // Retry until the same-origin report route has hydrated.
    }
    await wait(150);
  }
  throw new Error('CE-report inhoud is niet gevonden.');
}

function setDocumentTitleForPrint(doc: Document, filename: string) {
  const name = safeFilename(filename).replace(/\.pdf$/i, '');
  if (doc.title !== name) doc.title = name;
}

export async function downloadCeReportRouteAsPdf({ url, filename, timeoutMs = DEFAULT_TIMEOUT_MS }: DownloadCeReportRouteAsPdfOptions) {
  if (!url) throw new Error('CE-report route ontbreekt.');

  const reportWindow = openReportWindow(url);
  if (!reportWindow) return;

  const doc = await waitForReportWindowLoad(reportWindow, timeoutMs);
  await doc.fonts?.ready?.catch(() => undefined);
  const readyDoc = await waitForReportReady(reportWindow, timeoutMs);
  setDocumentTitleForPrint(readyDoc, filename);

  reportWindow.focus();
  await wait(100);
  reportWindow.print();
}
