function trimTrailingSlash(value: string) {
  return String(value || '').replace(/\/+$/, '');
}

function resolveMarketingBaseUrl(): string {
  const explicit = trimTrailingSlash(import.meta.env.VITE_MARKETING_BASE_URL || '');
  if (explicit) return explicit;
  return 'https://nen1090.nl';
}

function resolveApiBaseUrl(_marketingBaseUrl: string): string {
  const explicit = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
  if (explicit) return explicit;
  return 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net/api/v1';
}

const marketingBaseUrl = resolveMarketingBaseUrl();
const explicitApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
const fallbackApiOrigin = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';
const healthBase = explicitApiBaseUrl ? explicitApiBaseUrl.replace(/\/api\/v1$/, '') : fallbackApiOrigin;

export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'CWS NEN-1090 Platform',
  marketingBaseUrl,
  apiBaseUrl: resolveApiBaseUrl(marketingBaseUrl),
  healthUrl: import.meta.env.VITE_HEALTH_URL || `${healthBase}/health`,
};
