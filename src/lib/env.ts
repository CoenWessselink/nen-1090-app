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

function resolveSentryDsn(): string {
  return String(import.meta.env.VITE_SENTRY_DSN || '').trim();
}

function resolveDeploymentEnvironment(): string {
  return String(import.meta.env.VITE_DEPLOYMENT_ENV || import.meta.env.MODE || 'development');
}

function resolveAppRelease(): string {
  return (
    String(import.meta.env.VITE_APP_VERSION || '').trim() ||
    String(import.meta.env.VITE_COMMIT_SHA || '').trim() ||
    'dev'
  );
}

const sentryDsn = resolveSentryDsn();
const deploymentEnvironment = resolveDeploymentEnvironment();
const appRelease = resolveAppRelease();

export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'CWS NEN-1090 Platform',
  marketingBaseUrl,
  apiBaseUrl,
  healthUrl,
  sentryDsn,
  deploymentEnvironment,
  appRelease,
};
