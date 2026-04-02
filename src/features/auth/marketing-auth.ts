export type MarketingAuthTarget =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'set-password'
  | 'change-password'
  | 'logout'
  | 'subscription';

function trimTrailingSlash(value: string) {
  return String(value || '').replace(/\/+$/, '');
}

function isAppHost(hostname: string) {
  return hostname.includes('nen-1090-app.pages.dev') || hostname.includes('localhost') || hostname.includes('127.0.0.1');
}

export function getMarketingOrigin(): string {
  const explicit = trimTrailingSlash(import.meta.env.VITE_MARKETING_BASE_URL || '');
  if (explicit) return explicit;

  if (typeof window !== 'undefined' && isAppHost(window.location.hostname)) {
    return window.location.origin;
  }

  return 'https://nen-1090-app.pages.dev';
}

const targetPathMap: Record<MarketingAuthTarget, string> = {
  login: '/login',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
  'set-password': '/reset-password',
  'change-password': '/change-password',
  logout: '/logout',
  subscription: '/billing',
};

export function buildMarketingUrl(
  target: MarketingAuthTarget,
  options?: { next?: string; reason?: string; token?: string; query?: Record<string, string | null | undefined> },
): string {
  const origin = getMarketingOrigin();
  const pathname = targetPathMap[target] || '/login';
  const url = new URL(`${origin}${pathname}`);

  if (options?.next) url.searchParams.set('next', options.next);
  if (options?.reason) url.searchParams.set('message', options.reason);
  if (options?.token) url.searchParams.set('token', options.token);

  if (options?.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export function buildAppReturnTo(pathname = '/dashboard'): string {
  if (typeof window === 'undefined') return pathname;
  const url = new URL(pathname, window.location.origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function redirectToMarketing(
  target: MarketingAuthTarget,
  options?: Parameters<typeof buildMarketingUrl>[1],
) {
  if (typeof window === 'undefined') return;
  window.location.replace(buildMarketingUrl(target, options));
}
