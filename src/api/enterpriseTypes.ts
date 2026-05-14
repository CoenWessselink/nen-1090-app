import type { ApiListResponse, PaginatedApiResponse } from '@/types/api';
import type {
  BillingPayment,
  BillingPlan,
  BillingStatus,
  EntityBase,
  PlatformSecurityOverview,
  Tenant,
  TenantPermissionsSummary,
  TenantSecurityOverview,
  TenantUser,
} from '@/types/domain';

export type EnterpriseId = string | number;

export type EnterpriseListResponse<T> = T[] | ApiListResponse<T> | PaginatedApiResponse<T>;

export type EnterpriseActionResponse = Record<string, unknown> & {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  request_id?: string;
};

export type TenantBillingPanel = BillingStatus & {
  tenant_id?: string;
  tenant_name?: string;
  balance_due_cents?: number;
  outstanding_cents?: number;
  current_period_start?: string;
  current_period_end?: string;
  subscription?: Record<string, unknown>;
  plan?: BillingPlan | string;
  payments?: BillingPayment[];
  invoices?: BillingInvoice[];
};

export type TenantAccessHistoryEntry = EntityBase & {
  tenant_id?: string;
  user_id?: string;
  user_email?: string;
  role?: string;
  action?: string;
  ip?: string;
  user_agent?: string;
  accessed_at?: string;
  occurred_at?: string;
};

export type TenantBillingEvent = EntityBase & {
  tenant_id?: string;
  type?: string;
  event?: string;
  status?: string;
  amount_cents?: number;
  currency?: string;
  message?: string;
  meta?: unknown;
};

export type PlatformGrowthOverview = Record<string, unknown> & {
  tenant_growth?: Array<Record<string, unknown>>;
  active_tenants?: number;
  trial_tenants?: number;
  churned_tenants?: number;
  mrr_cents?: number;
  arr_cents?: number;
  revenue_30d_cents?: number;
};

export type PlatformIntegrationItem = EntityBase & {
  code?: string;
  name?: string;
  provider?: string;
  status?: string;
  configured?: boolean;
  description?: string;
};

export type PlatformIntegrationsCatalog = ApiListResponse<PlatformIntegrationItem> & {
  integrations?: PlatformIntegrationItem[];
};

export type PlatformReportingInsights = Record<string, unknown> & {
  report_count?: number;
  export_count?: number;
  latest_export_at?: string;
  insights?: Array<Record<string, unknown>>;
};

export type BillingInvoiceLine = EntityBase & {
  description?: string;
  omschrijving?: string;
  quantity?: number;
  aantal?: number;
  unit_amount_cents?: number;
  stukprijs_cents?: number;
  total_cents?: number;
  totaal_cents?: number;
  vat_cents?: number;
  btw_cents?: number;
};

export type BillingInvoice = EntityBase & {
  tenant_id?: string;
  invoice_number?: string;
  number?: string;
  status?: string;
  currency?: string;
  subtotal_cents?: number;
  total_cents?: number;
  totaal_cents?: number;
  vat_cents?: number;
  btw_cents?: number;
  balance_due_cents?: number;
  due_date?: string;
  sent_at?: string;
  paid_at?: string;
  pdf_url?: string;
  credited_invoice_id?: string;
  lines?: BillingInvoiceLine[];
};

export type BillingInvoiceLineInput = Record<string, unknown> & {
  description?: string;
  omschrijving?: string;
  quantity?: number;
  aantal?: number;
  unit_amount_cents?: number;
  stukprijs_cents?: number;
  total_cents?: number;
  totaal_cents?: number;
  vat_cents?: number;
  btw_cents?: number;
};

export type ManualPaymentPayload = Record<string, unknown> & {
  amount_cents: number;
  type?: string;
  invoice_id?: string;
  provider?: string;
  status?: string;
  currency?: string;
  paid_at?: string;
};

export type CancelTenantSubscriptionPayload = Record<string, unknown> & {
  reason?: string;
  immediate?: boolean;
  at_period_end?: boolean;
};

export type ChangeTenantPlatformPlanPayload = Record<string, unknown> & {
  plan_code?: string;
  plan?: string;
  seats?: number;
  target_seats?: number;
  billing_cycle?: string;
  status?: string;
  reason?: string;
};

export type CreateTenantInvoicePayload = Record<string, unknown> & {
  description?: string;
  due_in_days?: number;
  status?: string;
  notes?: string;
  total_cents?: number;
  totaal_cents?: number;
  vat_cents?: number;
  btw_cents?: number;
  lines?: BillingInvoiceLineInput[];
};

export type CreditTenantInvoicePayload = Record<string, unknown> & {
  reason?: string;
  amount_cents?: number;
  lines?: BillingInvoiceLineInput[];
};

export type AccessModeOverridePayload = Record<string, unknown> & {
  access_mode?: string;
  status?: string;
  reason?: string;
  expires_at?: string;
};

export type BillingPreviewResponse = Record<string, unknown> & {
  seats?: number;
  target_seats?: number;
  plan?: string;
  plan_code?: string;
  subtotal_cents?: number;
  vat_cents?: number;
  total_cents?: number;
  recurring_cents?: number;
};

export type BillingPaymentStatusResponse = BillingPayment & {
  ok?: boolean;
  provider_status?: string;
  checkout_url?: string;
};

export type BillingInvoicesResponse = EnterpriseListResponse<BillingInvoice> & {
  invoices?: BillingInvoice[];
};

export type BillingPaymentsResponse = EnterpriseListResponse<BillingPayment> & {
  payments?: BillingPayment[];
};

export type BillingPlansResponse = EnterpriseListResponse<BillingPlan> & {
  plans?: BillingPlan[];
};

export type TeamUsersResponse = EnterpriseListResponse<TenantUser> & {
  users?: TenantUser[];
};

export type TenantInviteResponse = EnterpriseActionResponse & {
  user?: TenantUser;
  invite_url?: string;
};

export type PlatformMailStatus = Record<string, unknown> & {
  configured?: boolean;
  provider?: string;
  from_address?: string;
};

export type PlatformMailTestResponse = EnterpriseActionResponse & {
  delivered?: boolean;
  delivery_outbox_path?: string;
};

export type {
  PlatformSecurityOverview,
  Tenant,
  TenantPermissionsSummary,
  TenantSecurityOverview,
  TenantUser,
};
