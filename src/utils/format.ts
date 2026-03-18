export function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDatetime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toArray<T>(input: T[] | { items?: T[]; data?: T[]; results?: T[] } | undefined | null): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return input.items || input.data || input.results || [];
}

export function toneFromStatus(status?: string): 'neutral' | 'success' | 'warning' | 'danger' {
  const normalized = status?.toLowerCase();
  if (!normalized) return 'neutral';
  if (['gereed', 'conform', 'goedgekeurd', 'actief'].includes(normalized)) return 'success';
  if (['in controle', 'in-controle', 'in-uitvoering', 'concept', 'draft', 'pending'].includes(normalized)) return 'warning';
  if (['afgekeurd', 'geblokkeerd', 'defect', 'error'].includes(normalized)) return 'danger';
  return 'neutral';
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
