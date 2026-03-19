export type MarketingAuthTarget =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'set-password'
  | 'change-password'
  | 'logout'
  | 'subscription';

const targetPathMap: Record<MarketingAuthTarget, string> = {
  login: '/app/login',
  'forgot-password': '/app/forgot-password',
  'reset-password': '/app/reset-password',
  'set-password': '/app/set-password',
  'change-password': '/app/change-password',
  logout: '/app/logout',
  subscription: '/app/subscription',
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getMarketingOrigin(): string {
  const explicit = String(import.meta.env.VITE_MARKETING_BASE_URL || '').trim();
  if (explicit) return trimTrailingSlash(explicit);
  if (typeof window !== 'undefined') return 'https://nen1090-marketing-new.pages.dev';
  return '';
}

export function buildMarketingUrl(target: MarketingAuthTarget, options?: { next?: string; reason?: string; token?: string; query?: Record<string, string | null | undefined> }): string {
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
