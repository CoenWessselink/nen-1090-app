export type Role = 'ADMIN' | 'PLANNER' | 'USER' | 'VIEWER' | 'SUPERADMIN' | 'TenantAdmin' | 'TenantUser' | 'SuperAdmin';

export type ProjectStatus = 'concept' | 'in-uitvoering' | 'in-controle' | 'gereed' | 'geblokkeerd';
export type WeldStatus = 'conform' | 'defect' | 'gerepareerd';

export type Project = {
  id: string | number;
  projectnummer?: string;
  name?: string;
  omschrijving?: string;
  client_name?: string;
  opdrachtgever?: string;
  execution_class?: string;
  default_template_id?: string;
  executieklasse?: string;
  status?: ProjectStatus | string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
};

export type Assembly = {
  id: string | number;
  project_id?: string | number;
  code?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
};

export type Weld = {
  id: string | number;
  assembly_id?: string | number;
  project_id?: string | number;
  project_name?: string;
  wps_id?: string;
  weld_number?: string;
  weld_no?: string;
  welder_name?: string;
  process?: string;
  inspector_name?: string;
  inspection_date?: string;
  inspection_status?: string;
  location?: string;
  status?: WeldStatus | string;
  execution_class?: string;
  template_id?: string;
  defect_count?: number;
  ndt_required?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type Inspection = {
  id: string | number;
  project_id?: string | number;
  weld_id?: string | number;
  status?: WeldStatus | string;
  result?: WeldStatus | string;
  due_date?: string;
  method?: string;
  template_id?: string | number;
  checks?: Array<{ id?: string | number; group_key?: string; criterion_key?: string; approved?: boolean; status?: WeldStatus | string; comment?: string }>;
  notes?: string;
  remarks?: string;
  inspector?: string;
  [key: string]: unknown;
};

export type Defect = {
  id: string | number;
  project_id?: string | number;
  weld_id?: string | number;
  status?: string;
  severity?: string;
  defect_type?: string;
  notes?: string;
  [key: string]: unknown;
};

export type CeDocument = {
  id: string | number;
  title?: string;
  type?: string;
  status?: string;
  version?: string;
  project_id?: string | number;
  project_name?: string;
  uploaded_at?: string;
  download_url?: string;
  preview_url?: string;
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  uploaded_filename?: string;
  tags?: string[];
  notes?: string | null;
  has_file?: boolean;
  [key: string]: unknown;
};

export type ComplianceOverview = {
  score?: number;
  missing_items?: Array<Record<string, unknown>>;
  checklist?: Array<Record<string, unknown>>;
  inspection_count?: number;
  defect_count?: number;
  attachments_count?: number;
  [key: string]: unknown;
};

export type PlanningItem = {
  id: string | number;
  title?: string;
  project_name?: string;
  assignee?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  [key: string]: unknown;
};

export type ReportItem = {
  id: string | number;
  title?: string;
  type?: string;
  status?: string;
  created_at?: string;
  owner?: string;
  [key: string]: unknown;
};

export type ExportJob = {
  id: string | number;
  project_id?: string | number;
  status?: string;
  type?: string;
  export_type?: string;
  bundle_type?: string;
  message?: string;
  created_at?: string;
  completed_at?: string;
  manifest?: Record<string, unknown> | null;
  manifest_json?: string;
  download_url?: string | null;
  retry_count?: number;
  error_code?: string | null;
  error_detail?: string | null;
  [key: string]: unknown;
};

export type Tenant = {
  id: string | number;
  name?: string;
  subscription_status?: string;
  user_count?: number;
  created_at?: string;
  [key: string]: unknown;
};

export type BillingStatus = {
  status?: string;
  plan?: string;
  next_billing_date?: string;
  [key: string]: unknown;
};

export type DashboardSummary = {
  open_projects?: number;
  open_weld_defects?: number;
  open_inspections?: number;
  ce_dossier_ready?: number;
  [key: string]: unknown;
};

export type GlobalSearchResponse = {
  projects?: Project[];
  assemblies?: Assembly[];
  welds?: Weld[];
  documents?: CeDocument[];
  inspections?: Inspection[];
  [key: string]: unknown;
};

export type SessionUser = {
  email: string;
  tenant?: string;
  tenantId?: string | number;
  role?: Role | string;
  name?: string;
};

export type PagelessResponse<T> = T[] | { items?: T[]; data?: T[]; results?: T[] };

export type AuditEntry = {
  id: string | number;
  title?: string;
  action?: string;
  entity?: string;
  entity_id?: string;
  user_id?: string;
  status?: string;
  created_at?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
};
