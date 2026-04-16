export type ListParams = {
  page?: number;
  limit?: number;
  q?: string;
  search?: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token?: string | null;
  user: {
    email: string;
    tenant?: string;
    tenant_id?: string;
    role?: string;
    name?: string;
  };
};
