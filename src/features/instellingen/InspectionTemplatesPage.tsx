import { PageHeader } from '@/components/layout/PageHeader';
import { InspectionTemplatesManager } from '@/features/instellingen/components/InspectionTemplatesManager';

export function InspectionTemplatesPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Inspectietemplates"
        description="Beheer EXC1 t/m EXC4 templates, wijzig checklistitems en stel projectdefaults in voor nieuwe lassen."
      />
      <InspectionTemplatesManager />
    </div>
  );
}
