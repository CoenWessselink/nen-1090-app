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
const DEFAULT_TIMEOUT_MS = 60_000;
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
  if (!html2canvas || !JsPDF) {
    throw new Error('PDF runtime is niet beschikbaar.');
  }
  return { html2canvas, JsPDF };
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
  document.body.appendChild(iframe);
  iframe.src = appendDownloadIntent(url);
  return iframe;
}

function getFrameDocument(iframe: HTMLIFrameElement) {
  try {
    return iframe.contentDocument || iframe.contentWindow?.document || null;
  } catch {
    return null;
  }
}

async function waitForFrameDocument(iframe: HTMLIFrameElement, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const doc = getFrameDocument(iframe);
    if (doc) {
      const hasReport = doc.querySelectorAll<HTMLElement>('.rpt-page[data-print-section="true"]').length > 0;
      if (hasReport || doc.readyState === 'complete' || doc.readyState === 'interactive') return doc;
    }
    await wait(150);
  }
  throw new Error('CE-report pagina laden duurde te lang.');
}

async function waitForReportReady(doc: Document, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ready = doc.documentElement.getAttribute('data-ce-report-ready') === '1';
    const pages = doc.querySelectorAll<HTMLElement>('.rpt-page[data-print-section="true"]');
    if (ready && pages.length > 0) {
      await wait(450);
      return Array.from(pages);
    }
    if (pages.length > 0 && Date.now() - started > 2_500) return Array.from(pages);
    await wait(150);
  }

  const pages = doc.querySelectorAll<HTMLElement>('.rpt-page[data-print-section="true"]');
  if (pages.length > 0) return Array.from(pages);
  throw new Error('CE-report inhoud is niet gevonden.');
}

async function renderPageToPdf(
  pdf: InstanceType<JsPdfConstructor>,
  page: HTMLElement,
  html2canvas: Html2CanvasFn,
  index: number,
  doc: Document,
) {
  page.scrollIntoView({ block: 'start' });
  await wait(80);

  const canvas = await html2canvas(page, {
    backgroundColor: '#ffffff',
    scale: Math.min(2, Math.max(1.25, window.devicePixelRatio || 1.5)),
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 15_000,
    windowWidth: Math.max(1280, page.scrollWidth, doc.documentElement.scrollWidth),
    windowHeight: Math.max(1800, page.scrollHeight, doc.documentElement.scrollHeight),
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
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

  const iframe = createHiddenReportFrame(url);
  try {
    const [{ html2canvas, JsPDF }, doc] = await Promise.all([
      loadPdfRuntime(),
      waitForFrameDocument(iframe, timeoutMs),
    ]);

    await doc.fonts?.ready?.catch(() => undefined);
    const pages = await waitForReportReady(doc, timeoutMs);
    const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    for (let index = 0; index < pages.length; index += 1) {
      await renderPageToPdf(pdf, pages[index], html2canvas, index, doc);
    }

    pdf.save(safeFilename(filename));
  } finally {
    iframe.remove();
  }
}
