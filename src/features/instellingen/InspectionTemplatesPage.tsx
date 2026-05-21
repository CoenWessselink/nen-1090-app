import { useInspectionTemplates } from '@/hooks/useSettings';
import { SettingsOverviewTiles } from '@/features/instellingen/components/SettingsOverviewTiles';
import { InspectionTemplatesManager } from '@/features/instellingen/components/InspectionTemplatesManager';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';

export function InspectionTemplatesPage() {
  const inspectionTemplates = useInspectionTemplates();

  return (
    <MobilePageScaffold
      title="Inspectietemplates"
      subtitle="EXC1–EXC4, checklistitems en projectdefaults"
      backTo="/settings-v2"
    >
      <div className="settings-page" data-settings-templates-page>
        <SettingsOverviewTiles activeKey="templates" inspectionTemplateCount={(inspectionTemplates.data?.items || []).length} />
        <InspectionTemplatesManager />
      </div>
    </MobilePageScaffold>
  );
}