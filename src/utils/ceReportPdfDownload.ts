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

async function waitForIframeLoad(iframe: HTMLIFrameElement, timeoutMs: number) {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('CE-report pagina laden duurde te lang.'));
    }, timeoutMs);

    iframe.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };

    iframe.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new Error('CE-report pagina kon niet worden geladen.'));
    };
  });
}

async function waitForReportReady(doc: Document, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ready = doc.documentElement.getAttribute('data-ce-report-ready') === '1';
    const pages = doc.querySelectorAll<HTMLElement>('.rpt-page[data-print-section="true"]');
    if (ready && pages.length > 0) {
      await wait(350);
      return;
    }
    await wait(150);
  }

  const pages = doc.querySelectorAll<HTMLElement>('.rpt-page[data-print-section="true"]');
  if (pages.length > 0) return;
  throw new Error('CE-report inhoud is niet gevonden.');
}

function createVisiblePrintFrame(url: string, title: string) {
  const iframe = document.createElement('iframe');
  iframe.title = title;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-1';
  iframe.src = url;
  document.body.appendChild(iframe);
  return iframe;
}

function setDocumentTitleForPrint(doc: Document, filename: string) {
  const name = safeFilename(filename).replace(/\.pdf$/i, '');
  if (doc.title !== name) doc.title = name;
}

export async function downloadCeReportRouteAsPdf({ url, filename, timeoutMs = DEFAULT_TIMEOUT_MS }: DownloadCeReportRouteAsPdfOptions) {
  if (!url) throw new Error('CE-report route ontbreekt.');

  const iframe = createVisiblePrintFrame(url, `CE report PDF generator - ${safeFilename(filename)}`);
  try {
    await waitForIframeLoad(iframe, timeoutMs);
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) throw new Error('CE-report pagina is niet toegankelijk.');

    await doc.fonts?.ready?.catch(() => undefined);
    await waitForReportReady(doc, timeoutMs);
    setDocumentTitleForPrint(doc, filename);
    win.focus();
    await wait(100);
    win.print();
  } finally {
    window.setTimeout(() => iframe.remove(), 2_000);
  }
}
