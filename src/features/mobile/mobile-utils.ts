import type { CeDocument, Inspection, Project, Weld } from '@/types/domain';

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
  return formatDate(
    inspection?.updated_at || inspection?.inspection_date || weld?.inspection_date || weld?.updated_at || weld?.created_at,
  );
}

export function formatDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatFileSize(value: unknown) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return '—';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function normalizeChecklist(input: unknown) {
  if (!Array.isArray(input)) return [] as Array<{ label: string; status: string }>;
  return input.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const label = formatValue(record.label || record.title || record.key, `Onderdeel ${index + 1}`);
    const ok = Boolean(record.ok);
    const detail = String(record.detail || record.status || '').toLowerCase();
    let status = 'Vereist';
    if (ok) status = 'Compleet';
    else if (detail.includes('ontbre')) status = 'Ontbreekt';
    return { label, status };
  });
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


export function apiProjectPdfUrl(projectId: string | number) {
  return `/api/v1/projects/${projectId}/ce-dossier/pdf`;
}
