export type Tenant = Record<string, any> & {
  id: string;
  name: string;
  status?: string;
  subscription_status?: string;
  is_active?: boolean;
  users_count?: number;
  user_count?: number;
  seats_purchased?: number;
  price_per_seat_year_cents?: number;
};

export type TenantCreateInput = Record<string, any>;
export type TenantPatchInput = Record<string, any>;
export type TenantUser = Record<string, any> & { user_id: string; email: string; role?: string; is_active?: boolean };
export type TenantUserCreateInput = Record<string, any>;
export type TenantUserPatchInput = Record<string, any>;
export type AuditSummary = Record<string, any>;
export type PlatformSummary = Record<string, any> & {
  total_tenants: number;
  active_tenants: number;
  inactive_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_seats: number;
};
export type BillingStatus = Record<string, any> & {
  status?: string;
  seats_purchased?: number;
  users_count?: number;
  mollie_next_payment_date?: string;
  valid_until?: string;
};
export type BillingPayment = Record<string, any>;
