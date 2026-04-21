import { useUiStore } from '@/app/store/ui-store';

function extractMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      detail?: unknown;
      error?: { message?: unknown; detail?: unknown };
      details?: { message?: unknown; detail?: unknown; error?: { message?: unknown } };
    };

    const nested = [
      candidate.error?.message,
      candidate.error?.detail,
      candidate.details?.error?.message,
      candidate.details?.message,
      candidate.details?.detail,
      candidate.message,
      candidate.detail,
    ].find((value) => typeof value === 'string' && value.trim().length > 0);

    if (typeof nested === 'string') return nested;
  }

  return 'Onbekende fout tijdens API-verwerking.';
}

export function notifyApiError(title: string, error: unknown) {
  const description = extractMessage(error);
  useUiStore.getState().pushNotification({ title, description, tone: 'error' });
}
