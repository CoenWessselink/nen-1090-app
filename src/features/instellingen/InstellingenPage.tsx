import { BookMarked, DatabaseZap, RefreshCcw, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { InlineMessage } from "@/components/feedback/InlineMessage";
import { useAuthStore } from "@/app/store/auth-store";
import { useUiStore } from "@/app/store/ui-store";
import { useInspectionTemplates, useMaterials, useSettings, useWeldCoordinators, useWelders, useWps } from "@/hooks/useSettings";
import { MasterDataManager } from "@/features/instellingen/components/MasterDataManager";
import { CompanySettingsCard } from "@/features/instellingen/components/CompanySettingsCard";
import { InspectionTemplatesManager } from "@/features/instellingen/components/InspectionTemplatesManager";
import { MobilePageScaffold } from "@/features/mobile/MobilePageScaffold";

type SettingsTab = "organisatie" | "masterdata";

/**
 * Settings uses the same in-canvas shell as the dashboard (`MobilePageScaffold` + `mobile-kpi-*`)
 * so masterdata tables (`MasterDataManager`) sit in `mobile-page-body` below the KPI tiles, unchanged.
 */
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
    <MobilePageScaffold
      title="Instellingen"
      subtitle="Masterdata, organisatie en templates"
      rightSlot={
        <button type="button" className="mobile-icon-button" onClick={refreshAll} aria-label="Gegevens vernieuwen">
          <RefreshCcw size={18} />
        </button>
      }
    >
      <div className="settings-page mobile-unified-body" data-settings-page>
        {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

        <div className="mobile-kpi-grid">
          <button
            type="button"
            aria-pressed={tab === "masterdata"}
            className={`mobile-kpi-card mobile-kpi-card-primary ${tab === "masterdata" ? "mobile-kpi-tile-active" : ""}`}
            onClick={() => setTab("masterdata")}
          >
            <div className="mobile-kpi-top">
              <DatabaseZap size={18} aria-hidden />
              <span>Masterdata</span>
            </div>
            <strong>{masterDataCount}</strong>
            <small style={{ color: "rgba(255,255,255,0.82)" }}>WPS, materialen, lassers en inspectietemplates</small>
          </button>

          <button
            type="button"
            aria-pressed={tab === "organisatie"}
            className={`mobile-kpi-card mobile-kpi-card-secondary ${tab === "organisatie" ? "mobile-kpi-tile-active" : ""}`}
            onClick={() => setTab("organisatie")}
          >
            <div className="mobile-kpi-top">
              <Settings2 size={18} aria-hidden />
              <span>Organisatie</span>
            </div>
            <strong style={{ fontSize: "clamp(1rem, 3vw, 1.35rem)", wordBreak: "break-word" }}>{user?.tenant || "—"}</strong>
            <small style={{ color: "rgba(255,255,255,0.82)" }}>Bedrijfsinstellingen en branding</small>
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
          <div className="settings-sections mobile-unified-body">
            <div className="mobile-kpi-grid">
              <button
                type="button"
                className="mobile-kpi-card mobile-kpi-card-secondary mobile-kpi-card-action"
                onClick={() => navigate("/instellingen/templates")}
              >
                <div className="mobile-kpi-top">
                  <DatabaseZap size={18} aria-hidden />
                  <span>Inspectietemplates</span>
                </div>
                <strong>{(inspectionTemplates.data?.items || []).length}</strong>
                <small style={{ color: "rgba(255,255,255,0.82)" }}>Templatebeheer openen</small>
              </button>

              <button
                type="button"
                className="mobile-kpi-card mobile-kpi-card-secondary mobile-kpi-card-action"
                onClick={() => navigate("/instellingen/normeringen")}
              >
                <div className="mobile-kpi-top">
                  <BookMarked size={18} aria-hidden />
                  <span>Normeringen</span>
                </div>
                <strong>NEN</strong>
                <small style={{ color: "rgba(255,255,255,0.82)" }}>Normprofielen en normenbibliotheek</small>
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
    </MobilePageScaffold>
  );
}
