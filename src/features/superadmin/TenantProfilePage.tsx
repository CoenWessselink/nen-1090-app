import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import client from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import {
  useTenantAudit,
  useTenantBillingPanel,
  useTenantDetail,
  useTenantProfile,
  useTenantSecurityOverview,
  useTenantUsers,
  useUpdateTenantProfile,
} from '@/hooks/useTenantAdmin';
import { useTenantBillingActions, useTenantInvoices } from '@/hooks/usePlatformBilling';
import type { TenantProfile } from '@/types/domain';

const EMPTY_PROFILE: TenantProfile = {
  tenant_id: '',
  company_name: '',
  trade_name: '',
  address_line_1: '',
  address_line_2: '',
  postcode: '',
  city: '',
  country: 'Nederland',
  phone: '',
  company_email: '',
  website: '',
  chamber_of_commerce: '',
  vat_number: '',
  iban: '',
  bic: '',
  contact_person: '',
  billing_email: '',
  administration_email: '',
  g_account: '',
  payroll_tax_number: '',
  sbi_code: '',
  sector_or_cao: '',
  insurance_or_certification: '',
  wka_status: '',
  wka_notes: '',
};

function value(v: unknown, fallback = '—') {
  return v === undefined || v === null || v === '' ? fallback : String(v);
}

function moneyFromCents(v: unknown) {
  const cents = Number(v || 0);
  if (!Number.isFinite(cents)) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function statusColor(ok: boolean) {
  return ok ? '#15803d' : '#b91c1c';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function Field({ label, value: fieldValue, onChange, multiline = false }: { label: string; value: string; onChange?: (value: string) => void; multiline?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      {multiline ? (
        <textarea value={fieldValue} onChange={(event) => onChange?.(event.target.value)} rows={4} className="textarea-field" />
      ) : (
        <input value={fieldValue} onChange={(event) => onChange?.(event.target.value)} style={{ minHeight: 40, padding: '10px 12px', borderRadius: 10, border: '1px solid #d7dce5' }} />
      )}
    </label>
  );
}

export default function TenantProfilePage() {
  const { tenantId = '' } = useParams();
  const tenantDetail = useTenantDetail(tenantId, Boolean(tenantId));
  const tenantProfile = useTenantProfile(tenantId, Boolean(tenantId));
  const tenantUsers = useTenantUsers(tenantId, Boolean(tenantId));
  const tenantAudit = useTenantAudit(tenantId, Boolean(tenantId));
  const tenantBilling = useTenantBillingPanel(tenantId, Boolean(tenantId));
  const tenantSecurity = useTenantSecurityOverview(tenantId, Boolean(tenantId));
  const tenantInvoices = useTenantInvoices(tenantId);
  const billingActions = useTenantBillingActions(tenantId);
  const updateMutation = useUpdateTenantProfile(tenantId);

  const mailStatus = useQuery({
    queryKey: ['platform-mail-status'],
    queryFn: () => client.get<Record<string, unknown>>('/platform/mail/status'),
  });

  const mailTest = useMutation({
    mutationFn: (to: string) => client.post<Record<string, unknown>>('/platform/mail/test', { to }),
  });

  const [form, setForm] = useState<TenantProfile>(EMPTY_PROFILE);
  const [message, setMessage] = useState<string | null>(null);
  const [mailTestTo, setMailTestTo] = useState('');
  const [mailTestResult, setMailTestResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (tenantProfile.data) {
      setForm({ ...EMPTY_PROFILE, ...(tenantProfile.data as TenantProfile), tenant_id: tenantId });
    }
  }, [tenantProfile.data, tenantId]);

  useEffect(() => {
    const email = String(form.company_email || form.billing_email || form.administration_email || '').trim();
    if (email && !mailTestTo) setMailTestTo(email);
  }, [form.company_email, form.billing_email, form.administration_email, mailTestTo]);

  const users = Array.isArray(tenantUsers.data) ? tenantUsers.data : [];
  const auditItems = Array.isArray(tenantAudit.data) ? tenantAudit.data : [];
  const invoices = Array.isArray(tenantInvoices.data?.items) ? tenantInvoices.data.items : Array.isArray(tenantInvoices.data) ? tenantInvoices.data : [];
  const billing = useMemo(() => (tenantBilling.data || {}) as Record<string, unknown>, [tenantBilling.data]);
  const security = useMemo(() => (tenantSecurity.data || {}) as Record<string, unknown>, [tenantSecurity.data]);
  const mailConfigured = Boolean(mailStatus.data?.configured);

  function setField<K extends keyof TenantProfile>(key: K, newValue: string) {
    setForm((prev) => ({ ...prev, [key]: newValue }));
  }

  async function handleSave() {
    try {
      setMessage(null);
      await updateMutation.mutateAsync(form);
      setMessage('Tenant 360 opgeslagen.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Opslaan mislukt.');
    }
  }

  async function handleCreateInvoice() {
    try {
      setMessage(null);
      await billingActions.createInvoice.mutateAsync({
        totaal_cents: 15000,
        btw_cents: 3150,
        status: 'concept',
        notes: 'Tenant 360 basisfactuur',
        lines: [
          {
            omschrijving: 'Abonnement basis',
            aantal: 1,
            stukprijs_cents: 15000,
            totaal_cents: 15000,
          },
        ],
      });
      setMessage('Factuur aangemaakt.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Factuur aanmaken mislukt.');
    }
  }

  async function handleSendInvoice(invoiceId: string) {
    try {
      setMessage(null);
      await billingActions.sendInvoice.mutateAsync(invoiceId);
      setMessage('Factuur verstuurd.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Factuur versturen mislukt.');
    }
  }

  async function handleCreditInvoice(invoiceId: string) {
    try {
      setMessage(null);
      await billingActions.creditInvoice.mutateAsync({ invoiceId, payload: { reason: 'Credit via Tenant 360' } });
      setMessage('Creditfactuur aangemaakt.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Creditfactuur aanmaken mislukt.');
    }
  }

  async function handleMailTest() {
    if (!mailTestTo.trim()) {
      setMailTestResult({ ok: false, error: 'Vul eerst een test e-mailadres in.' });
      return;
    }
    setMailTestResult(null);
    try {
      const result = await mailTest.mutateAsync(mailTestTo.trim());
      setMailTestResult(result);
    } catch (error) {
      setMailTestResult({ ok: false, error: error instanceof Error ? error.message : 'Testmail versturen mislukt.' });
    }
  }

  if (!tenantId) {
    return <div style={{ padding: 24 }}>Geen tenant geselecteerd.</div>;
  }

  return (
    <div className="tenant-profile-page" style={{ padding: 24, display: 'grid', gap: 20 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#637083' }}>Tenant 360</div>
        <h1 style={{ margin: '6px 0 8px' }}>{value((tenantDetail.data as any)?.name, tenantId)}</h1>
        <p style={{ margin: 0, color: '#637083' }}>Compleet overzicht van profiel, WKA, users, mailstatus, billing en audit.</p>
      </div>

      {message ? <InlineMessage tone={message.toLowerCase().includes('mislukt') ? 'danger' : 'success'}>{message}</InlineMessage> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <Card><strong>Status</strong><div>{value((tenantDetail.data as any)?.status || billing.subscription_status)}</div></Card>
        <Card><strong>Access</strong><div>{value(security.access_mode || billing.access_mode)}</div></Card>
        <Card><strong>Users</strong><div>{users.length}</div></Card>
        <Card><strong>Openstaand</strong><div>{moneyFromCents(billing.balance_due_cents || billing.outstanding_cents)}</div></Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <Section title="Bedrijfsgegevens & contact">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Field label="Bedrijfsnaam" value={String(form.company_name || '')} onChange={(v) => setField('company_name', v)} />
            <Field label="Handelsnaam" value={String(form.trade_name || '')} onChange={(v) => setField('trade_name', v)} />
            <Field label="Adres" value={String(form.address_line_1 || '')} onChange={(v) => setField('address_line_1', v)} />
            <Field label="Adresregel 2" value={String(form.address_line_2 || '')} onChange={(v) => setField('address_line_2', v)} />
            <Field label="Postcode" value={String(form.postcode || '')} onChange={(v) => setField('postcode', v)} />
            <Field label="Plaats" value={String(form.city || '')} onChange={(v) => setField('city', v)} />
            <Field label="Land" value={String(form.country || '')} onChange={(v) => setField('country', v)} />
            <Field label="Telefoon" value={String(form.phone || '')} onChange={(v) => setField('phone', v)} />
            <Field label="Contactpersoon" value={String(form.contact_person || '')} onChange={(v) => setField('contact_person', v)} />
            <Field label="Bedrijf e-mail" value={String(form.company_email || '')} onChange={(v) => setField('company_email', v)} />
            <Field label="Factuur e-mail" value={String(form.billing_email || '')} onChange={(v) => setField('billing_email', v)} />
            <Field label="Administratie e-mail" value={String(form.administration_email || '')} onChange={(v) => setField('administration_email', v)} />
            <Field label="Website" value={String(form.website || '')} onChange={(v) => setField('website', v)} />
            <Field label="KVK" value={String(form.chamber_of_commerce || '')} onChange={(v) => setField('chamber_of_commerce', v)} />
            <Field label="BTW" value={String(form.vat_number || '')} onChange={(v) => setField('vat_number', v)} />
            <Field label="IBAN" value={String(form.iban || '')} onChange={(v) => setField('iban', v)} />
            <Field label="BIC" value={String(form.bic || '')} onChange={(v) => setField('bic', v)} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}</Button>
          </div>
        </Section>

        <Section title="WKA & compliance">
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="G-rekening" value={String(form.g_account || '')} onChange={(v) => setField('g_account', v)} />
            <Field label="Loonheffingennummer" value={String(form.payroll_tax_number || '')} onChange={(v) => setField('payroll_tax_number', v)} />
            <Field label="SBI code" value={String(form.sbi_code || '')} onChange={(v) => setField('sbi_code', v)} />
            <Field label="Sector / CAO" value={String(form.sector_or_cao || '')} onChange={(v) => setField('sector_or_cao', v)} />
            <Field label="Verzekering / certificering" value={String(form.insurance_or_certification || '')} onChange={(v) => setField('insurance_or_certification', v)} />
            <Field label="WKA status" value={String(form.wka_status || '')} onChange={(v) => setField('wka_status', v)} />
            <Field label="WKA notities" value={String(form.wka_notes || '')} onChange={(v) => setField('wka_notes', v)} multiline />
          </div>
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Section title="Mailstatus">
          <div style={{ display: 'grid', gap: 10 }}>
            {mailStatus.isError ? <InlineMessage tone="danger">Mailstatus kon niet worden opgehaald.</InlineMessage> : null}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ color: statusColor(mailConfigured) }}>{mailConfigured ? 'Live mail actief' : 'Mail niet live'}</strong>
                <div style={{ color: '#637083', fontSize: 13 }}>{value(mailStatus.data?.mode_description)}</div>
              </div>
              <span style={{ borderRadius: 999, padding: '6px 10px', background: mailConfigured ? '#dcfce7' : '#fee2e2', color: statusColor(mailConfigured), fontWeight: 700, fontSize: 12 }}>
                {value(mailStatus.data?.provider, 'preview')}
              </span>
            </div>
            <div><strong>Afzender:</strong> {value(mailStatus.data?.sender)}</div>
            <div><strong>SMTP host:</strong> {value(mailStatus.data?.smtp_host)}</div>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Test e-mailadres</span>
              <input value={mailTestTo} onChange={(event) => setMailTestTo(event.target.value)} style={{ minHeight: 40, padding: '10px 12px', borderRadius: 10, border: '1px solid #d7dce5' }} placeholder="naam@bedrijf.nl" />
            </label>
            <div>
              <Button onClick={handleMailTest} disabled={mailTest.isPending}>{mailTest.isPending ? 'Testmail versturen...' : 'Verstuur testmail'}</Button>
            </div>
            {mailTestResult ? (
              <InlineMessage tone={mailTestResult.ok ? 'success' : 'danger'}>
                {mailTestResult.ok ? 'Testmail succesvol verzonden.' : `Testmail niet verzonden: ${value(mailTestResult.error, 'onbekende fout')}`}
                {mailTestResult.mode ? <div>Mode: {String(mailTestResult.mode)}</div> : null}
                {mailTestResult.outbox_path ? <div>Preview: {String(mailTestResult.outbox_path)}</div> : null}
              </InlineMessage>
            ) : null}
          </div>
        </Section>

        <Section title="Billing">
          <div style={{ display: 'grid', gap: 8 }}>
            <div><strong>Subscription status:</strong> {value(billing.subscription_status || billing.status)}</div>
            <div><strong>Seats:</strong> {value(billing.seats_purchased || billing.seats, '0')}</div>
            <div><strong>Valid until:</strong> {value(billing.valid_until || billing.current_period_end)}</div>
            <div><strong>Openstaand:</strong> {moneyFromCents(billing.balance_due_cents || billing.outstanding_cents)}</div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button onClick={handleCreateInvoice} disabled={billingActions.createInvoice.isPending}>{billingActions.createInvoice.isPending ? 'Aanmaken...' : 'Create invoice'}</Button>
          </div>
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Section title="Gebruikers">
          <div style={{ display: 'grid', gap: 10 }}>
            {users.length ? users.map((user: any) => (
              <div key={String(user.user_id || user.id)} style={{ border: '1px solid #e3e8ef', borderRadius: 10, padding: 12 }}>
                <div><strong>{value(user.email)}</strong></div>
                <div>Rol: {value(user.role)}</div>
                <div>Actief: {String(Boolean(user.is_active))}</div>
              </div>
            )) : <div>Geen gebruikers gevonden.</div>}
          </div>
        </Section>

        <Section title="Audit & historie">
          <div style={{ display: 'grid', gap: 10 }}>
            {auditItems.length ? auditItems.slice(0, 10).map((item: any, index: number) => (
              <div key={String(item.id || index)} style={{ border: '1px solid #e3e8ef', borderRadius: 10, padding: 12 }}>
                <div><strong>{value(item.action)}</strong></div>
                <div>Entity: {value(item.entity)}</div>
                <div>Datum: {value(item.created_at)}</div>
              </div>
            )) : <div>Geen auditregels beschikbaar.</div>}
          </div>
        </Section>
      </div>

      <Section title="Facturen">
        <div style={{ display: 'grid', gap: 10 }}>
          {invoices.length ? invoices.map((invoice: any) => (
            <div key={String(invoice.id)} style={{ border: '1px solid #e3e8ef', borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}>
              <div><strong>{value(invoice.number || invoice.invoice_number, invoice.id)}</strong></div>
              <div>Status: {value(invoice.status)}</div>
              <div>Totaal: {moneyFromCents(invoice.total_cents)}</div>
              <div>PDF: {value(invoice.pdf_url)}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => handleSendInvoice(String(invoice.id))} disabled={billingActions.sendInvoice.isPending}>Send invoice</Button>
                <Button variant="secondary" onClick={() => handleCreditInvoice(String(invoice.id))} disabled={billingActions.creditInvoice.isPending}>Credit</Button>
              </div>
            </div>
          )) : <div>Nog geen facturen.</div>}
        </div>
      </Section>
    </div>
  );
}
