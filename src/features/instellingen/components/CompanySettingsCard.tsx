import { Building2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { useCompanySettings, useUpdateCompanySettings, useUploadCompanyLogo } from '@/hooks/useSettings';

const ISO_LEVELS = ['B', 'C', 'D'] as const;

export function CompanySettingsCard() {
  const company = useCompanySettings();
  const updateMutation = useUpdateCompanySettings();
  const uploadMutation = useUploadCompanyLogo();
  const [message, setMessage] = useState<string | null>(null);
  const data = (company.data || {}) as Record<string, unknown>;
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const value = (key: string) => String((draft[key] ?? data[key] ?? '') || '');
  const patch = (key: string, val: string) => setDraft((prev) => ({ ...prev, [key]: val }));

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
      iso5817_level: value('iso5817_level') || 'C',
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
        <label><span>Bedrijfsnaam</span><Input value={value('company_name')} onChange={(e) => patch('company_name', e.target.value)} /></label>
        <label><span>Adresregel 1</span><Input value={value('address_line_1')} onChange={(e) => patch('address_line_1', e.target.value)} /></label>
        <label><span>Adresregel 2</span><Input value={value('address_line_2')} onChange={(e) => patch('address_line_2', e.target.value)} /></label>
        <label><span>Postcode</span><Input value={value('postal_code')} onChange={(e) => patch('postal_code', e.target.value)} /></label>
        <label><span>Plaats</span><Input value={value('city')} onChange={(e) => patch('city', e.target.value)} /></label>
        <label><span>Land</span><Input value={value('country')} onChange={(e) => patch('country', e.target.value)} /></label>
        <label><span>Telefoon</span><Input value={value('phone')} onChange={(e) => patch('phone', e.target.value)} /></label>
        <label><span>E-mail</span><Input value={value('email')} onChange={(e) => patch('email', e.target.value)} /></label>
        <label><span>Website</span><Input value={value('website')} onChange={(e) => patch('website', e.target.value)} /></label>
        <label><span>KvK-nummer</span><Input value={value('kvk_number')} onChange={(e) => patch('kvk_number', e.target.value)} placeholder="12345678" /></label>
        <label><span>BTW-nummer</span><Input value={value('vat_number')} onChange={(e) => patch('vat_number', e.target.value)} placeholder="NL123456789B01" /></label>
        <label>
          <span>ISO-5817 kwaliteitsniveau</span>
          <select value={value('iso5817_level') || 'C'} onChange={(e) => patch('iso5817_level', e.target.value)}>
            <option value="B">B — Zwaar</option>
            <option value="C">C — Normaal (standaard)</option>
            <option value="D">D — Licht</option>
          </select>
        </label>
      </div>
      <div className="stack-actions" style={{ marginTop: 16 }}>
        <label className="buttonlike-file">
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleLogo(file);
          }} />
          <span><Upload size={16} /> Logo uploaden</span>
        </label>
        <Button onClick={() => void save()} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
      {data.logo_download_url ? (
        <div style={{ marginTop: 12 }}>
          <img src={String(data.logo_download_url)} alt="Logo" style={{ maxHeight: 72, maxWidth: 180, objectFit: 'contain' }} />
        </div>
      ) : null}
    </Card>
  );
}
