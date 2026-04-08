function escapeCsvValue(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;

  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');

  triggerDownload(filename, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
}

export function downloadText(filename: string, content: string, mimeType = 'text/plain;charset=utf-8;') {
  triggerDownload(filename, new Blob([content], { type: mimeType }));
}

export function downloadJson(filename: string, payload: unknown) {
  triggerDownload(filename, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' }));
}

export function openPrintWindow(title: string, html: string) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="nl"><head><meta charset="utf-8" /><title>${title}</title><style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
    h1,h2,h3 { margin: 0 0 12px; }
    .muted { color: #6b7280; margin-bottom: 16px; }
    .block { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .row:last-child { border-bottom: 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #eef2ff; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #e5e7eb; text-align: left; padding: 8px; vertical-align: top; }
    th { background: #f9fafb; }
  </style></head><body>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
  return true;
}
