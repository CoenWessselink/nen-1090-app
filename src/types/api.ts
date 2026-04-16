export type Primitive = string | number | boolean | null;

export type ListParams = {
  page?: number;
  limit?: number;
  pageSize?: number;
  q?: string;
  search?: string;
  sort?: string;
  status?: string;
  direction?: 'asc' | 'desc' | string;
  project_id?: string | number;
  projectId?: string | number;
  tenant_id?: string | number;
  [key: string]: Primitive | undefined;
};

export type ApiListResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
  data?: T[];
  results?: T[];
  rows?: T[];
  count?: number;
};

export type PaginatedApiResponse<T> = ApiListResponse<T> & {
  current_page?: number;
  page_size?: number;
  pageSize?: number;
};

export type LoginPayload = {
  email: string;
  password: string;
  tenant: string;
};

export type SessionUserPayload = {
  email: string;
  tenant?: string;
  tenant_id?: string | number;
  role?: string;
  canonical_role?: string;
  is_platform_admin?: boolean;
  name?: string;
};

export type LoginResponse = {
  access_token?: string;
  refresh_token?: string | null;
  token?: string;
  user: SessionUserPayload;
};

export type AuthRefreshResponse = LoginResponse;

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export type HealthResponse = {
  ok?: boolean;
  status?: string;
  service?: string;
  version?: string;
  database?: string;
  timestamp?: string;
  [key: string]: unknown;
};
