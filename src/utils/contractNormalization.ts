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

export function normalizeInspectionStatus(value: unknown, fallback = 'conform'): string {
  const normalized = normalizeStatus(value);

  if (['conform', 'approved', 'ok', 'goed', 'compliant'].includes(normalized)) {
    return 'conform';
  }

  if (
    [
      'defect',
      'rejected',
      'afgekeurd',
      'niet_conform',
      'non_conform',
      'non_compliant',
      'not_conform',
    ].includes(normalized)
  ) {
    return 'defect';
  }

  if (
    [
      'gerepareerd',
      'in_controle',
      'in_control',
      'in_progress',
      'pending',
      'open',
      'repaired',
    ].includes(normalized)
  ) {
    return 'gerepareerd';
  }

  return normalized === 'unknown' ? fallback : normalized;
}
