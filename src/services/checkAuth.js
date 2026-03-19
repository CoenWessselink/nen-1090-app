export async function checkAuth() {
  const res = await fetch("https://nen1090-marketing.pages.dev/api/session", {
    credentials: "include"
  });

  const data = await res.json();

  if (!data.authenticated) {
    window.location.href = "https://nen1090-marketing.pages.dev/app/login.html";
  }
}
