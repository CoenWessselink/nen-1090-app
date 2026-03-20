const marketingBaseUrl = (import.meta?.env?.VITE_MARKETING_BASE_URL || "https://nen1090-marketing-new.pages.dev").replace(/\/+$/, "");

export async function checkAuth() {
  const res = await fetch(`${marketingBaseUrl}/api/session`, {
    credentials: "include"
  });

  const data = await res.json();

  if (!data.authenticated) {
    window.location.href = `${marketingBaseUrl}/app/login`;
  }
}
