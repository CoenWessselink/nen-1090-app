import { PageHeader } from "@/components/layout/PageHeader";
import { MasterDataManager } from "@/features/instellingen/components/MasterDataManager";
import { useInspectionTemplates } from "@/hooks/useSettings";

export function InspectionTemplatesPage() {
  const inspectionTemplates = useInspectionTemplates();

  return (
    <div className="page-stack">
      <PageHeader
        title="Inspectietemplates"
        description="Beheer EXC1 t/m EXC4 inspectietemplates binnen de bestaande settings-contracten."
      />
      <MasterDataManager
        title="Inspectietemplates"
        type="inspection-templates"
        rows={inspectionTemplates.data?.items || []}
        isLoading={inspectionTemplates.isLoading}
        isError={inspectionTemplates.isError}
        refetch={inspectionTemplates.refetch}
      />
    </div>
  );
}
