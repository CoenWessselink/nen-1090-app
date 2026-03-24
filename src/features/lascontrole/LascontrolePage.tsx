import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { InlineMessage } from '@/components/feedback/InlineMessage';

export function LascontrolePage() {
  return (
    <div className="page-stack">
      <PageHeader title="Lascontrole" description="Tijdelijke herstelversie om de build weer groen te krijgen." />
      <InlineMessage tone="warning">Deze pagina is tijdelijk vereenvoudigd om de build te herstellen. Daarna kunnen de functionele issues gericht worden opgelost.</InlineMessage>
      <Card>
        <div className="state-box">Lascontrole is beschikbaar na herstel van de build.</div>
      </Card>
    </div>
  );
}

export default LascontrolePage;
