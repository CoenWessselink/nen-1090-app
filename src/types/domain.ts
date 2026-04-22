export type EntityBase = {
  id: string | number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type Role =
  | 'platform_admin'
  | 'tenant_admin'
  | 'tenant_user'
  | 'admin'
  | 'inspector'
  | 'viewer'
  | 'planner'
  | 'qc'
  | 'auditor'
  | string;

export type SessionUser = {
  email: string;
  tenant: string;
  tenantId?: string | number;
  role?: Role;
  name?: string;
  [key: string]: unknown;
};

export type WeldStatus = 'concept' | 'pending' | 'in_progress' | 'conform' | 'non_conform' | string;

export type Tenant = EntityBase & {
  id: string;
  name: string;
  status?: string;
  subscription_status?: string;
  access_mode?: string;
  is_active?: boolean;
  users_count?: number;
  user_count?: number;
  seats_purchased?: number;
  price_per_seat_year_cents?: number;
  billing_provider?: string;
  trial_until?: string;
  valid_until?: string;
  webhook_token?: string;
  mollie_customer_id?: string;
  mollie_subscription_id?: string;
  mollie_subscription_status?: string;
  mollie_next_payment_date?: string;
};

export type TenantCreateInput = Record<string, unknown> & {
  name?: string;
  status?: string;
  is_active?: boolean;
  seats_purchased?: number;
  price_per_seat_year_cents?: number;
  billing_provider?: string;
  trial_days?: number;
  create_admin?: { email?: string; password?: string; role?: Role; is_active?: boolean; [key: string]: unknown };
};

export type TenantPatchInput = Record<string, unknown> & {
  name?: string;
  status?: string;
  is_active?: boolean;
  seats_purchased?: number;
  price_per_seat_year_cents?: number;
  billing_provider?: string;
};

export type TenantUser = EntityBase & {
  user_id: string;
  email: string;
  role?: Role;
  is_active?: boolean;
};

export type TenantUserCreateInput = Record<string, unknown> & {
  email?: string;
  password?: string;
  role?: Role;
  is_active?: boolean;
};

export type TenantUserPatchInput = Record<string, unknown> & {
  email?: string;
  role?: Role;
  is_active?: boolean;
};

export type PlatformSummary = Record<string, unknown> & {
  total_tenants: number;
  active_tenants: number;
  inactive_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_seats: number;
};

export type AuditEntry = EntityBase & {
  action?: string;
  entity?: string;
  entity_id?: string | number;
  user_id?: string | number | null;
  ip?: string;
  user_agent?: string;
  meta?: unknown;
};

export type AuditSummary = Record<string, unknown> & {
  total_events?: number;
  last_event_at?: string;
  actions?: Record<string, number>;
  actors?: Record<string, number>;
};

export type BillingStatus = Record<string, unknown> & {
  status?: string;
  subscription_status?: string;
  access_mode?: string;
  seats_purchased?: number;
  users_count?: number;
  mollie_next_payment_date?: string;
  valid_until?: string;
  invoices?: unknown[];
};

export type BillingPayment = EntityBase & {
  tenant_id?: string;
  provider?: string;
  provider_payment_id?: string;
  type?: string;
  amount_cents?: number;
  currency?: string;
  status?: string;
  paid_at?: string;
};

export type Project = EntityBase & {
  id: string;
  name?: string;
  projectnummer?: string;
  code?: string;
  omschrijving?: string;
  client_name?: string;
  opdrachtgever?: string;
  execution_class?: string;
  executieklasse?: string;
  exc_class?: string;
  default_template_id?: string;
  inspection_template_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  coordinator_id?: string;
  coordinator_name?: string;
};

export type Assembly = EntityBase & {
  code?: string;
  name?: string;
  title?: string;
  project_id?: string | number;
  status?: string;
};

export type Weld = EntityBase & {
  code?: string;
  weld_number?: string;
  weld_no?: string;
  welder_name?: string;
  name?: string;
  title?: string;
  project_id?: string | number;
  projectnummer?: string;
  project_name?: string;
  execution_class?: string;
  exc_class?: string;
  default_template_id?: string;
  location?: string;
  description?: string;
  status?: WeldStatus;
};

export type Inspection = EntityBase & {
  project_id?: string | number;
  weld_id?: string | number;
  template_id?: string | number;
  template_name?: string;
  title?: string;
  notes?: string;
  status?: string;
  executed_at?: string;
  result?: string;
  checklist?: Array<Record<string, unknown>>;
};

export type CeDocument = EntityBase & {
  file_name?: string;
  name?: string;
  title?: string;
  file_url?: string;
  url?: string;
  mime_type?: string;
  category?: string;
  project_id?: string | number;
  weld_id?: string | number;
  inspection_id?: string | number;
};

export type ComplianceOverview = Record<string, unknown> & {
  score?: number;
  status?: string;
  summary?: Record<string, unknown>;
  checklist?: Array<Record<string, unknown>>;
  missing_items?: Array<Record<string, unknown> | string>;
};

export type ExportJob = EntityBase & {
  title?: string;
  message?: string;
  type?: string;
  status?: string;
  owner?: string;
  project_id?: string | number;
  project_name?: string;
  welder_name?: string;
  weld_number?: string;
  weld_no?: string;
  projectnummer?: string;
  client_name?: string;
  pdf_url?: string;
  download_url?: string;
};

export type Defect = EntityBase & {
  project_id?: string | number;
  weld_id?: string | number;
  title?: string;
  description?: string;
  status?: string;
  severity?: string;
};

export type ReportItem = ExportJob & {
  report_id?: string;
};

export type PlanningItem = EntityBase & {
  title?: string;
  project_name?: string;
  welder_name?: string;
  weld_number?: string;
  weld_no?: string;
  assignee?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
};

export type DashboardSummary = Record<string, unknown> & {
  total_projects?: number;
  open_projects?: number;
  pending_inspections?: number;
  open_defects?: number;
};

export type GlobalSearchResponse = Record<string, unknown> & {
  projects?: Project[];
  welds?: Weld[];
  inspections?: Inspection[];
  documents?: CeDocument[];
};


export type BillingPlan = EntityBase & {
  code: string;
  name?: string;
  price_cents?: number;
  price_per_seat_cents?: number;
  seats_included?: number;
  max_seats?: number | null;
  is_active?: boolean;
};

export type TenantPermissionsSummary = Record<string, unknown> & {
  tenant_id: string;
  tenant_name?: string;
  access_mode?: string;
  user_count?: number;
  active_user_count?: number;
  role_counts?: Record<string, number>;
  permissions_by_role?: Record<string, string[]>;
  recent_access?: Array<Record<string, unknown>>;
};
