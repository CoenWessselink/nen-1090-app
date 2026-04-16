import { DatabaseZap, LockKeyhole, Settings2, Shield, Wifi } from "lucide-react";
import ModuleHero from "@/components/layout/ModuleHero";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/drawer/Drawer";
import { InlineMessage } from "@/components/feedback/InlineMessage";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useAuthStore } from "@/app/store/auth-store";
import { useUiStore } from "@/app/store/ui-store";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { useInspectionTemplates, useMaterials, useSettings, useWeldCoordinators, useWelders, useWps } from "@/hooks/useSettings";
import { validateObjectPayload } from "@/utils/contracts";
import { MasterDataManager } from "@/features/instellingen/components/MasterDataManager";
import { CompanySettingsCard } from "@/features/instellingen/components/CompanySettingsCard";
import { InspectionTemplatesManager } from "@/features/instellingen/components/InspectionTemplatesManager";
import { MobilePageScaffold } from "@/features/mobile/MobilePageScaffold";

const tabs = [
  { value: "organisatie", label: "Organisatie" },
  { value: "masterdata", label: "Masterdata" },
  { value: "security", label: "Security" },
  { value: "integraties", label: "Integraties" },
  { value: "contractvalidatie", label: "Contractvalidatie" },
];

const SETTINGS_STORAGE_KEY = "nen1090.frontend-settings";

type FrontendSettings = { notificationEmail: string };

function loadFrontendSettings(email: string) {
  if (typeof window === "undefined") return { notificationEmail: email } satisfies FrontendSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { notificationEmail: email } satisfies FrontendSettings;
    const parsed = JSON.parse(raw) as Partial<FrontendSettings>;
    return { notificationEmail: parsed.notificationEmail || email } satisfies FrontendSettings;
  } catch {
    return { notificationEmail: email } satisfies FrontendSettings;
  }
}

function normalizeSettingRows(payload: Record<string, unknown> | undefined) {
  return Object.entries(payload || {}).map(([key, value]) => ({ key, value: typeof value === "object" ? JSON.stringify(value) : String(value) }));
}

export function InstellingenPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("organisatie");
  const [message, setMessage] = useState<string | null>(null);
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const pushNotification = useUiStore((state) => state.pushNotification);
  const health = useSystemHealth();
  const backendSettings = useSettings();
  const wps = useWps();
  const materials = useMaterials();
  const welders = useWelders();
  const weldCoordinators = useWeldCoordinators();
  const inspectionTemplates = useInspectionTemplates();
  const [notificationEmail, setNotificationEmail] = useState(loadFrontendSettings(user?.email || "").notificationEmail);
  const isMobileLayout = typeof window !== "undefined" ? window.innerWidth < 768 : false;

  const masterDataCount = (wps.data?.items || []).length + (materials.data?.items || []).length + (welders.data?.items || []).length + (weldCoordinators.data?.items || []).length + (inspectionTemplates.data?.items || []).length;

  const sessionSummary = useMemo(() => ({
    authenticated: Boolean(token && user),
    apiStatus: health.isError ? "Niet bereikbaar" : String(health.data?.status || "Actief"),
  }), [health.data, health.isError, token, user]);

  const backendSettingRows = useMemo(() => normalizeSettingRows(backendSettings.data), [backendSettings.data]);
  const contractValidation = validateObjectPayload(backendSettings.data);

  const saveFrontendSettings = () => {
    if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ notificationEmail } satisfies FrontendSettings));
    setMessage("Frontend-instellingen opgeslagen.");
    pushNotification({ title: "Instellingen opgeslagen", description: "Frontend-voorkeuren zijn lokaal opgeslagen zonder nieuwe backendcontracten te verzinnen.", tone: "success" });
  };

  const content = (
    <div className="page-stack settings-page">
      <ModuleHero
        title="Instellingen"
        description="Gebruik dezelfde programmabrede header en open stamdata, security en integraties via duidelijke tegels."
        kicker="Tenant- en masterdatabeheer"
        actions={
          <>
            <Button variant="secondary" onClick={() => backendSettings.refetch()}>Backend verversen</Button>
            <Button variant="secondary" onClick={() => setSessionDrawerOpen(true)}>Sessies bekijken</Button>
          </>
        }
        tiles={[
          { label: "Organisatie", value: sessionSummary.authenticated ? "Actief" : "Controleer", meta: user?.tenant || "Tenantcontext en voorkeuren", icon: Settings2, onClick: () => setTab("organisatie"), tone: "primary" },
          { label: "Masterdata", value: String(masterDataCount), meta: "WPS, materialen, lassers, coördinatoren en templates", icon: DatabaseZap, onClick: () => setTab("masterdata"), tone: "success" },
          { label: "Security", value: refreshToken ? "Refresh OK" : "Controle nodig", meta: "JWT, rollen en sessieherstel", icon: Shield, onClick: () => setTab("security"), tone: "warning" },
          { label: "Integraties", value: health.isError ? "Niet bevestigd" : "Online", meta: "Health, backend-settings en contractvalidatie", icon: Wifi, onClick: () => setTab("integraties"), tone: "neutral" },
        ]}
      />
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <div className="card-grid cols-4 settings-overview-grid">
        <button type="button" className="module-hero-tile module-hero-tile-primary" onClick={() => setTab("organisatie")}>
          <div className="module-hero-tile-top"><Settings2 size={18} /><span>Organisatie</span></div>
          <strong>Kaarten en voorkeuren</strong>
          <small>Open tenantcontext, sessiestatus en organisatievoorkeuren in kaartvorm.</small>
        </button>
        <button type="button" className="module-hero-tile module-hero-tile-success" onClick={() => setTab("masterdata")}>
          <div className="module-hero-tile-top"><DatabaseZap size={18} /><span>Masterdata</span></div>
          <strong>{masterDataCount} records</strong>
          <small>WPS, materialen, lassers, coördinatoren en inspectietemplates via dezelfde tegellogica als de rest van de app.</small>
        </button>
        <button type="button" className="module-hero-tile module-hero-tile-warning" onClick={() => setTab("security") }>
          <div className="module-hero-tile-top"><Shield size={18} /><span>Security</span></div>
          <strong>{refreshToken ? "Refresh-flow actief" : "Controle nodig"}</strong>
          <small>JWT, rollen, sessieherstel en beveiligingssamenvatting.</small>
        </button>
        <button type="button" className="module-hero-tile module-hero-tile-neutral" onClick={() => setTab("integraties") }>
          <div className="module-hero-tile-top"><Wifi size={18} /><span>Integraties</span></div>
          <strong>{health.isError ? "Niet bevestigd" : "Online"}</strong>
          <small>Backend health, settings-contract en validatie op één plek.</small>
        </button>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "organisatie" ? (
        <>
          <div className="content-grid-2">
            <Card>
              <div className="section-title-row"><h3><Settings2 size={18} /> Tenantcontext</h3><Badge tone="neutral">Frontend</Badge></div>
              <div className="detail-grid">
                <div><span>Gebruiker</span><strong>{user?.email || "—"}</strong></div>
                <div><span>Tenant</span><strong>{user?.tenant || "—"}</strong></div>
                <div><span>Rol</span><strong>{user?.role || "—"}</strong></div>
                <div><span>Tenant ID</span><strong>{String(user?.tenantId || "—")}</strong></div>
              </div>
            </Card>
            <Card>
              <div className="section-title-row"><h3><Shield size={18} /> Sessiestatus</h3></div>
              <div className="detail-grid">
                <div><span>Authenticatie</span><strong>{sessionSummary.authenticated ? "Actief" : "Niet actief"}</strong></div>
                <div><span>API status</span><strong>{sessionSummary.apiStatus}</strong></div>
                <div><span>Rolgebaseerde routing</span><strong>Ingeschakeld</strong></div>
                <div><span>Refresh-flow</span><strong>{refreshToken ? "Beschikbaar" : "Niet aanwezig"}</strong></div>
              </div>
            </Card>
          </div>
          <div className="content-grid-2">
            <CompanySettingsCard />
            <Card>
              <div className="section-title-row"><h3><LockKeyhole size={18} /> Organisatievoorkeuren</h3></div>
              <div className="form-grid">
                <label><span>Notificatie e-mail</span><Input value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} /></label>
                <label><span>Tenantnaam</span><Input defaultValue={user?.tenant || ''} disabled /></label>
                <div className="stack-actions">
                  <Button onClick={saveFrontendSettings}>Opslaan</Button>
                  <Button variant="secondary" onClick={() => setSessionDrawerOpen(true)}>Sessies bekijken</Button>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {tab === "masterdata" ? (
        <div className="page-stack">
          <div className="card-grid cols-3 settings-masterdata-tiles">
            <button type="button" className="module-hero-tile module-hero-tile-primary" onClick={() => navigate('/instellingen/templates')}><div className="module-hero-tile-top"><DatabaseZap size={18} /><span>Inspectietemplates</span></div><strong>{(inspectionTemplates.data?.items || []).length}</strong><small>Volledig beheer per EXC-klasse.</small></button>
            <button type="button" className="module-hero-tile module-hero-tile-success" onClick={() => window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' })}><div className="module-hero-tile-top"><DatabaseZap size={18} /><span>Masterdata</span></div><strong>{masterDataCount}</strong><small>WPS, materialen, lassers en coördinatoren onder elkaar.</small></button>
            <div className="module-hero-tile module-hero-tile-neutral"><div className="module-hero-tile-top"><Shield size={18} /><span>Standaard</span></div><strong>Enterprise layout</strong><small>Tabel- en kaartweergave gelijk aan de rest van de app.</small></div>
          </div>
          <MasterDataManager title="WPS" type="wps" rows={wps.data?.items || []} isLoading={wps.isLoading} isError={wps.isError} refetch={wps.refetch} />
          <MasterDataManager title="Materialen" type="materials" rows={materials.data?.items || []} isLoading={materials.isLoading} isError={materials.isError} refetch={materials.refetch} />
          <MasterDataManager title="Lassers" type="welders" rows={welders.data?.items || []} isLoading={welders.isLoading} isError={welders.isError} refetch={welders.refetch} />
          <MasterDataManager title="Lascoördinatoren" type="weld-coordinators" rows={weldCoordinators.data?.items || []} isLoading={weldCoordinators.isLoading} isError={weldCoordinators.isError} refetch={weldCoordinators.refetch} />
          <InspectionTemplatesManager />
        </div>
      ) : null}

      {tab === "security" ? (
        <div className="content-grid-2">
          <Card>
            <div className="section-title-row"><h3><Shield size={18} /> Security samenvatting</h3></div>
            <div className="checklist-grid">
              <div className="checklist-item"><strong>JWT flow</strong><span>Access token en refresh token worden gebruikt in api-client wrapper.</span></div>
              <div className="checklist-item"><strong>Tenant headers</strong><span>X-Tenant en X-Tenant-Id worden automatisch toegevoegd.</span></div>
              <div className="checklist-item"><strong>RBAC</strong><span>Routes en schermacties gebruiken rolchecks.</span></div>
              <div className="checklist-item"><strong>Sessieherstel</strong><span>401 responses proberen eerst token refresh.</span></div>
            </div>
          </Card>
          <Card>
            <div className="section-title-row"><h3><LockKeyhole size={18} /> UX guardrails</h3></div>
            <div className="checklist-grid">
              <div className="checklist-item"><strong>Geen backend-herbouw</strong><span>Alleen bestaande API-contracten worden aangesproken.</span></div>
              <div className="checklist-item"><strong>Geen placeholders</strong><span>Acties zijn gekoppeld aan API-calls of expliciet verborgen.</span></div>
              <div className="checklist-item"><strong>Modal-first</strong><span>Create en edit acties openen modals.</span></div>
              <div className="checklist-item"><strong>Datatable-first</strong><span>Masterdata gebruikt uniforme enterprise-tabellen.</span></div>
            </div>
            <div className="form-actions" style={{ marginTop: 16, justifyContent: 'flex-start' }}><Button onClick={() => navigate('/change-password')}>Wachtwoord wijzigen</Button></div>
          </Card>
        </div>
      ) : null}

      {tab === "integraties" ? (
        <Card>
          <div className="section-title-row"><h3><DatabaseZap size={18} /> Backend settings snapshot</h3><Badge tone={backendSettings.isError ? 'warning' : 'success'}>{backendSettings.isError ? 'Contract niet bevestigd' : 'Bestaande response'}</Badge></div>
          {backendSettings.isLoading ? <LoadingState label="Settings laden..." /> : null}
          {backendSettings.isError ? <ErrorState title="Settings niet geladen" description="De frontend leest alleen een bestaand /settings contract wanneer dit beschikbaar is." /> : null}
          {!backendSettings.isLoading && !backendSettings.isError && backendSettingRows.length === 0 ? <EmptyState title="Geen settings teruggegeven" description="Het endpoint reageerde, maar leverde geen sleutel/waarde-payload terug." /> : null}
          {!backendSettings.isLoading && !backendSettings.isError && backendSettingRows.length > 0 ? <div className="list-stack compact-list">{backendSettingRows.map((row) => <div key={row.key} className="list-row"><div><strong>{row.key}</strong><div className="list-subtle">Afkomstig uit bestaand settings-contract</div></div><code>{row.value}</code></div>)}</div> : null}
        </Card>
      ) : null}

      {tab === "contractvalidatie" ? (
        <Card>
          <div className="section-title-row"><h3><DatabaseZap size={18} /> Contractvalidatie</h3><Button variant="secondary" onClick={() => { backendSettings.refetch(); wps.refetch(); materials.refetch(); welders.refetch(); weldCoordinators.refetch(); inspectionTemplates.refetch(); }}>Opnieuw controleren</Button></div>
          <div className="list-stack compact-list">
            <div className="list-row"><div><strong>/settings</strong><div className="list-subtle">Object contract</div></div><Badge tone={contractValidation.ok ? 'success' : 'danger'}>{contractValidation.ok ? 'Bevestigd' : 'Fout'}</Badge></div>
            <div className="list-row"><div><strong>/settings/wps</strong><div className="list-subtle">WPS lijstcontract</div></div><Badge tone={wps.isError ? 'danger' : 'success'}>{wps.isError ? 'Fout' : 'Actief'}</Badge></div>
            <div className="list-row"><div><strong>/settings/materials</strong><div className="list-subtle">Materialen lijstcontract</div></div><Badge tone={materials.isError ? 'danger' : 'success'}>{materials.isError ? 'Fout' : 'Actief'}</Badge></div>
            <div className="list-row"><div><strong>/settings/welders</strong><div className="list-subtle">Lassers lijstcontract</div></div><Badge tone={welders.isError ? 'danger' : 'success'}>{welders.isError ? 'Fout' : 'Actief'}</Badge></div>
            <div className="list-row"><div><strong>/settings/weld-coordinators</strong><div className="list-subtle">Lascoördinatoren lijstcontract</div></div><Badge tone={weldCoordinators.isError ? 'danger' : 'success'}>{weldCoordinators.isError ? 'Fout' : 'Actief'}</Badge></div>
            <div className="list-row"><div><strong>/settings/inspection-templates</strong><div className="list-subtle">Inspectietemplates lijstcontract</div></div><Badge tone={inspectionTemplates.isError ? 'danger' : 'success'}>{inspectionTemplates.isError ? 'Fout' : 'Actief'}</Badge></div>
          </div>
        </Card>
      ) : null}

      <Drawer open={sessionDrawerOpen} title="Sessiegegevens" onClose={() => setSessionDrawerOpen(false)}>
        <pre className="code-block">{JSON.stringify({ user, tokenPresent: Boolean(token), refreshTokenPresent: Boolean(refreshToken) }, null, 2)}</pre>
      </Drawer>
    </div>
  );

  if (isMobileLayout) {
    return <MobilePageScaffold title="Instellingen" subtitle="Mobiele instellingen">{content}</MobilePageScaffold>;
  }

  return content;
}
