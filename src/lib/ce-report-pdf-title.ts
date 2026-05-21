const CE_REPORT_TITLE_INSTALLED = '__wipCeReportPdfTitleInstalled__';
const TITLE_RESTORE_DELAY_MS = 3000;

declare global {
  interface Window {
    [CE_REPORT_TITLE_INSTALLED]?: boolean;
  }
}

function isCeReportRoute() {
  return window.location.pathname.replace(/\/+$/, '').endsWith('/ce-report');
}

function cleanFilenamePart(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .replace(/\s/g, '-');
}

function nowStamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

function textOf(selector: string) {
  return document.querySelector(selector)?.textContent?.trim() || '';
}

function readProjectName() {
  const fromCover = textOf('.rpt-cover .rpt-cover-grid > div:first-child strong');
  if (fromCover) return fromCover;

  const heading = textOf('.rpt-cover h1');
  return heading && heading !== 'Weld Compliance Report' ? heading : 'CE-rapport';
}

function readProjectNumber() {
  const fromCoverSmall = textOf('.rpt-cover .rpt-cover-grid > div:first-child small');
  const coverMatch = fromCoverSmall.match(/(?:project\s*(?:no\.?|number)\s*)?([A-Za-z0-9._-]+)/i);
  if (coverMatch?.[1]) return coverMatch[1];

  const fromHeader = textOf('.rpt-cover .rpt-header-center span') || textOf('.rpt-header-center span');
  const headerMatch = fromHeader.match(/^\s*([A-Za-z0-9._-]+)\s*[·-]/);
  if (headerMatch?.[1]) return headerMatch[1];

  const pathMatch = window.location.pathname.match(/\/projecten\/([^/]+)\/ce-report\/?$/i);
  return pathMatch?.[1] || 'project';
}

function buildCeReportPdfTitle() {
  const projectName = cleanFilenamePart(readProjectName()) || 'CE-rapport';
  const projectNumber = cleanFilenamePart(readProjectNumber()) || 'project';
  return `${projectName}-${projectNumber}-${nowStamp()}`;
}

function applyCeReportPdfTitle() {
  if (!isCeReportRoute()) return null;
  const title = buildCeReportPdfTitle();
  if (!title) return null;
  document.title = title;
  return title;
}

function scheduleTitleRefresh() {
  if (!isCeReportRoute()) return;
  window.requestAnimationFrame(() => {
    applyCeReportPdfTitle();
  });
}

export function installCeReportPdfTitle() {
  if (typeof window === 'undefined' || window[CE_REPORT_TITLE_INSTALLED]) return;
  window[CE_REPORT_TITLE_INSTALLED] = true;

  const originalPrint = window.print.bind(window);
  window.print = () => {
    applyCeReportPdfTitle();
    originalPrint();
    window.setTimeout(scheduleTitleRefresh, TITLE_RESTORE_DELAY_MS);
  };

  window.addEventListener('beforeprint', () => {
    applyCeReportPdfTitle();
  });
  window.addEventListener('load', scheduleTitleRefresh);
  window.addEventListener('popstate', scheduleTitleRefresh);

  const observer = new MutationObserver(scheduleTitleRefresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  scheduleTitleRefresh();
}
