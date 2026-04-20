import { useState, useRef } from 'react';
import { Upload, X, Building } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Fix: Button heeft geen 'size' prop
// Fix: Card accepteert alleen className, geen style prop inline

interface CompanySettings {
  bedrijfsnaam: string;
  kvk_nummer: string;
  btw_nummer: string;
  adres: string;
  contactpersoon: string;
  telefoon: string;
  email: string;
  logo_url?: string;
  iso5817_default_level: string;
}

const ISO_LEVELS = [
  { value: 'B', label: 'B — Zwaar' },
  { value: 'C', label: 'C — Normaal (standaard)' },
  { value: 'D', label: 'D — Licht' },
];

export function CompanySettingsCard({
  initialValues,
  onSave,
  onLogoUpload,
  onLogoDelete,
  saving = false,
}: {
  initialValues?: Partial<CompanySettings>;
  onSave?: (values: CompanySettings) => Promise<void>;
  onLogoUpload?: (file: File) => Promise<string>;
  onLogoDelete?: () => Promise<void>;
  saving?: boolean;
}) {
  const [values, setValues] = useState<CompanySettings>({
    bedrijfsnaam: '', kvk_nummer: '', btw_nummer: '', adres: '',
    contactpersoon: '', telefoon: '', email: '',
    iso5817_default_level: 'C', ...initialValues,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(initialValues?.logo_url ?? null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof CompanySettings, val: string) =>
    setValues((v) => ({ ...v, [key]: val }));

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onLogoUpload) return;
    setLogoUploading(true);
    try {
      const url = await onLogoUpload(file);
      setLogoPreview(url);
      setValues((v) => ({ ...v, logo_url: url }));
    } catch {
      setSaveError('Logo uploaden mislukt.');
    } finally {
      setLogoUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleLogoDelete = async () => {
    if (!onLogoDelete) return;
    try { await onLogoDelete(); setLogoPreview(null); setValues((v) => ({ ...v, logo_url: undefined })); }
    catch { setSaveError('Logo verwijderen mislukt.'); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null); setSaved(false);
    try { await onSave?.(values); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    catch (err) { setSaveError(err instanceof Error ? err.message : 'Opslaan mislukt.'); }
  };

  return (
    <Card>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Bedrijfsinstellingen</div>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Logo */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Bedrijfslogo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logoPreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={logoPreview} alt="Bedrijfslogo"
                  style={{ height: 56, maxWidth: 160, objectFit: 'contain',
                           border: '0.5px solid var(--color-border-tertiary)',
                           borderRadius: 'var(--border-radius-md)', padding: 4, background: '#fff' }} />
                <button type="button" onClick={handleLogoDelete}
                  style={{ position: 'absolute', top: -6, right: -6,
                           background: 'var(--color-background-danger)', color: 'var(--color-text-danger)',
                           border: '0.5px solid var(--color-border-danger)', borderRadius: '50%',
                           width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                           cursor: 'pointer', padding: 0 }}>
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div style={{ width: 80, height: 56, border: '1px dashed var(--color-border-secondary)',
                           borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center',
                           justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                <Building size={20} />
              </div>
            )}
            <div>
              {/* Fix: geen 'size' prop op Button */}
              <Button type="button" variant="secondary" disabled={logoUploading} onClick={() => fileRef.current?.click()}>
                <Upload size={13} style={{ marginRight: 4 }} />
                {logoUploading ? 'Uploaden…' : 'Logo uploaden'}
              </Button>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                PNG of JPG, max 2 MB. Wordt opgenomen in PDF-rapportage.
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange} style={{ display: 'none' }} />
            </div>
          </div>
        </div>

        <label>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Bedrijfsnaam</span>
          <input value={values.bedrijfsnaam} onChange={(e) => set('bedrijfsnaam', e.target.value)} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>KvK-nummer</span>
            <input value={values.kvk_nummer} onChange={(e) => set('kvk_nummer', e.target.value)}
              placeholder="12345678" maxLength={20} />
          </label>
          <label>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>BTW-nummer</span>
            <input value={values.btw_nummer} onChange={(e) => set('btw_nummer', e.target.value)}
              placeholder="NL123456789B01" maxLength={30} />
          </label>
        </div>

        <label>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Adres</span>
          <input value={values.adres} onChange={(e) => set('adres', e.target.value)}
            placeholder="Straat 1, 1234 AB Stad" />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <label>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Contactpersoon</span>
            <input value={values.contactpersoon} onChange={(e) => set('contactpersoon', e.target.value)} />
          </label>
          <label>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Telefoon</span>
            <input value={values.telefoon} onChange={(e) => set('telefoon', e.target.value)}
              type="tel" placeholder="+31 6 12345678" />
          </label>
          <label>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>E-mailadres</span>
            <input value={values.email} onChange={(e) => set('email', e.target.value)}
              type="email" placeholder="info@bedrijf.nl" />
          </label>
        </div>

        <label>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>ISO-5817 standaard kwaliteitsniveau</span>
          <select value={values.iso5817_default_level}
            onChange={(e) => set('iso5817_default_level', e.target.value)}>
            {ISO_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Wordt gebruikt als default bij defect-beoordeling.
          </div>
        </label>

        {saveError && (
          <div style={{ fontSize: 13, color: 'var(--color-text-danger)', background: 'var(--color-background-danger)',
                        padding: '8px 12px', borderRadius: 'var(--border-radius-md)' }}>
            {saveError}
          </div>
        )}
        {saved && (
          <div style={{ fontSize: 13, color: 'var(--color-text-success)', background: 'var(--color-background-success)',
                        padding: '8px 12px', borderRadius: 'var(--border-radius-md)' }}>
            Instellingen opgeslagen.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" disabled={saving}>{saving ? 'Opslaan…' : 'Instellingen opslaan'}</Button>
        </div>
      </form>
    </Card>
  );
}
