import { InlineMessage } from '@/components/feedback/InlineMessage';

export function LascontrolePage() {
  return (
    <div className="page-stack">
      <h1>Lascontrole</h1>
      <InlineMessage tone="neutral">
        Lascontrole is actief. Gebruik de bestaande hook- en tabelimplementatie uit de stabiele buildbasis.
      </InlineMessage>
    </div>
  );
}
