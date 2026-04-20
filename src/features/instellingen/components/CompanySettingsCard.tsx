
import { Building2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { useCompanySettings, useUpdateCompanySettings, useUploadCompanyLogo } from '@/hooks/useSettings';

export function CompanySettingsCard() {
  const company = useCompanySettings();
  const updateMutation = useUpdateCompanySettings();
  const uploadMutation = useUploadCompanyLogo();
  const [message, setMessage] = useState<string | null>(null);
  const data = (company.data || {}) as Record<string, unknown>;
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const value = (key: string) => String((draft[key] ?? data[key] ?? '') || '');

  async function save() {
    await updateMutation.mutateAsync({
      company_name: value('company_name'),
      address_line_1: value('address_line_1'),
      address_line_2: value('address_line_2'),
      postal_code: value('postal_code'),
      city: value('city'),
      country: value('country'),
      phone: value('phone'),
      email: value('email'),
      website: value('website'),
      kvk_number: value('kvk_number'),
      vat_number: value('vat_number'),
    });
    setMessage('Bedrijfsgegevens opgeslagen.');
  }

  async function handleLogo(file: File) {
    await uploadMutation.mutateAsync(file);
    setMessage('Logo opgeslagen.');
  }

  return (
    <Card>
      <div className="section-title-row"><h3><Building2 size={18} /> Bedrijf</h3></div>
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      <div className="form-grid">
        <label><span>Bedrijfsnaam</span><Input value={value('company_name')} onChange={(event) => setDraft((prev) => ({ ...prev, company_name: event.target.value }))} /></label>
        <label><span>Adresregel 1</span><Input value={value('address_line_1')} onChange={(event) => setDraft((prev) => ({ ...prev, address_line_1: event.target.value }))} /></label>
        <label><span>Adresregel 2</span><Input value={value('address_line_2')} onChange={(event) => setDraft((prev) => ({ ...prev, address_line_2: event.target.value }))} /></label>
        <label><span>Postcode</span><Input value={value('postal_code')} onChange={(event) => setDraft((prev) => ({ ...prev, postal_code: event.target.value }))} /></label>
        <label><span>Plaats</span><Input value={value('city')} onChange={(event) => setDraft((prev) => ({ ...prev, city: event.target.value }))} /></label>
        <label><span>Land</span><Input value={value('country')} onChange={(event) => setDraft((prev) => ({ ...prev, country: event.target.value }))} /></label>
        <label><span>Telefoon</span><Input value={value('phone')} onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))} /></label>
        <label><span>E-mail</span><Input value={value('email')} onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))} /></label>
        <label><span>Website</span><Input value={value('website')} onChange={(event) => setDraft((prev) => ({ ...prev, website: event.target.value }))} /></label>
        <label><span>KvK</span><Input value={value('kvk_number')} onChange={(event) => setDraft((prev) => ({ ...prev, kvk_number: event.target.value }))} /></label>
        <label><span>BTW</span><Input value={value('vat_number')} onChange={(event) => setDraft((prev) => ({ ...prev, vat_number: event.target.value }))} /></label>
      </div>
      <div className="stack-actions" style={{ marginTop: 16 }}>
        <label className="buttonlike-file">
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleLogo(file);
          }} />
          <span><Upload size={16} /> Logo uploaden</span>
        </label>
        <Button onClick={() => void save()} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}</Button>
      </div>
      {data.logo_download_url ? (
        <div style={{ marginTop: 12 }}>
          <img src={String(data.logo_download_url)} alt="Logo" style={{ maxHeight: 72, maxWidth: 180, objectFit: 'contain' }} />
        </div>
      ) : null}
    </Card>
  );
}
