import { downloadUrlAsObjectUrl, openProtectedFile } from '@/api/client';
import { fetchCompliancePdfBlob } from '@/api/exports';

export function isApiPath(value: unknown) {
  const text = String(value || '');
  return text.startsWith('/api/') || text.startsWith('/api/v1/') || text.startsWith('/attachments/') || text.startsWith('/documents/') || text.startsWith('/exports/') || text.startsWith('/projects/');
}

function projectCompliancePdfParams(url: string): { projectId: string; download: boolean } | null {
  try {
    const absolute = url.startsWith('http://') || url.startsWith('https://') ? url : new URL(url, window.location.origin).toString();
    const u = new URL(absolute);
    const m = u.pathname.match(/\/projects\/([^/]+)\/exports\/compliance\/pdf\/?$/i);
    if (!m) {
      return null;
    }
    const download = u.searchParams.get('download') === 'true';
    return { projectId: m[1], download };
  } catch {
    return null;
  }
}

async function openProtectedComplianceFile(url: string, fallbackName = 'download.pdf') {
  const params = projectCompliancePdfParams(url);
  if (!params) {
    await openProtectedFile(url, fallbackName);
    return;
  }
  const { blob, filename } = await fetchCompliancePdfBlob(params.projectId, params.download);
  const objectUrl = URL.createObjectURL(blob);
  const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');

  if (!popup) {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename || fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
}

export async function openDownloadUrl(url: string, fallbackName = 'download.pdf') {
  if (!url) throw new Error('Download URL ontbreekt.');
  if (isApiPath(url) && projectCompliancePdfParams(url)) {
    await openProtectedComplianceFile(url, fallbackName);
    return;
  }
  if (isApiPath(url)) {
    await openProtectedFile(url, fallbackName);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function openProtectedPdfPreview(url: string): Promise<string> {
  if (!url) throw new Error('PDF URL ontbreekt.');
  if (!isApiPath(url)) return url;

  const params = projectCompliancePdfParams(url);
  if (params) {
    const { blob } = await fetchCompliancePdfBlob(params.projectId, params.download);
    return URL.createObjectURL(blob);
  }

  const result = await downloadUrlAsObjectUrl(url);
  return result.url;
}
