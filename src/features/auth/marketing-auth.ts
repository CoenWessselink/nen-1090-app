export type MarketingAuthTarget =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'set-password'
  | 'change-password'
  | 'logout'
  | 'subscription';

const DEFAULT_MARKETING_ORIGIN = 'https://nen1090-marketing-new.pages.dev';

const targetPathMap: Record<MarketingAuthTarget, string> = {
  login: '/login',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
  'set-password': '/set-password',
  'change-password': '/change-password',
  logout: '/logout',
  subscription: '/subscription',
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getMarketingOrigin(): string {
  const explicit = String(import.meta.env.VITE_MARKETING_BASE_URL || '').trim();
  if (explicit) return trimTrailingSlash(explicit);
  return DEFAULT_MARKETING_ORIGIN;
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
