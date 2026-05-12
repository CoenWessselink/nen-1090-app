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

    setMessage("Enterprise runtime synchronized.");

    pushNotification({
      title: "Runtime synchronized",
      description: "Settings and masterdata refreshed from backend runtime.",
      tone: "success",
    });
  };

  return (
    <div className="page-stack settings-page enterprise-settings-v2" data-settings-page>
      <section className="section-banner settings-hero">
        <div className="section-banner-copy">
          <span className="eyebrow">Enterprise Runtime V2</span>
          <h1>Settings Control Center</h1>
          <p>Centralized runtime ownership, masterdata governance and CE aggregate configuration.</p>
        </div>

        <div className="section-banner-actions">
          <Button variant="secondary" onClick={refreshAll}>
            <RefreshCcw size={16} /> Refresh Runtime
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
            <span>Masterdata Runtime</span>
          </div>

          <div className="section-nav-tile-value">{masterDataCount}</div>

          <strong>WPS, materials, welders, coordinators and inspection templates</strong>
        </button>

        <button
          type="button"
          className={`section-nav-tile ${tab === "organisatie" ? "is-active" : ""}`}
          onClick={() => setTab("organisatie")}
        >
          <div className="section-nav-tile-top">
            <Settings2 size={18} />
            <span>Organization Runtime</span>
          </div>

          <div className="section-nav-tile-value">{user?.tenant || "Tenant"}</div>

          <strong>Tenant settings, branding and runtime governance</strong>
        </button>
      </div>

      {tab === "organisatie" ? (
        <div className="content-grid-2 settings-sections">
          <CompanySettingsCard />

          <Card className="settings-card">
            <div className="section-title-row">
              <h3>Tenant Runtime</h3>
            </div>

            <div className="detail-grid">
              <div>
                <span>User</span>
                <strong>{user?.email || "—"}</strong>
              </div>

              <div>
                <span>Tenant</span>
                <strong>{user?.tenant || "—"}</strong>
              </div>

              <div>
                <span>Role</span>
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
                <span>Inspection Templates</span>
              </div>

              <div className="section-nav-tile-value">{(inspectionTemplates.data?.items || []).length}</div>

              <strong>Centralized enterprise template management</strong>
            </button>

            <button
              type="button"
              className="section-nav-tile"
              onClick={() => navigate('/instellingen/normeringen')}
            >
              <div className="section-nav-tile-top">
                <DatabaseZap size={18} />
                <span>Norm Libraries</span>
              </div>

              <div className="section-nav-tile-value">EN</div>

              <strong>EN 1090 and ISO runtime configuration</strong>
            </button>
          </div>

          <MasterDataManager title="WPS Runtime" type="wps" rows={wps.data?.items || []} isLoading={wps.isLoading} isError={wps.isError} refetch={wps.refetch} />
          <MasterDataManager title="Materials Runtime" type="materials" rows={materials.data?.items || []} isLoading={materials.isLoading} isError={materials.isError} refetch={materials.refetch} />
          <MasterDataManager title="Welders Runtime" type="welders" rows={welders.data?.items || []} isLoading={welders.isLoading} isError={welders.isError} refetch={welders.refetch} />
          <MasterDataManager title="Weld Coordinators Runtime" type="weld-coordinators" rows={weldCoordinators.data?.items || []} isLoading={weldCoordinators.isLoading} isError={weldCoordinators.isError} refetch={weldCoordinators.refetch} />
          <InspectionTemplatesManager />
        </div>
      ) : null}
    </div>
  );
}
