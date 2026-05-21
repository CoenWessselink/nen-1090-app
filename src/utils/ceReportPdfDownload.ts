type DownloadCeReportRouteAsPdfOptions = {
  url: string;
  filename: string;
  timeoutMs?: number;
};

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
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
      return Array.from(pages);
    }
    await wait(150);
  }

  const pages = doc.querySelectorAll<HTMLElement>('.rpt-page[data-print-section="true"]');
  if (pages.length > 0) return Array.from(pages);
  throw new Error('CE-report inhoud is niet gevonden.');
}

function createHiddenReportFrame(url: string) {
  const iframe = document.createElement('iframe');
  iframe.title = 'CE report PDF generator';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '1280px';
  iframe.style.height = '1800px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-1';
  iframe.src = url;
  document.body.appendChild(iframe);
  return iframe;
}

export async function downloadCeReportRouteAsPdf({ url, filename, timeoutMs = DEFAULT_TIMEOUT_MS }: DownloadCeReportRouteAsPdfOptions) {
  if (!url) throw new Error('CE-report route ontbreekt.');

  const iframe = createHiddenReportFrame(url);
  try {
    await waitForIframeLoad(iframe, timeoutMs);
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) throw new Error('CE-report pagina is niet toegankelijk.');

    await doc.fonts?.ready?.catch(() => undefined);
    const pages = await waitForReportReady(doc, timeoutMs);
    const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      page.scrollIntoView({ block: 'start' });
      await wait(50);
      const canvas = await html2canvas(page, {
        backgroundColor: '#ffffff',
        scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1.5)),
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 12_000,
        windowWidth: Math.max(1280, page.scrollWidth, doc.documentElement.scrollWidth),
        windowHeight: Math.max(1800, page.scrollHeight, doc.documentElement.scrollHeight),
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      if (index > 0) pdf.addPage('a4', 'portrait');

      const imageRatio = canvas.height / canvas.width;
      const pageRatio = A4_HEIGHT_MM / A4_WIDTH_MM;
      if (imageRatio > pageRatio) {
        const width = A4_HEIGHT_MM / imageRatio;
        const x = (A4_WIDTH_MM - width) / 2;
        pdf.addImage(imgData, 'JPEG', x, 0, width, A4_HEIGHT_MM, undefined, 'FAST');
      } else {
        const height = A4_WIDTH_MM * imageRatio;
        const y = (A4_HEIGHT_MM - height) / 2;
        pdf.addImage(imgData, 'JPEG', 0, y, A4_WIDTH_MM, height, undefined, 'FAST');
      }
    }

    pdf.save(safeFilename(filename));
  } finally {
    iframe.remove();
  }
}
