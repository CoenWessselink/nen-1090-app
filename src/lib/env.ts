function trimTrailingSlash(value: string) {
  return String(value || '').replace(/\/+$/, '');
}

function resolveMarketingBaseUrl(): string {
  const explicit = trimTrailingSlash(import.meta.env.VITE_MARKETING_BASE_URL || '');
  if (explicit) return explicit;
  return 'https://nen1090-marketing.pages.dev';
}

function resolveApiBaseUrl(): string {
  const explicit = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
  if (explicit) return explicit;
  return '/api/v1';
}

const marketingBaseUrl = resolveMarketingBaseUrl();
const apiBaseUrl = resolveApiBaseUrl();
const healthUrl = import.meta.env.VITE_HEALTH_URL || `${apiBaseUrl.replace(/\/+$/, '')}/health`;

export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'CWS NEN-1090 Platform',
  marketingBaseUrl,
  apiBaseUrl,
  healthUrl,
};
