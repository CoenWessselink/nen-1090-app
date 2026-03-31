import { useMemo, useState } from 'react';
import { BadgeCheck, Boxes, HardHat, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ConfirmActionDialog } from '@/components/dialogs/ConfirmActionDialog';
import { useProjectBulkMutation } from '@/hooks/useProjects';

const actionMeta = {
  approve: { label: 'Alles accorderen', icon: BadgeCheck, description: 'Zet inspectiechecks op akkoord, accordeert onderliggende lassen en zet projectstatus waar nodig naar gereed.' },
  template: { label: 'Inspectietemplate toepassen', icon: ShieldCheck, description: 'Standaard inspectietemplate op de geselecteerde projecten toepassen.' },
  materials: { label: 'Materialen toevoegen', icon: Boxes, description: 'Projectmaterialen vanuit settings toevoegen aan de geselecteerde projecten.' },
  wps: { label: 'WPS toevoegen', icon: Wrench, description: 'Beschikbare WPS records bulk koppelen aan de geselecteerde projecten.' },
  welders: { label: 'Lassers toevoegen', icon: HardHat, description: 'Beschikbare lassers bulk koppelen aan de geselecteerde projecten.' },
} as const;

type BulkAction = keyof typeof actionMeta;

export function BulkActionsBar({ projectIds, onDone }: { projectIds: Array<string | number>; onDone?: (message: string) => void }) {
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const bulkMutation = useProjectBulkMutation();
  const count = projectIds.length;
  const activeMeta = pendingAction ? actionMeta[pendingAction] : null;
  const uniqueProjectIds = useMemo(() => [...new Set(projectIds.map((value) => String(value)).filter(Boolean))], [projectIds]);

  if (!count) return null;

  return (
    <Card>
      <div className="section-title-row">
        <h3>Bulkacties</h3>
        <InlineMessage tone="neutral">{`${count} project(en) geselecteerd`}</InlineMessage>
      </div>
      <div className="toolbar-cluster">
        {(Object.keys(actionMeta) as BulkAction[]).map((key) => {
          const Icon = actionMeta[key].icon;
          return (
            <Button key={key} variant="secondary" onClick={() => setPendingAction(key)} disabled={bulkMutation.isPending}>
              <Icon size={16} /> {actionMeta[key].label}
            </Button>
          );
        })}
      </div>
      <ConfirmActionDialog
        open={Boolean(pendingAction && activeMeta)}
        title={activeMeta?.label || 'Bulkactie'}
        description={activeMeta ? `${activeMeta.description} Dit wordt uitgevoerd voor ${count} geselecteerde project(en).` : ''}
        confirmLabel={activeMeta?.label || 'Uitvoeren'}
        onClose={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction) return;
          const result = await bulkMutation.mutateAsync({ action: pendingAction, projectIds: uniqueProjectIds });
          const approveMeta = pendingAction === 'approve' && result && typeof result === 'object' ? result as Record<string, unknown> : null;
          const detail = approveMeta
            ? ` ${Number(approveMeta.approvedWelds || 0)} lassen akkoord, ${Number(approveMeta.projectsMarkedReady || 0)} project(en) op gereed.`
            : '';
          const message = `${actionMeta[pendingAction].label} uitgevoerd voor ${uniqueProjectIds.length} project(en).${detail}`;
          onDone?.(message);
          setPendingAction(null);
        }}
      />
    </Card>
  );
}
