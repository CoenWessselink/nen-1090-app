import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, FileStack, Layers3, RefreshCcw, Search, ShieldCheck } from 'lucide-react';
import { getNormProfiles, getNormStandards, getNormSystems, getNormTemplates, type InspectionTemplate, type NormProfile, type NormStandard, type NormSystem } from '@/api/norms';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';

const tabs = [
  { key: 'systems', label: 'Normsystemen', icon: Layers3 },
  { key: 'standards', label: 'Normenbibliotheek', icon: BookOpenCheck },
  { key: 'profiles', label: 'Normprofielen', icon: ShieldCheck },
  { key: 'templates', label: 'Inspectietemplates', icon: FileStack },
] as const;

type TabKey = (typeof tabs)[number]['key'];

function normalized(value: unknown) { return String(value || '').toLowerCase(); }
function matchesQuery(row: Record<string, unknown>, query: string) { return !query || Object.values(row).some((value) => normalized(value).includes(query.toLowerCase())); }
function activeBadge(active?: boolean) { return <Badge tone={active === false ? 'warning' : 'success'}>{active === false ? 'Inactief' : 'Actief'}</Badge>; }

export function NormsSettingsPage() {
  const [tab, setTab] = useState<TabKey>('profiles');
  const [query, setQuery] = useState('');
  const [systems, setSystems] = useState<NormSystem[]>([]);
  const [standards, setStandards] = useState<NormStandard[]>([]);
  const [profiles, setProfiles] = useState<NormProfile[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InspectionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [systemRows, standardRows, profileRows, templateRows] = await Promise.all([
        getNormSystems(), getNormStandards({ active: true }), getNormProfiles({ active: true }), getNormTemplates({ active: true }),
      ]);
      setSystems(systemRows);
      setStandards(standardRows);
      setProfiles(profileRows);
      setTemplates(templateRows);
      setSelectedTemplate((current) => current || templateRows[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Normeringen konden niet worden geladen.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  const visibleSystems = useMemo(() => systems.filter((row) => matchesQuery(row as Record<string, unknown>, query)), [systems, query]);
  const visibleStandards = useMemo(() => standards.filter((row) => matchesQuery(row as Record<string, unknown>, query)), [standards, query]);
  const visibleProfiles = useMemo(() => profiles.filter((row) => matchesQuery(row as Record<string, unknown>, query)), [profiles, query]);
  const visibleTemplates = useMemo(() => templates.filter((row) => matchesQuery(row as Record<string, unknown>, query)), [templates, query]);

  return (
    <div className="page-stack norms-settings-page">
      <section className="section-banner">
        <div className="section-banner-copy">
          <span className="section-banner-kicker">Normgestuurde inspectie-engine</span>
          <h1>Normeringen</h1>
          <p>Beheer normsystemen, normprofielen en inspectietemplates zonder raw JSON-editor.</p>
        </div>
        <div className="section-banner-actions"><Button variant="secondary" onClick={load}><RefreshCcw size={16} /> Verversen</Button></div>
      </section>

      <div className="section-nav-grid cols-4">
        {tabs.map((item) => { const Icon = item.icon; return (
          <button key={item.key} type="button" className={`section-nav-tile ${tab === item.key ? 'is-active' : ''}`} onClick={() => setTab(item.key)}>
            <div className="section-nav-tile-top"><Icon size={18} /><span>{item.label}</span></div>
            <div className="section-nav-tile-value">{item.key === 'systems' ? systems.length : item.key === 'standards' ? standards.length : item.key === 'profiles' ? profiles.length : templates.length}</div>
            <strong>{item.label}</strong><small>Productiecontract uit /api/v1/norms.</small>
          </button>
        ); })}
      </div>

      <Card>
        <div className="section-title-row"><h3><Search size={18} /> Zoeken en filteren</h3></div>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek op code, naam, norm of profiel…" />
      </Card>

      {loading ? <LoadingState label="Normeringen laden…" /> : null}
      {error ? <ErrorState title="Normeringen niet geladen" description={error} /> : null}

      {!loading && !error && tab === 'systems' ? <Card><div className="responsive-table-wrap"><table className="enterprise-table"><thead><tr><th>Code</th><th>Naam</th><th>Regio</th><th>Status</th></tr></thead><tbody>{visibleSystems.map((row) => <tr key={row.id}><td><strong>{row.code}</strong></td><td>{row.name}</td><td>{row.region || '—'}</td><td>{activeBadge(row.is_active)}</td></tr>)}</tbody></table></div>{!visibleSystems.length ? <EmptyState title="Geen normsystemen" description="Er zijn nog geen normsystemen beschikbaar." /> : null}</Card> : null}
      {!loading && !error && tab === 'standards' ? <Card><div className="responsive-table-wrap"><table className="enterprise-table"><thead><tr><th>Code</th><th>Titel</th><th>Versie</th><th>Status</th></tr></thead><tbody>{visibleStandards.map((row) => <tr key={row.id}><td><strong>{row.code}</strong></td><td>{row.title}</td><td>{row.version || '—'}</td><td>{activeBadge(row.is_active)}</td></tr>)}</tbody></table></div>{!visibleStandards.length ? <EmptyState title="Geen normen" description="De normenbibliotheek is nog leeg." /> : null}</Card> : null}
      {!loading && !error && tab === 'profiles' ? <Card><div className="responsive-table-wrap"><table className="enterprise-table"><thead><tr><th>Code</th><th>Naam</th><th>Regio</th><th>EXC</th><th>ISO 3834</th><th>ISO 5817</th><th>Status</th></tr></thead><tbody>{visibleProfiles.map((row) => <tr key={row.id}><td><strong>{row.code}</strong></td><td>{row.name}</td><td>{row.region || '—'}</td><td>{row.exc_class || '—'}</td><td>{row.iso3834_level || '—'}</td><td>{row.iso5817_level || '—'}</td><td>{activeBadge(row.is_active)}</td></tr>)}</tbody></table></div>{!visibleProfiles.length ? <EmptyState title="Geen normprofielen" description="Maak seeddata aan via de fase-1 API-service." /> : null}</Card> : null}
      {!loading && !error && tab === 'templates' ? <div className="content-grid-2"><Card><div className="responsive-table-wrap"><table className="enterprise-table"><thead><tr><th>Code</th><th>Naam</th><th>Type</th><th>Versie</th></tr></thead><tbody>{visibleTemplates.map((row) => <tr key={row.id} onClick={() => setSelectedTemplate(row)} className={selectedTemplate?.id === row.id ? 'is-selected-row' : ''}><td><strong>{row.code}</strong></td><td>{row.name}</td><td>{row.template_type || '—'}</td><td>v{row.version || 1}</td></tr>)}</tbody></table></div></Card><Card><div className="section-title-row"><h3>Template detail</h3>{selectedTemplate ? <Badge tone="neutral">{selectedTemplate.code}</Badge> : null}</div>{selectedTemplate ? <div className="norm-template-preview">{(selectedTemplate.sections || []).map((section) => <section key={section.code}><h4>{section.name}</h4>{(section.items || []).map((item) => <div key={item.code} className="norm-template-item"><strong>{item.label}</strong><span>{item.norm_code || ''} {item.norm_reference || ''}</span>{item.required ? <Badge tone="warning">Verplicht</Badge> : null}</div>)}</section>)}</div> : <EmptyState title="Selecteer een template" description="Klik een template aan om secties en inspectiepunten te bekijken." />}</Card></div> : null}
    </div>
  );
}
