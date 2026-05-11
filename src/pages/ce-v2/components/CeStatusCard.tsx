import React from 'react';

import EnterpriseCard from '../../settings-v2/components/EnterpriseCard';

interface CeStatusCardProps {
  status: Record<string, unknown>;
}

export default function CeStatusCard({
  status,
}: CeStatusCardProps) {
  return (
    <EnterpriseCard title="CE Status">
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </EnterpriseCard>
  );
}
