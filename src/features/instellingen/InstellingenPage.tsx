import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { InlineMessage } from "@/components/feedback/InlineMessage";
import { useAuthStore } from "@/app/store/auth-store";
import { useUiStore } from "@/app/store/ui-store";
import { useCompanySettings, useInspectionTemplates, useMaterials, useSettings, useWeldCoordinators, useWelders, useWps } from "@/hooks/useSettings";
import { MasterDataManager } from "@/features/instellingen/components/MasterDataManager";
import { CompanySettingsCard } from "@/features/instellingen/components/CompanySettingsCard";
import { InspectionTemplatesManager } from "@/features/instellingen/components/InspectionTemplatesManager";
import { SettingsOverviewTiles } from "@/features/instellingen/components/SettingsOverviewTiles";
import { MobilePageScaffold } from "@/features/mobile/MobilePageScaffold";

type SettingsTab = "organisatie" | "masterdata";

function displayText(value: unknown): string {
  return String(value || "").trim();
}

export function InstellingenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<SettingsTab>(searchParams.get("tab") === "organisatie" ? "organisatie" : "masterdata");
  const [message, setMessage] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const pushNotification = useUiStore((state) => state.pushNotification);

  const backendSettings = useSettings();
  const companySettings = useCompanySettings();
  const wps = useWps();
  const materials = useMaterials();
  const welders = useWelders();
  const weldCoordinators = useWeldCoordinators();
  const inspectionTemplates = useInspectionTemplates();

  useEffect(() => {
    setTab(searchParams.get("tab") === "organisatie" ? "organisatie" : "masterdata");
  }, [searchParams]);

  const companyData = (companySettings.data || {}) as Record<string, unknown>;
  const companyName =
    displayText(companyData.company_name) ||
    displayText(companyData.legal_name) ||
    displayText(companyData.display_name) ||
    displayText(companyData.name);
  const companyTileName = companySettings.isLoading ? "Laden…" : companyName || "Organisatie";

  const masterDataCount = useMemo(
    () =>
      (wps.data?.items || []).length +
      (materials.data?.items || []).length +
      (welders.data?.items || []).length +
      (weldCoordinators.data?.items || []).length +
      (inspectionTemplates.data?.items || []).length,
    [inspectionTemplates.data?.items, materials.data?.items, weldCoordinators.data?.items, welders.data?.items, wps.data?.items],
  );

  const selectTab = (nextTab: SettingsTab) => {
    setTab(nextTab);
    if (nextTab === "organisatie") setSearchParams({ tab: "organisatie" });
    else setSearchParams({});
  };

  const refreshAll = () => {
    backendSettings.refetch();
    companySettings.refetch();
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
      <div className="settings-page" data-settings-page>
        {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

        <SettingsOverviewTiles
          activeKey={tab}
          masterDataCount={masterDataCount}
          inspectionTemplateCount={(inspectionTemplates.data?.items || []).length}
          companyName={companyTileName}
          onSelect={(key) => {
            if (key === "masterdata" || key === "organisatie") selectTab(key);
          }}
        />

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
                  <span>Bedrijfsnaam</span>
                  <strong>{companyName || "Bedrijfsnaam instellen"}</strong>
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
          <div className="settings-sections">
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