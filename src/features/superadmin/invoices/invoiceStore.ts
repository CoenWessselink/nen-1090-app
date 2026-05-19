const STORAGE_KEY = 'weldinspect:invoices';

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
};

export type Invoice = {
  id: string;
  number: string;
  tenant_id: string;
  tenant_name: string;
  company_name: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
  vat_number: string;
  kvk: string;
  email: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  subtotal_cents: number;
  vat_percent: number;
  vat_cents: number;
  total_cents: number;
  lines: InvoiceLineItem[];
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  notes: string;
  created_at: string;
  created_by: string;
};

function load(): Invoice[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function save(invoices: Invoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function getInvoices(): Invoice[] { return load(); }

export function getInvoice(id: string): Invoice | null { return load().find((i) => i.id === id) || null; }

export function getInvoicesForTenant(tenantId: string): Invoice[] { return load().filter((i) => i.tenant_id === tenantId); }

export function saveInvoice(invoice: Invoice): Invoice {
  const all = load();
  const idx = all.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) all[idx] = invoice; else all.unshift(invoice);
  save(all);
  return invoice;
}

export function deleteInvoice(id: string) {
  save(load().filter((i) => i.id !== id));
}

export function nextInvoiceNumber(): string {
  const all = load();
  const year = new Date().getFullYear();
  const count = all.filter((i) => i.number.startsWith(`WIP-${year}`)).length;
  return `WIP-${year}-${String(count + 1).padStart(4, '0')}`;
}

export function createBlankInvoice(tenantId: string, tenantName: string, createdBy: string): Invoice {
  const now = new Date().toISOString();
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID?.() || `inv-${Date.now()}`,
    number: nextInvoiceNumber(),
    tenant_id: tenantId,
    tenant_name: tenantName,
    company_name: tenantName,
    address: '', postcode: '', city: '', country: 'Nederland',
    vat_number: '', kvk: '', email: '',
    status: 'draft', currency: 'EUR',
    subtotal_cents: 0, vat_percent: 21, vat_cents: 0, total_cents: 0,
    lines: [{ description: 'WeldInspect Pro — Professional licentie', quantity: 1, unit_price_cents: 5900, total_cents: 5900 }],
    issue_date: now.slice(0, 10), due_date: due,
    paid_at: null, notes: '',
    created_at: now, created_by: createdBy,
  };
}

export function recalcInvoice(invoice: Invoice): Invoice {
  const subtotal = invoice.lines.reduce((sum, l) => sum + l.total_cents, 0);
  const vat = Math.round(subtotal * (invoice.vat_percent / 100));
  return { ...invoice, subtotal_cents: subtotal, vat_cents: vat, total_cents: subtotal + vat };
}
