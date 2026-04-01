import { useMemo, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ConfirmActionDialog } from '@/components/dialogs/ConfirmActionDialog';
import { useProjectBulkMutation } from '@/hooks/useProjects';

export function BulkActionsBar({ projectIds, onDone }: { projectIds: Array<string | number>; onDone?: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger' | 'neutral'; message: string } | null>(null);
  const bulkMutation = useProjectBulkMutation();
  const uniqueProjectIds = useMemo(() => [...new Set(projectIds.map(String).filter(Boolean))], [projectIds]);

  if (!uniqueProjectIds.length) return null;

  return (
    <Card>
      <div className="section-title-row">
        <h3>Bulkacties</h3>
        <InlineMessage tone="neutral">{`${uniqueProjectIds.length} project(en) geselecteerd`}</InlineMessage>
      </div>
      <div className="toolbar-cluster">
        <Button onClick={() => setOpen(true)} disabled={bulkMutation.isPending}>
          <BadgeCheck size={16} /> Alles accorderen
        </Button>
      </div>
      {feedback ? <InlineMessage tone={feedback.tone}>{feedback.message}</InlineMessage> : null}
      <ConfirmActionDialog
        open={open}
        title="Alles accorderen"
        description="Zet geselecteerde projecten en onderliggende assemblies, lassen en inspecties op gereed waar dat nog open staat."
        confirmLabel="Alles accorderen"
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          try {
            const result = await bulkMutation.mutateAsync({ projectIds: uniqueProjectIds, mode: 'open_only' });
            const message = `Bulk akkoord uitgevoerd voor ${result.count} project(en). ${result.approvedAssemblies} assemblies, ${result.approvedWelds} lassen en ${result.inspectionsSetOk} inspecties bijgewerkt. ${result.projectsMarkedReady} project(en) op gereed.`;
            setFeedback({ tone: 'success', message });
            setOpen(false);
            onDone?.(message);
          } catch (error) {
            setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Bulkactie mislukt.' });
            throw error;
          }
        }}
      />
    </Card>
  );
}
