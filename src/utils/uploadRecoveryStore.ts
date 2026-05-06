export type UploadRecoveryEntry = {
  id: string;
  fileName: string;
  startedAt: number;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  error?: string;
};

const STORAGE_KEY = 'weldinspectpro-upload-recovery';

function readEntries(): UploadRecoveryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: UploadRecoveryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function registerUploadRecovery(entry: UploadRecoveryEntry): void {
  const entries = readEntries().filter((item) => item.id !== entry.id);

  entries.push(entry);

  writeEntries(entries);

  console.info('[upload-recovery] registered', {
    id: entry.id,
    fileName: entry.fileName,
  });
}

export function markUploadRecovered(id: string): void {
  const entries = readEntries().map((entry) => {
    if (entry.id !== id) return entry;

    return {
      ...entry,
      status: 'completed' as const,
    };
  });

  writeEntries(entries);

  console.info('[upload-recovery] completed', {
    id,
  });
}

export function markUploadFailed(id: string, error: unknown): void {
  const entries = readEntries().map((entry) => {
    if (entry.id !== id) return entry;

    return {
      ...entry,
      status: 'failed' as const,
      error: String((error as { message?: string })?.message || error || 'Unknown upload error'),
    };
  });

  writeEntries(entries);

  console.error('[upload-recovery] failed', {
    id,
    error,
  });
}

export function cleanupStaleUploads(maxAgeMs = 1000 * 60 * 60 * 24): void {
  const now = Date.now();

  const filtered = readEntries().filter((entry) => now - entry.startedAt < maxAgeMs);

  writeEntries(filtered);

  console.info('[upload-recovery] stale uploads cleaned', {
    remaining: filtered.length,
  });
}

export function getPendingRecoveries(): UploadRecoveryEntry[] {
  return readEntries().filter((entry) => entry.status !== 'completed');
}
