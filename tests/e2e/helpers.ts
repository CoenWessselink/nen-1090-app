import { Page, Route } from "@playwright/test";

export type SessionSeedOptions = {
  tenant?: string;
  email?: string;
  role?: string;
  accessToken?: string;
  refreshToken?: string;
};

export type StubCommonApiOptions = {
  projectId?: string;
};

const DEFAULT_PROJECT_ID = "e8e89d84-c24d-4334-a56c-61370665a7cf";

const projectList = [
  {
    id: DEFAULT_PROJECT_ID,
    project_number: "P-2026-001",
    name: "Demo project",
    status: "gereed",
    customer_name: "Demo klant",
    description: "Demo project voor E2E",
  },
];

const weldList = [
  {
    id: "weld-1",
    project_id: DEFAULT_PROJECT_ID,
    number: "L-001",
    name: "Las 001",
    status: "conform",
    inspector: "Demo Inspecteur",
  },
];

const documentList = [
  {
    id: "doc-1",
    project_id: DEFAULT_PROJECT_ID,
    name: "rapport.pdf",
    filename: "rapport.pdf",
    content_type: "application/pdf",
    kind: "document",
  },
];

const reportList = [
  {
    id: "report-1",
    name: "CE rapport",
    status: "ready",
    type: "ce",
    created_at: new Date().toISOString(),
  },
];

const settingsPayload = {
  organisation: {
    company_name: "Demo BV",
    kvk: "12345678",
    country: "NL",
  },
  masterdata: {
    wps: [],
    materials: [],
    welders: [],
  },
  security: {
    mfa_enabled: false,
  },
  integrations: [],
  contractvalidation: {
    status: "actief",
  },
};

export async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

export async function fulfillEmpty(route: Route, status = 204) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: "",
  });
}

export async function seedSession(page: Page, options: SessionSeedOptions = {}) {
  const {
    tenant = "demo",
    email = "admin@demo.com",
    role = "tenant_admin",
    accessToken = "playwright-access-token",
    refreshToken = "playwright-refresh-token",
  } = options;

  await page.addInitScript(
    ({
      tenant,
      email,
      role,
      accessToken,
      refreshToken,
    }: Required<SessionSeedOptions>) => {
      window.localStorage.setItem("tenant", tenant);
      window.localStorage.setItem("access_token", accessToken);
      window.localStorage.setItem("refresh_token", refreshToken);
      window.localStorage.setItem(
        "auth:user",
        JSON.stringify({
          email,
          role,
          tenant,
        }),
      );
    },
    { tenant, email, role, accessToken, refreshToken },
  );

  await page.context().addCookies([
    {
      name: "access_token",
      value: accessToken,
      domain: "nen1090-marketing-new.pages.dev",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "None",
    },
    {
      name: "refresh_token",
      value: refreshToken,
      domain: "nen1090-marketing-new.pages.dev",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "None",
    },
  ]);
}

export async function stubCommonApi(
  page: Page,
  options: StubCommonApiOptions = {},
) {
  const projectId = options.projectId ?? DEFAULT_PROJECT_ID;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method().toUpperCase();

    if (url.includes("/api/v1/auth/me")) {
      return fulfillJson(route, {
        email: "admin@demo.com",
        tenant: "demo",
        role: "tenant_admin",
      });
    }

    if (url.includes("/api/v1/auth/refresh")) {
      return fulfillJson(route, {
        access_token: "playwright-access-token",
        refresh_token: "playwright-refresh-token",
        token_type: "bearer",
      });
    }

    if (url.match(/\/api\/v1\/notifications/)) {
      return fulfillJson(route, { items: [], unread: 0 });
    }

    if (url.match(/\/api\/v1\/reports(\?|$)/)) {
      return fulfillJson(route, {
        items: reportList,
        total: reportList.length,
        page: 1,
        limit: 10,
      });
    }

    if (url.match(/\/api\/v1\/settings(\?|$)/)) {
      return fulfillJson(route, settingsPayload);
    }

    if (url.match(/\/api\/v1\/settings\/wps(\?|$)/)) {
      return fulfillJson(route, []);
    }

    if (url.match(/\/api\/v1\/settings\/materials(\?|$)/)) {
      return fulfillJson(route, []);
    }

    if (url.match(/\/api\/v1\/settings\/welders(\?|$)/)) {
      return fulfillJson(route, []);
    }

    if (url.match(/\/api\/v1\/projects(\?|$)/)) {
      if (method === "POST") {
        return fulfillJson(route, { ...projectList[0], id: "project-new" }, 201);
      }
      return fulfillJson(route, {
        items: projectList,
        total: projectList.length,
        page: 1,
        limit: 10,
      });
    }

    if (url.match(new RegExp(`/api/v1/projects/${projectId}$`))) {
      if (["PATCH", "PUT"].includes(method)) {
        return fulfillJson(route, { ...projectList[0], id: projectId });
      }
      return fulfillJson(route, { ...projectList[0], id: projectId });
    }

    if (url.match(new RegExp(`/api/v1/projects/${projectId}/assemblies`))) {
      return fulfillJson(route, []);
    }

    if (url.match(new RegExp(`/api/v1/projects/${projectId}/welds`))) {
      return fulfillJson(route, weldList);
    }

    if (url.match(/\/api\/v1\/welds(\?|$)/)) {
      if (method === "POST") {
        return fulfillJson(route, { ...weldList[0], id: "weld-new" }, 201);
      }
      return fulfillJson(route, weldList);
    }

    if (url.match(/\/api\/v1\/welds\/[^/]+$/)) {
      if (["PATCH", "PUT"].includes(method)) {
        return fulfillJson(route, weldList[0]);
      }
      return fulfillJson(route, weldList[0]);
    }

    if (url.match(new RegExp(`/api/v1/projects/${projectId}/documents`))) {
      return fulfillJson(route, documentList);
    }

    if (url.match(/\/api\/v1\/documents(\?|$)/)) {
      return fulfillJson(route, documentList);
    }

    if (url.match(/\/api\/v1\/attachments\/upload/)) {
      return fulfillJson(route, {
        id: "upload-1",
        filename: "upload.pdf",
        status: "uploaded",
      }, 201);
    }

    if (url.match(/\/api\/v1\/compliance/)) {
      return fulfillJson(route, {
        project_id: projectId,
        status: "concept",
        score: 75,
        missing_items: [],
      });
    }

    if (url.match(/\/api\/v1\/ce[-_]dossier/)) {
      return fulfillJson(route, {
        project_id: projectId,
        status: "concept",
        sections: [],
      });
    }

    if (["PATCH", "PUT", "POST", "DELETE"].includes(method)) {
      return fulfillJson(route, { ok: true });
    }

    return fulfillJson(route, {});
  });
}
