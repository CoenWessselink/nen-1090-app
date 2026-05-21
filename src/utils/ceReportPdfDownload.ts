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

function openReportWindow(url: string, filename: string) {
  const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.assign(url);
    return null;
  }

  try {
    popup.document.title = `CE report PDF - ${safeFilename(filename)}`;
    popup.document.body.innerHTML = '<p style="font-family: system-ui, sans-serif; padding: 24px; color: #0f172a;">CE-rapport laden…</p>';
  } catch {
    // Ignore browsers that block about:blank document writes.
  }

  popup.location.href = absoluteUrl(url);
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
      // Same-origin document may not be ready immediately after location change.
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
      // Retry until route hydration has completed.
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

  const reportWindow = openReportWindow(url, filename);
  if (!reportWindow) return;

  const doc = await waitForReportWindowLoad(reportWindow, timeoutMs);
  await doc.fonts?.ready?.catch(() => undefined);
  const readyDoc = await waitForReportReady(reportWindow, timeoutMs);
  setDocumentTitleForPrint(readyDoc, filename);

  reportWindow.focus();
  await wait(100);
  reportWindow.print();
}
