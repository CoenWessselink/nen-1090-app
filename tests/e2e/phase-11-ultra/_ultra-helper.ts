export const DEFAULT_PROJECT_ID = "demo-project";

export function collectConsoleIssues() {
  return [];
}

export function captureAuthRequests() {
  return [];
}

export function expectNotOnLogin(page: any) {
  return page.url().includes("/login") === false;
}
