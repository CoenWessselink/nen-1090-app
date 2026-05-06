export function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'ok', 'approved'].includes(normalized);
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  return false;
}

export function normalizeStatus(value: unknown): string {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  return value.trim().toLowerCase().replace(/\s+/g, '_');
}
