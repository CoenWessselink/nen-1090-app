import { downloadUrlAsObjectUrl, openProtectedFile } from '@/api/client';

export function isApiPath(value: unknown) {
  const text = String(value || '');
  return text.startsWith('/api/') || text.startsWith('/api/v1/') || text.startsWith('/attachments/') || text.startsWith('/documents/') || text.startsWith('/exports/') || text.startsWith('/projects/');
}

export async function openDownloadUrl(url: string, fallbackName = 'download.pdf') {
  if (!url) throw new Error('Download URL ontbreekt.');
  if (isApiPath(url)) {
    await openProtectedFile(url, fallbackName);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function openProtectedPdfPreview(url: string): Promise<string> {
  if (!url) throw new Error('PDF URL ontbreekt.');
  if (!isApiPath(url)) return url;
  const result = await downloadUrlAsObjectUrl(url);
  return result.url;
}
