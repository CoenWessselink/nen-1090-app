const marketingBaseUrl = (
  import.meta?.env?.VITE_MARKETING_BASE_URL || 'https://nen1090-marketing-new.pages.dev'
).replace(/\/+$/, '');

function buildLoginRedirect() {
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const url = new URL(`${marketingBaseUrl}/login`);
  if (next && next !== '/login') {
    url.searchParams.set('next', next);
    url.searchParams.set('message', 'Log in om verder te werken in het platform.');
  }
  return url.toString();
}

export async function checkAuth() {
  const res = await fetch(`${marketingBaseUrl}/api/session`, {
    credentials: 'include',
  });

  const data = await res.json();

  if (!data.authenticated) {
    window.location.href = buildLoginRedirect();
  }
}
