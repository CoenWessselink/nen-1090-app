import { useUiStore } from '@/app/store/ui-store';

export function notifyApiError(title: string, error: unknown) {
  const description = error instanceof Error ? error.message : 'Onbekende fout tijdens API-verwerking.';
  useUiStore.getState().pushNotification({ title, description, tone: 'error' });
}
