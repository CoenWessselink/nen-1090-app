type DownloadCeReportRouteAsPdfOptions = {
  url: string;
  filename: string;
  timeoutMs?: number;
};

type Html2CanvasFn = (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
type JsPdfConstructor = new (options: { orientation: 'portrait'; unit: 'mm'; format: 'a4'; compress?: boolean }) => {
  addPage: (format?: string, orientation?: string) => void;
  addImage: (
    imageData: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number,
    alias?: string,
    compression?: string,
  ) => void;
  save: (filename: string) => void;
};

type PdfRuntimeWindow = Window & {
  html2canvas?: Html2CanvasFn;
  jspdf?: { jsPDF?: JsPdfConstructor };
};

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const DEFAULT_TIMEOUT_MS = 90_000;
const HTML2CANVAS_SRC = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
const JSPDF_SRC = 'https://cdn.jsdelivr.net/npm/jspdf@3.0.3/dist/jspdf.umd.min.js';

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

function appendDownloadIntent(url: string) {
  const target = new URL(absoluteUrl(url));
  target.searchParams.set('download', '1');
  target.searchParams.set('pdf', '1');
  return target.toString();
}

function loadScript(src: string) {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-pdf-runtime="${src}"]`);
  if (existing?.dataset.loaded === '1') return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const script = existing || document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.pdfRuntime = src;
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error(`PDF runtime kon niet laden: ${src}`));
    if (!existing) document.head.appendChild(script);
  });
}

async function loadPdfRuntime() {
  await loadScript(HTML2CANVAS_SRC);
  await loadScript(JSPDF_SRC);
  const runtime = window as PdfRuntimeWindow;
  const html2canvas = runtime.html2canvas;
  const JsPDF = runtime.jspdf?.jsPDF;
  if (!html2canvas || !JsPDF) throw new Error('PDF runtime is niet beschikbaar.');
  return { html2canvas, JsPDF };
}

function openVisibleReportWindow(url: string) {
  const targetUrl = appendDownloadIntent(url);
  const popup = window.open(targetUrl, '_blank');
  if (!popup) {
    window.location.assign(targetUrl);
    return null;
  }
  return popup;
}

function getWindowDocument(reportWindow: Window) {
  try {
    return reportWindow.document || null;
  } catch {
    return null;
  }
}

async function waitForReportReady(reportWindow: Window, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (reportWindow.closed) throw new Error('CE-report venster is gesloten.');
    const doc = getWindowDocument(reportWindow);
    if (doc) {
      const ready = doc.documentElement.getAttribute('data-ce-report-ready') === '1';
      const pages = doc.querySelectorAll<HTMLElement>('.rpt-page[data-print-section="true"]');
      if (ready && pages.length > 0) {
        await wait(600);
        return { doc, pages: Array.from(pages) };
      }
      if (pages.length > 0 && Date.now() - started > 3_500) {
        return { doc, pages: Array.from(pages) };
      }
    }
    await wait(200);
  }
  throw new Error('CE-report pagina laden duurde te lang.');
}

function ensureDownloadBanner(doc: Document) {
  const existing = doc.getElementById('ce-pdf-download-progress');
  if (existing) return existing;
  const banner = doc.createElement('div');
  banner.id = 'ce-pdf-download-progress';
  banner.textContent = 'PDF wordt gemaakt…';
  banner.setAttribute('style', 'position:fixed;left:18px;right:18px;top:18px;z-index:2147483647;padding:14px 18px;border-radius:18px;background:#ffffff;color:#0f172a;font:700 15px system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 18px 48px rgba(15,23,42,.22);text-align:center;');
  doc.body.appendChild(banner);
  return banner;
}

async function renderPageToPdf(
  pdf: InstanceType<JsPdfConstructor>,
  page: HTMLElement,
  html2canvas: Html2CanvasFn,
  index: number,
  doc: Document,
) {
  page.scrollIntoView({ block: 'start' });
  await wait(120);

  const canvas = await html2canvas(page, {
    backgroundColor: '#ffffff',
    scale: Math.min(1.6, Math.max(1.15, window.devicePixelRatio || 1.25)),
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 15_000,
    windowWidth: Math.max(1280, page.scrollWidth, doc.documentElement.scrollWidth),
    windowHeight: Math.max(1800, page.scrollHeight, doc.documentElement.scrollHeight),
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  if (index > 0) pdf.addPage('a4', 'portrait');

  const imageRatio = canvas.height / canvas.width;
  const pageRatio = A4_HEIGHT_MM / A4_WIDTH_MM;
  if (imageRatio > pageRatio) {
    const width = A4_HEIGHT_MM / imageRatio;
    const x = (A4_WIDTH_MM - width) / 2;
    pdf.addImage(imgData, 'JPEG', x, 0, width, A4_HEIGHT_MM, undefined, 'FAST');
    return;
  }

  const height = A4_WIDTH_MM * imageRatio;
  const y = (A4_HEIGHT_MM - height) / 2;
  pdf.addImage(imgData, 'JPEG', 0, y, A4_WIDTH_MM, height, undefined, 'FAST');
}

export async function downloadCeReportRouteAsPdf({ url, filename, timeoutMs = DEFAULT_TIMEOUT_MS }: DownloadCeReportRouteAsPdfOptions) {
  if (!url) throw new Error('CE-report route ontbreekt.');

  const reportWindow = openVisibleReportWindow(url);
  if (!reportWindow) return;

  const runtimePromise = loadPdfRuntime();
  const { doc, pages } = await waitForReportReady(reportWindow, timeoutMs);
  const banner = ensureDownloadBanner(doc);
  const { html2canvas, JsPDF } = await runtimePromise;

  await doc.fonts?.ready?.catch(() => undefined);
  const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  for (let index = 0; index < pages.length; index += 1) {
    banner.textContent = `PDF wordt gemaakt… ${index + 1}/${pages.length}`;
    await renderPageToPdf(pdf, pages[index], html2canvas, index, doc);
  }

  banner.textContent = 'PDF downloaden…';
  pdf.save(safeFilename(filename));
  window.setTimeout(() => {
    try {
      banner.remove();
    } catch {
      // ignore cleanup errors
    }
  }, 2500);
}
