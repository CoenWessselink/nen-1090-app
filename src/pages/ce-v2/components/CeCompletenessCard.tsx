import React from 'react';

import EnterpriseCard from '../../settings-v2/components/EnterpriseCard';

interface CeCompletenessCardProps {
  completeness: Record<string, unknown>;
}

export default function CeCompletenessCard({
  completeness,
}: CeCompletenessCardProps) {
  return (
    <EnterpriseCard title="CE Completeness">
      <pre>{JSON.stringify(completeness, null, 2)}</pre>
    </EnterpriseCard>
  );
}
