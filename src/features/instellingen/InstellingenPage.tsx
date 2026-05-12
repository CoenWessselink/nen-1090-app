import { DatabaseZap, RefreshCcw, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/feedback/InlineMessage";
import { useAuthStore } from "@/app/store/auth-store";
import { useUiStore } from "@/app/store/ui-store";
import { useInspectionTemplates, useMaterials, useSettings, useWeldCoordinators, useWelders, useWps } from "@/hooks/useSettings";
import { MasterDataManager } from "@/features/instellingen/components/MasterDataManager";
import { CompanySettingsCard } from "@/features/instellingen/components/CompanySettingsCard";
import { InspectionTemplatesManager } from "@/features/instellingen/components/InspectionTemplatesManager";

type SettingsTab = "organisatie" | "masterdata";

export function InstellingenPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SettingsTab>("masterdata");
  const [message, setMessage] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const pushNotification = useUiStore((state) => state.pushNotification);

  const backendSettings = useSettings();
  const wps = useWps();
  const materials = useMaterials();
  const welders = useWelders();
  const weldCoordinators = useWeldCoordinators();
  const inspectionTemplates = useInspectionTemplates();

  const masterDataCount = useMemo(
    () =>
      (wps.data?.items || []).length +
      (materials.data?.items || []).length +
      (welders.data?.items || []).length +
      (weldCoordinators.data?.items || []).length +
      (inspectionTemplates.data?.items || []).length,
    [inspectionTemplates.data?.items, materials.data?.items, weldCoordinators.data?.items, welders.data?.items, wps.data?.items],
  );

  const refreshAll = () => {
    backendSettings.refetch();
    wps.refetch();
    materials.refetch();
    welders.refetch();
    weldCoordinators.refetch();
    inspectionTemplates.refetch();

    setMessage("Backend vernieuwd.");

    pushNotification({
      title: "Backend vernieuwd",
      description: "Settings en masterdata opnieuw geladen.",
      tone: "success",
    });
  };

  return (
    <div className="page-stack settings-page" data-settings-page>
      <section className="section-banner settings-hero">
        <div className="section-banner-copy">
          <h1>Settings</h1>
        </div>

        <div className="section-banner-actions">
          <Button variant="secondary" onClick={refreshAll}>
            <RefreshCcw size={16} /> Refresh
          </Button>
        </div>
      </section>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <div className="section-nav-grid cols-2 settings-grid">
        <button
          type="button"
          className={`section-nav-tile ${tab === "masterdata" ? "is-active" : ""}`}
          onClick={() => setTab("masterdata")}
        >
          <div className="section-nav-tile-top">
            <DatabaseZap size={18} />
            <span>Masterdata</span>
          </div>

          <div className="section-nav-tile-value">{masterDataCount}</div>

          <strong>WPS, materialen, lassers en inspectietemplates</strong>
        </button>

        <button
          type="button"
          className={`section-nav-tile ${tab === "organisatie" ? "is-active" : ""}`}
          onClick={() => setTab("organisatie")}
        >
          <div className="section-nav-tile-top">
            <Settings2 size={18} />
            <span>Organisatie</span>
          </div>

          <div className="section-nav-tile-value">{user?.tenant || "Tenant"}</div>

          <strong>Bedrijfsinstellingen en branding</strong>
        </button>
      </div>

      {tab === "organisatie" ? (
        <div className="content-grid-2 settings-sections">
          <CompanySettingsCard />

          <Card className="settings-card">
            <div className="section-title-row">
              <h3>Tenant</h3>
            </div>

            <div className="detail-grid">
              <div>
                <span>Gebruiker</span>
                <strong>{user?.email || "—"}</strong>
              </div>

              <div>
                <span>Tenant</span>
                <strong>{user?.tenant || "—"}</strong>
              </div>

              <div>
                <span>Rol</span>
                <strong>{user?.role || "—"}</strong>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "masterdata" ? (
        <div className="page-stack settings-sections">
          <div className="section-nav-grid cols-2 settings-grid">
            <button
              type="button"
              className="section-nav-tile"
              onClick={() => navigate('/instellingen/templates')}
            >
              <div className="section-nav-tile-top">
                <DatabaseZap size={18} />
                <span>Inspectietemplates</span>
              </div>

              <div className="section-nav-tile-value">{(inspectionTemplates.data?.items || []).length}</div>

              <strong>Templatebeheer</strong>
            </button>

            <button
              type="button"
              className="section-nav-tile"
              onClick={() => navigate('/instellingen/normeringen')}
            >
              <div className="section-nav-tile-top">
                <DatabaseZap size={18} />
                <span>Normeringen</span>
              </div>

              <div className="section-nav-tile-value">NEN</div>

              <strong>Normprofielen en normenbibliotheek</strong>
            </button>
          </div>

          <MasterDataManager title="WPS" type="wps" rows={wps.data?.items || []} isLoading={wps.isLoading} isError={wps.isError} refetch={wps.refetch} />
          <MasterDataManager title="Materialen" type="materials" rows={materials.data?.items || []} isLoading={materials.isLoading} isError={materials.isError} refetch={materials.refetch} />
          <MasterDataManager title="Lassers" type="welders" rows={welders.data?.items || []} isLoading={welders.isLoading} isError={welders.isError} refetch={welders.refetch} />
          <MasterDataManager title="Lascoördinatoren" type="weld-coordinators" rows={weldCoordinators.data?.items || []} isLoading={weldCoordinators.isLoading} isError={weldCoordinators.isError} refetch={weldCoordinators.refetch} />
          <InspectionTemplatesManager />
        </div>
      ) : null}
    </div>
  );
}
