import { BookMarked, DatabaseZap, RefreshCcw, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
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
      <PageHeader
        title="Instellingen"
        description="Masterdata en organisatie-instellingen; zelfde overzichtsstructuur als het dashboard."
      >
        <Button variant="secondary" onClick={refreshAll}>
          <RefreshCcw size={16} /> Vernieuwen
        </Button>
      </PageHeader>

      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <div className="content-grid-2 settings-grid">
        <button
          type="button"
          aria-pressed={tab === "masterdata"}
          className={`card stat-card card-button${tab === "masterdata" ? " settings-kpi-active" : ""}`}
          onClick={() => setTab("masterdata")}
        >
          <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DatabaseZap size={16} aria-hidden />
            Masterdata
          </div>
          <div className="stat-value">{masterDataCount}</div>
          <div className="stat-meta">WPS, materialen, lassers en inspectietemplates</div>
        </button>

        <button
          type="button"
          aria-pressed={tab === "organisatie"}
          className={`card stat-card card-button${tab === "organisatie" ? " settings-kpi-active" : ""}`}
          onClick={() => setTab("organisatie")}
        >
          <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Settings2 size={16} aria-hidden />
            Organisatie
          </div>
          <div className="stat-value">{user?.tenant || "—"}</div>
          <div className="stat-meta">Bedrijfsinstellingen en branding</div>
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
          <div className="content-grid-2 settings-grid">
            <button
              type="button"
              className="card stat-card card-button"
              onClick={() => navigate("/instellingen/templates")}
            >
              <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DatabaseZap size={16} aria-hidden />
                Inspectietemplates
              </div>
              <div className="stat-value">{(inspectionTemplates.data?.items || []).length}</div>
              <div className="stat-meta">Templatebeheer openen</div>
            </button>

            <button
              type="button"
              className="card stat-card card-button"
              onClick={() => navigate("/instellingen/normeringen")}
            >
              <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BookMarked size={16} aria-hidden />
                Normeringen
              </div>
              <div className="stat-value">NEN</div>
              <div className="stat-meta">Normprofielen en normenbibliotheek</div>
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
