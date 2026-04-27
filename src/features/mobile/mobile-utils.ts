import type { CeDocument, Inspection, Project, Weld } from '@/types/domain';

export const APP_REFRESH_EVENT = 'nen1090:refresh';

export function dispatchAppRefresh(detail: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_REFRESH_EVENT, { detail }));
  if (detail.reason === 'inspection-saved' && detail.projectId) {
    window.setTimeout(() => {
      window.location.assign(`/projecten/${String(detail.projectId)}/lassen`);
    }, 0);
  }
}

export function normalizeApiError(error: unknown, fallback = 'Actie mislukt') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  const record = error as Record<string, unknown>;
  return String(record.message || record.detail || fallback);
}

export function formatValue(value: unknown, fallback = '—') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

export function projectTitle(project: Project | null | undefined) {
  return formatValue(project?.name || project?.omschrijving || project?.projectnummer, 'Project 360');
}

export function projectCode(project: Project | null | undefined) {
  return formatValue(project?.projectnummer || project?.id, '—');
}

export function projectClient(project: Project | null | undefined) {
  return formatValue(project?.client_name || project?.opdrachtgever, '—');
}

export function projectExecutionClass(project: Project | null | undefined) {
  const value = project?.execution_class || project?.executieklasse;
  if (!value) return '—';
  return String(value).toUpperCase().startsWith('EXC') ? String(value).toUpperCase() : `EXC ${value}`;
}

export function weldNumber(weld: Weld | null | undefined) {
  return formatValue(weld?.weld_no || weld?.weld_number || weld?.id, 'Onbekende las');
}

export function weldSubtitle(weld: Weld | null | undefined) {
  return formatValue(weld?.location || weld?.assembly_name || weld?.assembly_id, 'Geen locatie');
}

export function weldStatusLabel(value: unknown) {
  const raw = String(value || '').trim().toLowerCase();
  if (['goedgekeurd', 'approved', 'conform', 'ok'].includes(raw)) return 'Conform';
  if (['gerepareerd', 'repaired', 'in controle', 'controle', 'pending'].includes(raw)) return 'In controle';
  if (['afgekeurd', 'defect', 'rejected', 'niet conform', 'non_conform'].includes(raw)) return 'Niet conform';
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Open';
}

export function weldStatusTone(value: unknown) {
  const label = weldStatusLabel(value).toLowerCase();
  if (label === 'conform') return 'success';
  if (label === 'niet conform') return 'danger';
  if (label === 'in controle') return 'info';
  return 'neutral';
}

export function latestInspectionDate(weld: Weld | null | undefined, inspection: Inspection | null | undefined) {
  return formatDate(inspection?.updated_at || inspection?.inspection_date || weld?.inspection_date || weld?.updated_at || weld?.created_at);
}

export function formatDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatFileSize(value: unknown) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return '—';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function normalizeChecklist(input: unknown) {
  if (!Array.isArray(input)) return [] as Array<{ label: string; status: string; group: string }>;
  return input.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const label = formatValue(record.label || record.title || record.key, `Onderdeel ${index + 1}`);
    const value = String(record.status || '').toLowerCase();
    const ok = Boolean(record.ok || record.completed || record.complete);
    let status = 'Vereist';
    if (ok || ['compleet', 'complete', 'ok', 'ready', 'conform'].includes(value)) status = 'Compleet';
    else if (value.includes('ontbre') || value.includes('missing')) status = 'Ontbreekt';
    return { label, status, group: inferChecklistGroup(label) };
  });
}

function inferChecklistGroup(label: string) {
  const value = label.toLowerCase();
  if (value.includes('project') || value.includes('exc') || value.includes('opdracht')) return 'Project';
  if (value.includes('las') || value.includes('wps') || value.includes('wpqr') || value.includes('materiaal')) return 'Lassen';
  if (value.includes('inspect') || value.includes('ndt') || value.includes('controle')) return 'Inspecties';
  if (value.includes('document') || value.includes('certific')) return 'Documenten';
  return 'Overig';
}

export function groupChecklist(items: Array<{ label: string; status: string; group?: string }>) {
  const groups = new Map<string, Array<{ label: string; status: string }>>();
  items.forEach((item) => {
    const key = item.group || inferChecklistGroup(item.label);
    const rows = groups.get(key) || [];
    rows.push({ label: item.label, status: item.status });
    groups.set(key, rows);
  });
  return Array.from(groups.entries()).map(([group, rows]) => ({ group, rows }));
}

export function summarizeChecklist(items: Array<{ label: string; status: string }>) {
  const total = items.length;
  const complete = items.filter((item) => item.status === 'Compleet').length;
  const missing = items.filter((item) => item.status === 'Ontbreekt').length;
  const required = items.filter((item) => item.status === 'Vereist').length;
  return { total, complete, missing, required };
}

export function documentPreviewUrl(projectId: string | number, document: CeDocument | null | undefined) {
  if (!document) return '';
  if (document.preview_url) return String(document.preview_url);
  if (document.download_url) return String(document.download_url);
  return `/api/v1/documents/${document.id}/download?project_id=${projectId}`;
}

export function firstPdfDocument(documents: CeDocument[]) {
  return documents.find((document) => {
    const mime = String(document.mime_type || '').toLowerCase();
    const filename = String(document.filename || document.uploaded_filename || '').toLowerCase();
    return mime.includes('pdf') || filename.endsWith('.pdf');
  }) || null;
}

function sanitizeFilenamePart(value: unknown, fallback: string) {
  const text = String(value || '').trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-._]+|[-._]+$/g, '');
  return text || fallback;
}

export function buildCeDossierFilename(project: Record<string, unknown> | null | undefined, fallbackDate?: string) {
  const projectName = sanitizeFilenamePart(project?.name || project?.omschrijving || project?.project_name || project?.title, 'project');
  const projectNumber = sanitizeFilenamePart(project?.projectnummer || project?.code || project?.project_number || project?.id, 'zonder-nummer');
  const stamp = fallbackDate || new Date().toISOString().slice(0, 10);
  return `CE-Dossier-${projectName}-${projectNumber}-${stamp}.pdf`;
}

export function apiProjectPdfUrl(projectId: string | number) {
  return `/api/v1/projects/${projectId}/exports/pdf`;
}
