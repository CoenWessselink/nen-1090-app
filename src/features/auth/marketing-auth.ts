export type MarketingAuthTarget =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'set-password'
  | 'change-password'
  | 'logout'
  | 'subscription';

const DEFAULT_MARKETING_ORIGIN = 'https://nen1090-marketing.pages.dev';
const LOCAL_MARKETING_ORIGIN = 'http://127.0.0.1:8788';

const targetPathMap: Record<MarketingAuthTarget, string> = {
  login: '/app/login.html',
  'forgot-password': '/app/forgot-password.html',
  'reset-password': '/app/reset-password.html',
  'set-password': '/app/set-password.html',
  'change-password': '/app/change-password.html',
  logout: '/logout',
  subscription: '/app/subscription.html',
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function normalizeOrigin(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimTrailingSlash(trimmed);
}

function inferLocalMarketingOrigin() {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return LOCAL_MARKETING_ORIGIN;
  return '';
}

export function getMarketingOrigin(): string {
  const explicit = normalizeOrigin(String(import.meta.env.VITE_MARKETING_BASE_URL || ''));
  if (explicit) return explicit;

  const runtimeExplicit = typeof window !== 'undefined'
    ? normalizeOrigin(String((window as Window & { NEN1090_MARKETING_BASE_URL?: string }).NEN1090_MARKETING_BASE_URL || ''))
    : '';
  if (runtimeExplicit) return runtimeExplicit;

  const local = inferLocalMarketingOrigin();
  if (local) return local;

  return DEFAULT_MARKETING_ORIGIN;
}

export function getMarketingApiBase(): string {
  return `${getMarketingOrigin()}/api`;
}

export function buildMarketingApiUrl(pathname: string): string {
  const normalizedPath = String(pathname || '').startsWith('/') ? pathname : `/${pathname}`;
  return `${getMarketingApiBase()}${normalizedPath}`;
}

export function buildMarketingUrl(
  target: MarketingAuthTarget,
  options?: { next?: string; reason?: string; token?: string; query?: Record<string, string | null | undefined> },
): string {
  const origin = getMarketingOrigin();
  const pathname = targetPathMap[target] || targetPathMap.login;
  const url = new URL(`${origin}${pathname}`);

  if (options?.next) url.searchParams.set('next', options.next);
  if (options?.reason) url.searchParams.set('message', options.reason);
  if (options?.token) url.searchParams.set('token', options.token);
  if (options?.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export function buildAppReturnTo(pathname = '/dashboard'): string {
  if (typeof window === 'undefined') return pathname;
  const url = new URL(pathname, window.location.origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function redirectToMarketing(target: MarketingAuthTarget, options?: Parameters<typeof buildMarketingUrl>[1]) {
  if (typeof window === 'undefined') return;
  window.location.replace(buildMarketingUrl(target, options));
}
