export type ApiErrorPayload = {
  message: string;
  status: number;
  details?: unknown;
  code?: string;
};

export type HealthResponse = {
  status?: string;
  detail?: string;
  [key: string]: unknown;
};

export type LoginPayload = {
  email: string;
  password: string;
  tenant: string;
};

export type LoginResponse = {
  access_token?: string;
  token?: string;
  refresh_token?: string;
  token_type?: string;
  user?: {
    email?: string;
    role?: string;
    tenant?: string;
    tenant_id?: string | number;
    name?: string;
  };
  [key: string]: unknown;
};


export type AuthRefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  user?: {
    email?: string;
    role?: string;
    tenant?: string;
    tenant_id?: string | number;
    name?: string;
  };
  [key: string]: unknown;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export type LogoutPayload = {
  refresh_token?: string | null;
};

export type PaginatedApiResponse<T> = {
  items?: T[];
  data?: T[];
  results?: T[];
  rows?: T[];
  total?: number;
  count?: number;
  page?: number;
  limit?: number;
  pageSize?: number;
  page_size?: number;
  current_page?: number;
};

export type ApiListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type ListParams = {
  page?: number;
  limit?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  status?: string;
  direction?: 'asc' | 'desc';
  project_id?: string | number;
  projectId?: string | number;
  tenant_id?: string | number;
  [key: string]: string | number | boolean | undefined;
};

export type SearchGroup<T> = {
  total?: number;
  items?: T[];
};
