import { InspectionTemplatesManager } from '@/features/instellingen/components/InspectionTemplatesManager';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';

export function InspectionTemplatesPage() {
  return (
    <MobilePageScaffold
      title="Inspectietemplates"
      subtitle="EXC1–EXC4, checklistitems en projectdefaults"
      backTo="/settings-v2"
    >
      <div className="settings-page" data-settings-templates-page>
        <InspectionTemplatesManager />
      </div>
    </MobilePageScaffold>
  );
}
