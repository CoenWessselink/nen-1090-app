import { apiRequest } from '@/api/client';

export function trackEvent(eventName: string, metadata?: Record<string, unknown>) {
  return apiRequest('/analytics/events', {
    method: 'POST',
    body: JSON.stringify({
      event_name: eventName,
      path: window.location.pathname,
      metadata: metadata || {},
    }),
  }).catch(() => undefined);
}
