import { apiRequest } from '@/api/client';
import { exportStyledXlsx } from '@/lib/xlsxExport';

type TenantRow = {
  id: string;
  name?: string;
  display_name?: string;
  status?: string;
  plan?: string;
  seats?: number;
  is_active?: boolean;
  created_at?: string;
};

let installed = false;
let timer: number | null = null;

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('nl-NL');
}

async function fetchTenants() {
  const data = await apiRequest<{ tenants?: TenantRow[]; items?: TenantRow[] }>('/superadmin/tenants?limit=500');
  return data.tenants || data.items || [];
}

function exportTenants(tenants: TenantRow[]) {
  const active = tenants.filter((t) => t.status === 'active' || (t.is_active && t.status !== 'trial')).length;
  const trial = tenants.filter((t) => t.status === 'trial' || t.status === 'trialing').length;
  const suspended = tenants.filter((t) => t.status === 'suspended' || t.status === 'deleted').length;

  exportStyledXlsx({
    filename: `WeldInspect-Pro-Tenants-${todayStamp()}.xlsx`,
    sheetName: 'Tenants',
    title: 'WeldInspect Pro — Tenantoverzicht',
    subtitle: `Export vanaf Superadmin > Commercial & Governance · ${new Date().toLocaleString('nl-NL')} · ${tenants.length} tenants`,
    summary: [
      { label: 'Active', value: active, type: 'integer' },
      { label: 'Trial', value: trial, type: 'integer' },
      { label: 'Suspended', value: suspended, type: 'integer' },
      { label: 'Totaal', value: tenants.length, type: 'integer' },
    ],
    columns: [
      { key: 'display_name', header: 'Tenant', width: 34, value: (tenant) => tenant.display_name || tenant.name || tenant.id },
      { key: 'name', header: 'Naam', width: 28, value: (tenant) => tenant.name || '—' },
      { key: 'id', header: 'Tenant ID', width: 34 },
      { key: 'status', header: 'Status', width: 16, value: (tenant) => tenant.status || '—' },
      { key: 'plan', header: 'Plan', width: 18, value: (tenant) => tenant.plan || '—' },
      { key: 'seats', header: 'Seats', width: 12, type: 'integer', value: (tenant) => tenant.seats || 1 },
      { key: 'is_active', header: 'Actief', width: 12, value: (tenant) => (tenant.is_active ? 'Ja' : 'Nee') },
      { key: 'created_at', header: 'Aangemaakt', width: 18, value: (tenant) => fmtDate(tenant.created_at) },
    ],
    rows: tenants,
  });
}

function ensureButton() {
  if (!window.location.pathname.includes('/superadmin/commercial-governance')) return;
  if (document.querySelector('[data-tenant-overview-excel-export="1"]')) return;

  const selector = document.querySelector('.cg-tenant-selector');
  const search = selector?.querySelector('.cg-search');
  if (!selector || !search?.parentElement) return;

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '12px';
  row.style.flexWrap = 'wrap';

  search.parentElement.insertBefore(row, search);
  row.appendChild(search);
  (search as HTMLElement).style.flex = '1 1 260px';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mobile-primary-button';
  button.dataset.tenantOverviewExcelExport = '1';
  button.innerHTML = 'Export Excel';
  button.addEventListener('click', async () => {
    button.setAttribute('disabled', 'true');
    const original = button.innerHTML;
    button.innerHTML = 'Exporteren…';
    try {
      exportTenants(await fetchTenants());
    } finally {
      button.innerHTML = original;
      button.removeAttribute('disabled');
    }
  });
  row.appendChild(button);
}

export function installTenantOverviewExcelRuntimeExport() {
  if (installed) return;
  installed = true;
  const run = () => ensureButton();
  run();
  timer = window.setInterval(run, 1000);
  window.setTimeout(() => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }, 15000);
  window.addEventListener('popstate', run);
}
