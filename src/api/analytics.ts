import { apiRequest } from '@/api/client';

function getVisitorKey(): string {
  const existing = localStorage.getItem('wip_visitor');
  if (existing) return existing;
  const v = crypto.randomUUID();
  localStorage.setItem('wip_visitor', v);
  return v;
}

export function trackEvent(eventName: string, metadata?: Record<string, unknown>) {
  return apiRequest('/analytics/events', {
    method: 'POST',
    headers: {
      'x-wip-visitor': getVisitorKey(),
      'x-wip-path': window.location.pathname,
    },
    body: JSON.stringify({
      event_name: eventName,
      path: window.location.pathname,
      metadata: metadata || {},
    }),
  }).catch(() => undefined);
}

export function getPricingExperiment() {
  return apiRequest('/growth/experiments/pricing', {
    method: 'GET',
    headers: {
      'x-wip-visitor': getVisitorKey(),
    },
  });
}

export function getTrialStatus() {
  return apiRequest('/growth/trial/status');
}

export function getConversionSummary() {
  return apiRequest('/analytics/conversion-summary');
}
